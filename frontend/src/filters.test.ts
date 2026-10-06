import { applyFilters, emptyFilters, isFiltered } from "./filters";
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

it("matches a lowercase query anywhere inside a mixed-case description", () => {
  expect(ids(applyFilters(txs, { query: "ticket", category: "" }))).toEqual([2]);
  expect(ids(applyFilters(txs, { query: "y gro", category: "" }))).toEqual([1]);
});

it("keeps inner whitespace of the query significant (only the ends are trimmed)", () => {
  expect(ids(applyFilters(txs, { query: " bus ticket ", category: "" }))).toEqual([2]);
  expect(applyFilters(txs, { query: "bus  ticket", category: "" })).toEqual([]);
});

it("does not match a category by prefix or different case", () => {
  expect(applyFilters(txs, { query: "", category: "foo" })).toEqual([]);
  expect(applyFilters(txs, { query: "", category: "Food" })).toEqual([]);
});

it("excludes a description match whose category differs", () => {
  expect(ids(applyFilters(txs, { query: "grocer", category: "food" }))).toEqual([1]);
});

it("applies only the category when the query is whitespace-only", () => {
  expect(ids(applyFilters(txs, { query: "  ", category: "shopping" }))).toEqual([3]);
});

it("returns an empty list for an empty input", () => {
  expect(applyFilters([], { query: "bus", category: "transport" })).toEqual([]);
  expect(applyFilters([], emptyFilters)).toEqual([]);
});

it("returns a new array even when nothing is filtered out", () => {
  const result = applyFilters(txs, emptyFilters);
  expect(result).not.toBe(txs);
  expect(result).toEqual(txs);
});

it("does not mutate the input", () => {
  const copy = [...txs];
  applyFilters(txs, { query: "bus", category: "" });
  expect(txs).toEqual(copy);
});

describe("isFiltered", () => {
  it("is false for empty filters and a whitespace-only query", () => {
    expect(isFiltered(emptyFilters)).toBe(false);
    expect(isFiltered({ query: "   ", category: "" })).toBe(false);
  });

  it("is true for a non-blank query, a category, or both", () => {
    expect(isFiltered({ query: "bus", category: "" })).toBe(true);
    expect(isFiltered({ query: " bus ", category: "" })).toBe(true);
    expect(isFiltered({ query: "", category: "food" })).toBe(true);
    expect(isFiltered({ query: "  ", category: "food" })).toBe(true);
    expect(isFiltered({ query: "bus", category: "transport" })).toBe(true);
  });
});
