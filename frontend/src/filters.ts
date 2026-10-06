/** Client-side search and category filter over one month's transactions (owned by fe-filters-report). */
import type { Transaction } from "./types";

export type Filters = { query: string; category: string };

export const emptyFilters: Filters = { query: "", category: "" };

/** Stub: returns the transactions unchanged until fe-filters-report implements it. */
export function applyFilters(txs: Transaction[], f: Filters): Transaction[] {
  void f;
  return txs;
}
