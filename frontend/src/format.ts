/** Pure formatting and parsing helpers. Money in integer cents, dates `YYYY-MM-DD`, months `YYYY-MM`. */

const moneyFormat = new Intl.NumberFormat("de-DE", { style: "currency", currency: "EUR" });
const monthTitleFormat = new Intl.DateTimeFormat("en-US", {
  month: "long",
  year: "numeric",
  timeZone: "UTC",
});

const pad2 = (n: number) => String(n).padStart(2, "0");

/** 123456 → "1.234,56 €" (Intl uses a non-breaking space before the €). */
export function formatMoney(cents: number): string {
  return moneyFormat.format(cents / 100);
}

/** "2026-10-06" → "06.10.2026". */
export function formatDate(date: string): string {
  const [y, m, d] = date.split("-");
  return `${d}.${m}.${y}`;
}

/** "2026-10" → "October 2026". */
export function monthTitle(month: string): string {
  const [y, m] = month.split("-").map(Number);
  return monthTitleFormat.format(new Date(Date.UTC(y, m - 1, 1)));
}

/** Local calendar date of `now` as `YYYY-MM-DD`. */
export function toISODate(now: Date): string {
  return `${now.getFullYear()}-${pad2(now.getMonth() + 1)}-${pad2(now.getDate())}`;
}

/** Local calendar month of `now` as `YYYY-MM`. */
export function currentMonth(now: Date = new Date()): string {
  return toISODate(now).slice(0, 7);
}

/** shiftMonth("2026-12", 1) → "2027-01"; n may be negative. */
export function shiftMonth(month: string, n: number): string {
  const [y, m] = month.split("-").map(Number);
  const index = y * 12 + (m - 1) + n;
  return `${Math.floor(index / 12)}-${pad2((index % 12) + 1)}`;
}

/** "2026-10-06" → "2026-10". */
export function monthOf(date: string): string {
  return date.slice(0, 7);
}

/** Default date for a new expense: today when viewing the current month, else the 1st of `month`. */
export function defaultDateFor(month: string, today: Date = new Date()): string {
  const iso = toISODate(today);
  return monthOf(iso) === month ? iso : `${month}-01`;
}

const PLAIN = /^(\d+)(?:[.,](\d{1,2}))?$/;
const GROUPED = /^(\d{1,3}(?:\.\d{3})+),(\d{1,2})$/;

/**
 * Parses a user-typed euro amount into cents, or null if invalid.
 * Accepts "42", "42,5", "42,50", "42.50" and "1.234,56"; rejects empty input, non-numbers,
 * zero, negatives and more than 2 decimals.
 */
export function parseAmount(text: string): number | null {
  const s = text.trim();
  const match = PLAIN.exec(s) ?? GROUPED.exec(s);
  if (!match) return null;
  const euros = Number(match[1].replaceAll(".", ""));
  const cents = Number((match[2] ?? "").padEnd(2, "0"));
  const total = euros * 100 + cents;
  return Number.isSafeInteger(total) && total > 0 ? total : null;
}
