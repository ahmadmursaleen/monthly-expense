import { render, screen, within } from "@testing-library/react";
import CategoryBars from "./CategoryBars";
import type { Category, CategorySummary } from "./types";

const categories: Category[] = [
  { id: "food", label: "Food & Groceries" },
  { id: "transport", label: "Transport" },
  { id: "housing", label: "Housing" },
  { id: "entertainment", label: "Leisure" },
];

function renderBars(byCategory: CategorySummary[], totalCents: number) {
  render(<CategoryBars byCategory={byCategory} categories={categories} totalCents={totalCents} />);
  const list = screen.getByRole("list", { name: "Spending by category" });
  return within(list).getAllByRole("listitem");
}

function barWidths(): string[] {
  return screen.getAllByTestId("category-bar").map((bar) => bar.style.width);
}

describe("CategoryBars", () => {
  it("gives a single category a full-width bar and a 100% share", () => {
    const rows = renderBars([{ category: "food", totalCents: 4250, count: 3 }], 4250);
    expect(rows).toHaveLength(1);
    expect(rows[0]).toHaveTextContent("Food & Groceries");
    expect(rows[0]).toHaveTextContent(/42,50\s€/);
    expect(rows[0]).toHaveTextContent("100%");
    expect(barWidths()).toEqual(["100%"]);
  });

  it("sorts by total descending even when the largest category arrives last", () => {
    const rows = renderBars(
      [
        { category: "entertainment", totalCents: 100, count: 1 },
        { category: "transport", totalCents: 300, count: 1 },
        { category: "housing", totalCents: 400, count: 1 },
      ],
      800,
    );
    expect(rows.map((row) => row.querySelector(".category-bars__label")?.textContent)).toEqual([
      "Housing",
      "Transport",
      "Leisure",
    ]);
    // Widths are relative to the largest category (400), not to the month total (800).
    expect(barWidths()).toEqual(["100%", "75%", "25%"]);
  });

  it("bases shares on the month total, not on the largest category", () => {
    const rows = renderBars(
      [
        { category: "housing", totalCents: 400, count: 1 },
        { category: "transport", totalCents: 300, count: 1 },
        { category: "entertainment", totalCents: 100, count: 1 },
      ],
      800,
    );
    expect(rows[0]).toHaveTextContent("50%");
    expect(rows[1]).toHaveTextContent("38%");
    expect(rows[2]).toHaveTextContent("13%");
  });

  it("gives equal totals equal full-width bars", () => {
    renderBars(
      [
        { category: "food", totalCents: 2500, count: 1 },
        { category: "transport", totalCents: 2500, count: 2 },
      ],
      5000,
    );
    expect(barWidths()).toEqual(["100%", "100%"]);
  });

  it("shows <1% for a tiny category while keeping its amount visible", () => {
    const rows = renderBars(
      [
        { category: "housing", totalCents: 99_900, count: 1 },
        { category: "entertainment", totalCents: 100, count: 1 },
      ],
      100_000,
    );
    expect(rows[0]).toHaveTextContent("100%");
    expect(rows[1]).toHaveTextContent("Leisure");
    expect(rows[1]).toHaveTextContent(/1,00\s€/);
    expect(rows[1]).toHaveTextContent("<1%");
    const [, small] = barWidths().map((w) => parseFloat(w));
    expect(small).toBeGreaterThan(0);
    expect(small).toBeLessThan(1);
  });

  it("hides the decorative bars from assistive technology; values remain text", () => {
    const rows = renderBars([{ category: "transport", totalCents: 1999, count: 1 }], 1999);
    const track = rows[0].querySelector(".category-bars__track");
    expect(track).toHaveAttribute("aria-hidden", "true");
    expect(within(rows[0]).getByText("Transport")).toBeVisible();
    expect(within(rows[0]).getByText(/19,99\s€/)).toBeVisible();
    expect(within(rows[0]).getByText("100%")).toBeVisible();
  });

  it("renders an empty list without bars when there is no spending", () => {
    render(<CategoryBars byCategory={[]} categories={categories} totalCents={0} />);
    const list = screen.getByRole("list", { name: "Spending by category" });
    expect(within(list).queryAllByRole("listitem")).toHaveLength(0);
    expect(screen.queryByTestId("category-bar")).not.toBeInTheDocument();
  });

  it("does not reorder the caller's array", () => {
    const input: CategorySummary[] = [
      { category: "transport", totalCents: 100, count: 1 },
      { category: "housing", totalCents: 900, count: 1 },
    ];
    renderBars(input, 1000);
    expect(input.map((c) => c.category)).toEqual(["transport", "housing"]);
  });
});
