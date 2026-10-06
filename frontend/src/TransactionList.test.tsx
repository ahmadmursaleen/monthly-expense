import { render, screen, within } from "@testing-library/react";
import TransactionList, { type TransactionListProps } from "./TransactionList";
import type { Transaction } from "./types";

function tx(id: number, date: string, description: string): Transaction {
  return {
    id,
    description,
    amountCents: 123456,
    category: "food",
    date,
    createdAt: "2026-10-01T00:00:00.000Z",
    updatedAt: "2026-10-01T00:00:00.000Z",
  };
}

function setup(overrides: Partial<TransactionListProps> = {}) {
  const props: TransactionListProps = {
    transactions: [],
    categories: [{ id: "food", label: "Food & Groceries" }],
    month: "2026-10",
    filtered: false,
    onEdit: vi.fn(),
    onDelete: vi.fn(),
    onAdd: vi.fn(),
    onClearFilters: vi.fn(),
    ...overrides,
  };
  render(<TransactionList {...props} />);
  return props;
}

it("orders rows by date desc, then by id desc", () => {
  setup({
    transactions: [tx(1, "2026-10-02", "A"), tx(2, "2026-10-06", "B"), tx(3, "2026-10-02", "C")],
  });
  const rows = screen.getAllByRole("listitem");
  expect(rows.map((r) => within(r).getByText(/^[ABC]$/).textContent)).toEqual(["B", "C", "A"]);
});

it("formats the amount and date and shows the category label", () => {
  setup({ transactions: [tx(1, "2026-10-06", "Groceries")] });
  const row = screen.getByRole("listitem");
  expect(row).toHaveTextContent("06.10.2026");
  expect(row).toHaveTextContent(/1\.234,56\s€/);
  expect(row).toHaveTextContent("Food & Groceries");
});

it("falls back to the category id when the label is unknown", () => {
  setup({ transactions: [tx(1, "2026-10-06", "Groceries")], categories: [] });
  expect(screen.getByRole("listitem")).toHaveTextContent("food");
});

it("calls onEdit and onDelete with the row", () => {
  const row = tx(7, "2026-10-06", "Groceries");
  const props = setup({ transactions: [row] });
  screen.getByRole("button", { name: "Edit Groceries" }).click();
  screen.getByRole("button", { name: "Delete Groceries" }).click();
  expect(props.onEdit).toHaveBeenCalledWith(row);
  expect(props.onDelete).toHaveBeenCalledWith(row);
});

it("shows the empty month state with Add", () => {
  const props = setup({ month: "2026-01" });
  expect(screen.getByText("No expenses in January 2026")).toBeInTheDocument();
  expect(screen.queryByText("No expenses match your filters")).not.toBeInTheDocument();
  screen.getByRole("button", { name: "Add expense" }).click();
  expect(props.onAdd).toHaveBeenCalledTimes(1);
});

it("shows the no-matches state with Clear filters when filtered", () => {
  const props = setup({ filtered: true });
  expect(screen.getByText("No expenses match your filters")).toBeInTheDocument();
  expect(screen.queryByRole("button", { name: "Add expense" })).not.toBeInTheDocument();
  screen.getByRole("button", { name: "Clear filters" }).click();
  expect(props.onClearFilters).toHaveBeenCalledTimes(1);
});
