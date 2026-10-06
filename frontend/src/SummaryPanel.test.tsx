import { render, screen, within } from "@testing-library/react";
import { formatShare } from "./CategoryBars";
import SummaryPanel from "./SummaryPanel";
import type { Category, MonthSummary } from "./types";

const categories: Category[] = [
  { id: "food", label: "Food & Groceries" },
  { id: "transport", label: "Transport" },
  { id: "housing", label: "Housing" },
];

function renderPanel(summary: MonthSummary) {
  render(<SummaryPanel summary={summary} categories={categories} />);
  return screen.getByRole("region", { name: "Spent this month" });
}

const october: MonthSummary = {
  month: "2026-10",
  totalCents: 100000,
  count: 5,
  // Deliberately unsorted: the panel sorts by total itself.
  byCategory: [
    { category: "transport", totalCents: 20000, count: 2 },
    { category: "housing", totalCents: 50000, count: 1 },
    { category: "food", totalCents: 30000, count: 2 },
  ],
};

describe("SummaryPanel", () => {
  it("shows the total and the number of expenses", () => {
    const panel = renderPanel(october);
    expect(panel).toHaveTextContent(/1\.000,00\s€/);
    expect(panel).toHaveTextContent("5 expenses");
  });

  it("uses the singular for one expense", () => {
    renderPanel({
      month: "2026-10",
      totalCents: 1250,
      count: 1,
      byCategory: [{ category: "food", totalCents: 1250, count: 1 }],
    });
    expect(screen.getByText("1 expense")).toBeInTheDocument();
  });

  it("lists one bar per category sorted by total, with label, amount and share as text", () => {
    renderPanel(october);
    const rows = within(screen.getByRole("list", { name: "Spending by category" })).getAllByRole("listitem");
    expect(rows).toHaveLength(3);
    expect(rows[0]).toHaveTextContent("Housing");
    expect(rows[0]).toHaveTextContent(/500,00\s€/);
    expect(rows[0]).toHaveTextContent("50%");
    expect(rows[1]).toHaveTextContent("Food & Groceries");
    expect(rows[1]).toHaveTextContent(/300,00\s€/);
    expect(rows[1]).toHaveTextContent("30%");
    expect(rows[2]).toHaveTextContent("Transport");
    expect(rows[2]).toHaveTextContent(/200,00\s€/);
    expect(rows[2]).toHaveTextContent("20%");
  });

  it("sizes bars relative to the largest category", () => {
    renderPanel(october);
    const widths = screen.getAllByTestId("category-bar").map((bar) => bar.style.width);
    expect(widths).toEqual(["100%", "60%", "40%"]);
  });

  it("falls back to the category id when no label is known", () => {
    renderPanel({
      month: "2026-10",
      totalCents: 500,
      count: 1,
      byCategory: [{ category: "health", totalCents: 500, count: 1 }],
    });
    expect(screen.getByRole("listitem")).toHaveTextContent("health");
  });

  it("shows 0,00 € and a message instead of bars for an empty month", () => {
    const panel = renderPanel({ month: "2026-10", totalCents: 0, count: 0, byCategory: [] });
    expect(panel).toHaveTextContent(/0,00\s€/);
    expect(panel).toHaveTextContent("0 expenses");
    expect(screen.getByText("Nothing spent yet")).toBeInTheDocument();
    expect(screen.queryByRole("list")).not.toBeInTheDocument();
    expect(screen.queryByTestId("category-bar")).not.toBeInTheDocument();
  });
});

describe("formatShare", () => {
  it("rounds to whole percent", () => {
    expect(formatShare(1, 3)).toBe("33%");
    expect(formatShare(2, 3)).toBe("67%");
    expect(formatShare(5, 5)).toBe("100%");
  });

  it("shows <1% for tiny non-zero shares and 0% without a total", () => {
    expect(formatShare(1, 1000)).toBe("<1%");
    expect(formatShare(0, 1000)).toBe("0%");
    expect(formatShare(0, 0)).toBe("0%");
  });
});
