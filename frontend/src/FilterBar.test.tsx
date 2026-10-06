import { fireEvent, render, screen } from "@testing-library/react";
import FilterBar from "./FilterBar";
import { emptyFilters, type Filters } from "./filters";
import type { Category } from "./types";

const categories: Category[] = [
  { id: "food", label: "Food & Groceries" },
  { id: "transport", label: "Transport" },
];

function setup(filters: Filters = emptyFilters) {
  const onChange = vi.fn<(f: Filters) => void>();
  render(<FilterBar categories={categories} filters={filters} onChange={onChange} />);
  return onChange;
}

it("renders a labelled search input and a category select with All categories", () => {
  setup();
  expect(screen.getByLabelText("Search descriptions")).toHaveValue("");
  const select = screen.getByLabelText("Category");
  expect(select).toHaveDisplayValue("All categories");
  expect(screen.getByRole("option", { name: "Transport" })).toBeInTheDocument();
});

it("reports query changes, keeping the category", () => {
  const onChange = setup({ query: "", category: "food" });
  fireEvent.change(screen.getByLabelText("Search descriptions"), { target: { value: "bread" } });
  expect(onChange).toHaveBeenCalledWith({ query: "bread", category: "food" });
});

it("reports category changes, keeping the query", () => {
  const onChange = setup({ query: "bus", category: "" });
  fireEvent.change(screen.getByLabelText("Category"), { target: { value: "transport" } });
  expect(onChange).toHaveBeenCalledWith({ query: "bus", category: "transport" });
});

it("hides Clear while no filter is active", () => {
  setup({ query: "   ", category: "" });
  expect(screen.queryByRole("button", { name: "Clear" })).not.toBeInTheDocument();
});

it.each<Filters>([
  { query: "bus", category: "" },
  { query: "", category: "food" },
])("shows Clear while a filter is active and resets to empty filters (%o)", (filters) => {
  const onChange = setup(filters);
  fireEvent.click(screen.getByRole("button", { name: "Clear" }));
  expect(onChange).toHaveBeenCalledWith(emptyFilters);
});
