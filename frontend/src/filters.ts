/** Client-side search and category filter over one month's transactions (owned by fe-filters-report). */
import type { Transaction } from "./types";

export type Filters = { query: string; category: string };

export const emptyFilters: Filters = { query: "", category: "" };

/** True while a filter narrows the list: a non-blank query or a chosen category. */
export function isFiltered(f: Filters): boolean {
  return f.query.trim() !== "" || f.category !== "";
}

/**
 * Keeps the transactions whose description contains the trimmed query (case-insensitive) and whose
 * category equals `f.category`. An empty query or category does not filter. Pure: returns a new array.
 */
export function applyFilters(txs: Transaction[], f: Filters): Transaction[] {
  const query = f.query.trim().toLowerCase();
  return txs.filter(
    (tx) =>
      (query === "" || tx.description.toLowerCase().includes(query)) &&
      (f.category === "" || tx.category === f.category),
  );
}
