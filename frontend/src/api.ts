/** All HTTP calls to the backend go through this module. */
import type { Category, MonthSummary, Transaction, TransactionInput } from "./types";

export const NETWORK_ERROR_MESSAGE = "Can't reach the server";

/** Thrown for every failed request. `status` is 0 when the server could not be reached. */
export class ApiError extends Error {
  readonly status: number;
  readonly fields?: Record<string, string>;

  constructor(status: number, message: string, fields?: Record<string, string>) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.fields = fields;
  }
}

async function send(path: string, init?: RequestInit): Promise<Response> {
  let res: Response;
  try {
    res = await fetch(path, init);
  } catch {
    throw new ApiError(0, NETWORK_ERROR_MESSAGE);
  }
  if (!res.ok) throw await toApiError(res);
  return res;
}

async function toApiError(res: Response): Promise<ApiError> {
  const fallback = `Request failed (${res.status})`;
  let body: unknown;
  try {
    body = await res.json();
  } catch {
    return new ApiError(res.status, fallback);
  }
  if (typeof body !== "object" || body === null) return new ApiError(res.status, fallback);
  const { error, fields } = body as { error?: unknown; fields?: unknown };
  const message = typeof error === "string" && error !== "" ? error : fallback;
  return new ApiError(res.status, message, isStringRecord(fields) ? fields : undefined);
}

function isStringRecord(value: unknown): value is Record<string, string> {
  return (
    typeof value === "object" &&
    value !== null &&
    !Array.isArray(value) &&
    Object.values(value).every((v) => typeof v === "string")
  );
}

async function json<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await send(path, init);
  return (await res.json()) as T;
}

function jsonBody(method: string, body: unknown): RequestInit {
  return { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) };
}

export function getCategories(): Promise<Category[]> {
  return json("/api/categories");
}

export function listTransactions(month: string): Promise<Transaction[]> {
  return json(`/api/transactions?month=${encodeURIComponent(month)}`);
}

export function getSummary(month: string): Promise<MonthSummary> {
  return json(`/api/summary?month=${encodeURIComponent(month)}`);
}

export function createTransaction(input: TransactionInput): Promise<Transaction> {
  return json("/api/transactions", jsonBody("POST", input));
}

export function updateTransaction(id: number, input: TransactionInput): Promise<Transaction> {
  return json(`/api/transactions/${id}`, jsonBody("PUT", input));
}

export async function deleteTransaction(id: number): Promise<void> {
  await send(`/api/transactions/${id}`, { method: "DELETE" });
}

export async function downloadReport(month: string): Promise<{ blob: Blob; filename: string }> {
  const res = await send(`/api/reports/${encodeURIComponent(month)}.pdf`);
  const blob = await res.blob();
  return { blob, filename: filenameFrom(res.headers.get("Content-Disposition")) ?? `expenses-${month}.pdf` };
}

function filenameFrom(disposition: string | null): string | undefined {
  const match = disposition?.match(/filename="?([^";]+)"?/i);
  return match?.[1];
}
