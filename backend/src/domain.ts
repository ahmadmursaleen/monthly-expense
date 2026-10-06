/** Domain types and validation (SPEC §5–6). Money in integer cents, dates `YYYY-MM-DD`, months `YYYY-MM`. */

export const CATEGORIES = [
  { id: "food", label: "Food & Groceries" },
  { id: "transport", label: "Transport" },
  { id: "housing", label: "Housing" },
  { id: "utilities", label: "Utilities" },
  { id: "health", label: "Health" },
  { id: "entertainment", label: "Entertainment" },
  { id: "shopping", label: "Shopping" },
  { id: "other", label: "Other" },
] as const;

export type CategoryId = (typeof CATEGORIES)[number]["id"];

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

/** Request body for create and full-replace update. */
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
  byCategory: CategorySummary[];
}

export const MAX_DESCRIPTION_LENGTH = 200;
export const MAX_AMOUNT_CENTS = 100_000_000;

export const MESSAGES = {
  description: "Description is required",
  amountCents: "Amount must be greater than zero",
  category: "Choose a category",
  date: "Enter a valid date",
} as const;

export type TransactionField = keyof TransactionInput;

export type ValidationResult =
  | { ok: true; value: TransactionInput }
  | { ok: false; fields: Partial<Record<TransactionField, string>> };

export function isCategoryId(value: unknown): value is CategoryId {
  return typeof value === "string" && CATEGORIES.some((c) => c.id === value);
}

/** `YYYY-MM-DD` that is a real calendar date (rejects `2026-02-30`). */
export function isValidDate(value: unknown): value is string {
  if (typeof value !== "string") return false;
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!m) return false;
  const [year, month, day] = [Number(m[1]), Number(m[2]), Number(m[3])];
  if (month < 1 || month > 12 || day < 1) return false;
  return day <= daysInMonth(year, month);
}

/** `YYYY-MM` with month 01–12. */
export function isValidMonth(value: unknown): value is string {
  if (typeof value !== "string") return false;
  const m = /^(\d{4})-(\d{2})$/.exec(value);
  if (!m) return false;
  const month = Number(m[2]);
  return month >= 1 && month <= 12;
}

/** First and last day (both inclusive) of a valid `YYYY-MM` month. Throws on an invalid month. */
export function monthBounds(month: string): { first: string; last: string } {
  if (!isValidMonth(month)) throw new Error(`Invalid month: ${month}`);
  const [year, mon] = month.split("-").map(Number);
  const last = String(daysInMonth(year, mon)).padStart(2, "0");
  return { first: `${month}-01`, last: `${month}-${last}` };
}

function daysInMonth(year: number, month: number): number {
  // Day 0 of the next month is the last day of this one.
  return new Date(Date.UTC(year, month, 0)).getUTCDate();
}

/** Validates an untrusted request body. Returns the normalized input (trimmed description) or per-field messages. */
export function validateTransactionInput(body: unknown): ValidationResult {
  const src: Record<string, unknown> = typeof body === "object" && body !== null ? (body as Record<string, unknown>) : {};
  const fields: Partial<Record<TransactionField, string>> = {};

  const description = typeof src.description === "string" ? src.description.trim() : "";
  if (description.length === 0 || description.length > MAX_DESCRIPTION_LENGTH) {
    fields.description = MESSAGES.description;
  }

  const amountCents = src.amountCents;
  if (
    typeof amountCents !== "number" ||
    !Number.isInteger(amountCents) ||
    amountCents <= 0 ||
    amountCents > MAX_AMOUNT_CENTS
  ) {
    fields.amountCents = MESSAGES.amountCents;
  }

  const category = src.category;
  if (!isCategoryId(category)) fields.category = MESSAGES.category;

  const date = src.date;
  if (!isValidDate(date)) fields.date = MESSAGES.date;

  if (Object.keys(fields).length > 0) return { ok: false, fields };
  return {
    ok: true,
    value: { description, amountCents: amountCents as number, category: category as CategoryId, date: date as string },
  };
}
