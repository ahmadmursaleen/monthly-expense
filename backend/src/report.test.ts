import { describe, expect, it } from "vitest";
import { CATEGORIES, type CategoryId, type Transaction } from "./domain.js";
import { EMPTY_MESSAGE, buildReport, formatEuro, formatMonthTitle, renderReportPdf } from "./report.js";
import { extractPdfPages } from "./testing/pdfText.js";

const TX_HEADER = ["Date", "Description", "Category", "Amount"];
const CATEGORY_HEADER = ["Category", "Count", "Total", "Share"];

/** Index of `seq` as a consecutive run inside `runs`, or -1. */
function indexOfSeq(runs: string[], seq: string[]): number {
  for (let i = 0; i + seq.length <= runs.length; i++) {
    if (seq.every((s, j) => runs[i + j] === s)) return i;
  }
  return -1;
}

const NOW = new Date(2026, 9, 6, 10, 30); // local time: 06.10.2026 10:30

let nextId = 1;
function tx(date: string, amountCents: number, category: CategoryId, description = "Item"): Transaction {
  const stamp = "2026-10-06T08:30:00.000Z";
  return { id: nextId++, description, amountCents, category, date, createdAt: stamp, updatedAt: stamp };
}

describe("formatting", () => {
  it("formats euros de-DE", () => {
    expect(formatEuro(123456)).toBe("1.234,56 €");
    expect(formatEuro(0)).toBe("0,00 €");
  });

  it("formats month titles in English", () => {
    expect(formatMonthTitle("2026-10")).toBe("October 2026");
    expect(formatMonthTitle("2026-01")).toBe("January 2026");
    expect(() => formatMonthTitle("2026-13")).toThrow();
  });
});

describe("buildReport", () => {
  it("builds title, generated-at, totals, category rows and transactions newest first", () => {
    nextId = 1;
    const transactions = [
      tx("2026-10-01", 3000, "food", "Market"),
      tx("2026-10-15", 1000, "transport", "Bus ticket"),
      tx("2026-10-15", 1000, "food", "Bakery"),
      tx("2026-10-31", 5000, "housing", "Rent share"),
    ];
    const report = buildReport("2026-10", transactions, NOW);

    expect(report.title).toBe("Expense report: October 2026");
    expect(report.generatedAt).toBe("Generated 06.10.2026 10:30");
    expect(report.totalCents).toBe(10000);
    expect(report.total).toBe("100,00 €");
    expect(report.count).toBe(4);
    expect(report.empty).toBe(false);

    expect(report.categories).toEqual([
      { category: "housing", label: "Housing", count: 1, totalCents: 5000, total: "50,00 €", share: "50,0 %" },
      { category: "food", label: "Food & Groceries", count: 2, totalCents: 4000, total: "40,00 €", share: "40,0 %" },
      { category: "transport", label: "Transport", count: 1, totalCents: 1000, total: "10,00 €", share: "10,0 %" },
    ]);

    expect(report.transactions).toEqual([
      { id: 4, date: "31.10.2026", description: "Rent share", categoryLabel: "Housing", amount: "50,00 €" },
      { id: 3, date: "15.10.2026", description: "Bakery", categoryLabel: "Food & Groceries", amount: "10,00 €" },
      { id: 2, date: "15.10.2026", description: "Bus ticket", categoryLabel: "Transport", amount: "10,00 €" },
      { id: 1, date: "01.10.2026", description: "Market", categoryLabel: "Food & Groceries", amount: "30,00 €" },
    ]);
  });

  it("orders categories with equal totals by category table order and rounds shares to one decimal", () => {
    const report = buildReport(
      "2026-10",
      [tx("2026-10-01", 100, "other"), tx("2026-10-02", 100, "food"), tx("2026-10-03", 100, "health")],
      NOW,
    );
    expect(report.categories.map((c) => c.category)).toEqual(["food", "health", "other"]);
    expect(report.categories.map((c) => c.share)).toEqual(["33,3 %", "33,3 %", "33,3 %"]);
  });

  it("marks an empty month with a zero total and no rows", () => {
    const report = buildReport("2026-02", [], NOW);
    expect(report).toMatchObject({
      title: "Expense report: February 2026",
      generatedAt: "Generated 06.10.2026 10:30",
      totalCents: 0,
      total: "0,00 €",
      count: 0,
      categories: [],
      transactions: [],
      empty: true,
    });
  });

  it("rejects an invalid month", () => {
    expect(() => buildReport("2026-13", [], NOW)).toThrow();
  });

  it.each(["abc", "2026-00", "2026-1", "", "2026-10-01"])("rejects the invalid month %j", (month) => {
    expect(() => buildReport(month, [], NOW)).toThrow();
  });

  it("titles December and a leap-year February", () => {
    expect(buildReport("2026-12", [], NOW).title).toBe("Expense report: December 2026");
    expect(buildReport("2028-02", [], NOW).title).toBe("Expense report: February 2028");
  });

  it("zero-pads the generated-at day, month, hour and minute", () => {
    expect(buildReport("2027-01", [], new Date(2027, 0, 5, 7, 4)).generatedAt).toBe("Generated 05.01.2027 07:04");
    expect(buildReport("2026-12", [], new Date(2026, 11, 31, 0, 0)).generatedAt).toBe("Generated 31.12.2026 00:00");
    expect(buildReport("2026-12", [], new Date(2026, 11, 31, 23, 59, 59)).generatedAt).toBe(
      "Generated 31.12.2026 23:59",
    );
  });

  it("gives a single category a 100 % share", () => {
    const report = buildReport("2026-10", [tx("2026-10-01", 1999, "health"), tx("2026-10-02", 1, "health")], NOW);
    expect(report.categories).toEqual([
      { category: "health", label: "Health", count: 2, totalCents: 2000, total: "20,00 €", share: "100,0 %" },
    ]);
  });

  it("rounds unequal shares to one decimal", () => {
    const report = buildReport("2026-10", [tx("2026-10-01", 100, "food"), tx("2026-10-02", 200, "shopping")], NOW);
    expect(report.categories.map((c) => [c.category, c.share])).toEqual([
      ["shopping", "66,7 %"],
      ["food", "33,3 %"],
    ]);
    // a very small share still shows one decimal instead of disappearing
    const tiny = buildReport("2026-10", [tx("2026-10-01", 9999, "food"), tx("2026-10-02", 1, "other")], NOW);
    expect(tiny.categories.map((c) => c.share)).toEqual(["100,0 %", "0,0 %"]);
  });

  it("formats the maximum amount and large totals with thousands separators", () => {
    const report = buildReport(
      "2026-10",
      [tx("2026-10-01", 100_000_000, "housing"), tx("2026-10-02", 100_000_000, "housing")],
      NOW,
    );
    expect(report.total).toBe("2.000.000,00 €");
    expect(report.transactions[0].amount).toBe("1.000.000,00 €");
    expect(report.categories[0].total).toBe("2.000.000,00 €");
  });

  it("formats one-cent amounts", () => {
    const report = buildReport("2026-10", [tx("2026-10-01", 1, "other")], NOW);
    expect(report.total).toBe("0,01 €");
    expect(report.count).toBe(1);
    expect(report.empty).toBe(false);
  });

  it("maps every category id to its label", () => {
    const report = buildReport(
      "2026-10",
      CATEGORIES.map((c, i) => tx(`2026-10-${String(i + 1).padStart(2, "0")}`, 100, c.id)),
      NOW,
    );
    const labelOf = new Map(report.categories.map((c) => [c.category, c.label]));
    for (const c of CATEGORIES) expect(labelOf.get(c.id)).toBe(c.label);
    expect(report.transactions.map((t) => t.categoryLabel).sort()).toEqual(CATEGORIES.map((c) => c.label).sort());
  });

  it("sorts unsorted input newest first (date desc, then id desc) without mutating the input", () => {
    const input: Transaction[] = [
      { ...tx("2026-10-05", 100, "food", "A"), id: 10 },
      { ...tx("2026-10-20", 100, "food", "B"), id: 11 },
      { ...tx("2026-10-05", 100, "food", "C"), id: 30 },
      { ...tx("2026-10-01", 100, "food", "D"), id: 40 },
      { ...tx("2026-10-20", 100, "food", "E"), id: 2 },
    ];
    const before = input.map((t) => t.id);
    const report = buildReport("2026-10", input, NOW);
    expect(report.transactions.map((t) => t.description)).toEqual(["B", "E", "C", "A", "D"]);
    expect(input.map((t) => t.id)).toEqual(before);
  });

  it("keeps the description text unchanged", () => {
    const description = "Café & \"Bäckerei\" <Müller> 50% off";
    const report = buildReport("2026-10", [tx("2026-10-01", 100, "food", description)], NOW);
    expect(report.transactions[0].description).toBe(description);
  });
});

describe("renderReportPdf", () => {
  it("renders an empty month", async () => {
    const pdf = await renderReportPdf(buildReport("2026-10", [], NOW));
    expect(pdf.subarray(0, 4).toString("latin1")).toBe("%PDF");
  });

  it("renders 80 transactions over several pages", async () => {
    const categories: CategoryId[] = ["food", "transport", "housing", "shopping"];
    const transactions = Array.from({ length: 80 }, (_, i) =>
      tx(`2026-10-${String((i % 28) + 1).padStart(2, "0")}`, 100 + i * 37, categories[i % 4], `Expense number ${i + 1}`),
    );
    const pdf = await renderReportPdf(buildReport("2026-10", transactions, NOW));
    const text = pdf.toString("latin1");
    expect(text.startsWith("%PDF")).toBe(true);
    const pages = text.match(/\/Type \/Page\b/g) ?? [];
    expect(pages.length).toBeGreaterThan(1);
  });

  it("does not fail on characters outside the standard font", async () => {
    const pdf = await renderReportPdf(buildReport("2026-10", [tx("2026-10-01", 100, "food", "Pizza \u{1F355} 寿司 Łódź")], NOW));
    expect(pdf.subarray(0, 4).toString("latin1")).toBe("%PDF");
  });

  it("clips a 200-character description to one line", async () => {
    const pdf = await renderReportPdf(buildReport("2026-10", [tx("2026-10-01", 100, "other", "x".repeat(200))], NOW));
    const pages = pdf.toString("latin1").match(/\/Type \/Page\b/g) ?? [];
    expect(pages.length).toBe(1);
  });
});

describe("renderReportPdf content", () => {
  const A4 = [0, 0, 595.28, 841.89];

  function manyTransactions(n: number): Transaction[] {
    const categories: CategoryId[] = ["food", "transport", "housing", "shopping"];
    return Array.from({ length: n }, (_, i) => ({
      ...tx(`2026-10-${String((i % 28) + 1).padStart(2, "0")}`, 100 + i * 37, categories[i % 4], `Row ${i + 1} desc`),
      id: i + 1,
    }));
  }

  it("lays out sections 1-5 in SPEC order on an A4 page", async () => {
    const report = buildReport(
      "2026-10",
      [tx("2026-10-02", 4250, "food", "Groceries"), tx("2026-10-05", 1200, "transport", "Train")],
      NOW,
    );
    const pages = extractPdfPages(await renderReportPdf(report));
    expect(pages).toHaveLength(1);
    expect(pages[0].mediaBox).toEqual(A4);
    const runs = pages[0].text;

    const positions = [
      runs.indexOf("Expense report: October 2026"),
      runs.indexOf("Generated 06.10.2026 10:30"),
      runs.indexOf(`Total: ${formatEuro(5450)}`),
      runs.indexOf("2 transactions"),
      runs.indexOf("Spending by category"),
      indexOfSeq(runs, CATEGORY_HEADER),
      indexOfSeq(runs, ["Food & Groceries", "1", formatEuro(4250), "78,0 %"]),
      indexOfSeq(runs, ["Transport", "1", formatEuro(1200), "22,0 %"]),
      runs.indexOf("Transactions"),
      indexOfSeq(runs, TX_HEADER),
      indexOfSeq(runs, ["05.10.2026", "Train", "Transport", formatEuro(1200)]),
      indexOfSeq(runs, ["02.10.2026", "Groceries", "Food & Groceries", formatEuro(4250)]),
    ];
    for (const p of positions) expect(p).toBeGreaterThanOrEqual(0);
    expect(positions).toEqual([...positions].sort((a, b) => a - b));
    expect(runs).not.toContain(EMPTY_MESSAGE);
  });

  it("uses the singular for one transaction", async () => {
    const pages = extractPdfPages(await renderReportPdf(buildReport("2026-10", [tx("2026-10-01", 100, "food")], NOW)));
    expect(pages[0].text).toContain("1 transaction");
    expect(pages[0].text).not.toContain("1 transactions");
  });

  it("shows sections 1-3 with 0,00 € and the empty message instead of the tables for an empty month", async () => {
    const pages = extractPdfPages(await renderReportPdf(buildReport("2026-02", [], NOW)));
    expect(pages).toHaveLength(1);
    expect(pages[0].mediaBox).toEqual(A4);
    expect(pages[0].text).toEqual([
      "Expense report: February 2026",
      "Generated 06.10.2026 10:30",
      "Total: 0,00 €",
      "0 transactions",
      EMPTY_MESSAGE,
    ]);
  });

  it("repeats the transaction table header at the top of every page after a page break", async () => {
    const report = buildReport("2026-10", manyTransactions(80), NOW);
    const pages = extractPdfPages(await renderReportPdf(report));
    expect(pages.length).toBeGreaterThan(1);

    for (const page of pages) expect(page.mediaBox).toEqual(A4);

    // page 1: heading, then header, then the first row
    const first = pages[0].text;
    const headingAt = first.indexOf("Transactions");
    expect(indexOfSeq(first, TX_HEADER)).toBeGreaterThan(headingAt);

    // every continuation page starts with the header row (and has exactly one)
    for (const page of pages.slice(1)) {
      expect(page.text.slice(0, 4)).toEqual(TX_HEADER);
      expect(page.text.filter((t) => t === "Description")).toHaveLength(1);
      // and carries at least one transaction row after it (no orphan header / blank page)
      expect(page.text.length).toBeGreaterThan(4);
      expect((page.text.length - 4) % 4).toBe(0);
    }
  });

  it("draws every transaction row exactly once, newest first, across pages", async () => {
    const report = buildReport("2026-10", manyTransactions(80), NOW);
    const pages = extractPdfPages(await renderReportPdf(report));
    const drawn = pages.flatMap((p) => p.text).filter((t) => /^Row \d+ desc$/.test(t));
    expect(drawn).toEqual(report.transactions.map((t) => t.description));
    expect(new Set(drawn).size).toBe(80);
  });

  it("does not add an extra page for a table that fits on one page", async () => {
    const pages = extractPdfPages(await renderReportPdf(buildReport("2026-10", manyTransactions(10), NOW)));
    expect(pages).toHaveLength(1);
    expect(pages[0].text.filter((t) => t === "Description")).toHaveLength(1);
  });

  it("clips an over-long description with an ellipsis", async () => {
    const pdf = await renderReportPdf(buildReport("2026-10", [tx("2026-10-01", 100, "other", "x".repeat(200))], NOW));
    const [page] = extractPdfPages(pdf);
    const cell = page.text.find((t) => t.startsWith("xxx"));
    expect(cell).toBeDefined();
    expect(cell?.endsWith("…")).toBe(true);
    expect(cell?.length).toBeLessThan(200);
  });
});
