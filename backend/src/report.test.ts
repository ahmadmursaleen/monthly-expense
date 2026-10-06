import { describe, expect, it } from "vitest";
import type { CategoryId, Transaction } from "./domain.js";
import { buildReport, formatEuro, formatMonthTitle, renderReportPdf } from "./report.js";

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
