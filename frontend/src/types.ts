/** Shapes of the API contract (SPEC §6). Money in integer cents, dates `YYYY-MM-DD`, months `YYYY-MM`. */

export type CategoryId =
  | "food"
  | "transport"
  | "housing"
  | "utilities"
  | "health"
  | "entertainment"
  | "shopping"
  | "other";

export interface Category {
  id: CategoryId;
  label: string;
}

export interface Transaction {
  id: number;
  description: string;
  amountCents: number;
  category: CategoryId;
  date: string;
  createdAt: string;
  updatedAt: string;
}

/** Request body for POST /api/transactions and PUT /api/transactions/:id. */
export interface TransactionInput {
  description: string;
  amountCents: number;
  category: CategoryId;
  date: string;
}

export interface CategorySummary {
  category: CategoryId;
  totalCents: number;
  count: number;
}

export interface MonthSummary {
  month: string;
  totalCents: number;
  count: number;
  /** Only categories with spending, sorted by total desc. */
  byCategory: CategorySummary[];
}

/** Error body returned by the API for non-2xx responses. */
export interface ApiErrorBody {
  error: string;
  fields?: Record<string, string>;
}
