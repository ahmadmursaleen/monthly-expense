import { applyFilters, emptyFilters } from "./filters";
import type { CategoryId, Transaction } from "./types";

function tx(id: number, description: string, category: CategoryId): Transaction {
  return {
    id,
    description,
    amountCents: 1000,
    category,
    date: "2026-10-01",
    createdAt: "2026-10-01T00:00:00.000Z",
    updatedAt: "2026-10-01T00:00:00.000Z",
  };
}

const txs = [tx(1, "Weekly groceries", "food"), tx(2, "Bus ticket", "transport"), tx(3, "Grocery delivery", "shopping")];
const ids = (list: Transaction[]) => list.map((t) => t.id);

it("returns everything for empty filters", () => {
  expect(ids(applyFilters(txs, emptyFilters))).toEqual([1, 2, 3]);
});

it("matches a trimmed, case-insensitive substring of the description", () => {
  expect(ids(applyFilters(txs, { query: "  GROCER ", category: "" }))).toEqual([1, 3]);
});

it("treats a whitespace-only query as no query", () => {
  expect(ids(applyFilters(txs, { query: "   ", category: "" }))).toEqual([1, 2, 3]);
});

it("matches the category exactly", () => {
  expect(ids(applyFilters(txs, { query: "", category: "transport" }))).toEqual([2]);
});

it("combines query and category", () => {
  expect(ids(applyFilters(txs, { query: "grocer", category: "shopping" }))).toEqual([3]);
});

it("returns an empty list when nothing matches", () => {
  expect(applyFilters(txs, { query: "rent", category: "" })).toEqual([]);
  expect(applyFilters(txs, { query: "bus", category: "food" })).toEqual([]);
});

it("does not mutate the input", () => {
  const copy = [...txs];
  applyFilters(txs, { query: "bus", category: "" });
  expect(txs).toEqual(copy);
});
