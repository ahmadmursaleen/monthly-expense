import { useCallback, useEffect, useState } from "react";
import { getCategories, getSummary, listTransactions } from "./api";
import type { Category, MonthSummary, Transaction } from "./types";

export interface MonthData {
  /** The month's transactions as the API returns them (date desc, then id desc). */
  transactions: Transaction[];
  /** Null until the month has loaded. */
  summary: MonthSummary | null;
  categories: Category[];
  /** True while a request for the current month (or a reload) is in flight. */
  loading: boolean;
  /** Message of the last failed load, null when it succeeded or is still loading. */
  error: string | null;
  /** Fetches the month again (after a save/delete, or on Retry). */
  reload: () => void;
}

type Result =
  | { key: string; month: string; transactions: Transaction[]; summary: MonthSummary; categories: Category[] }
  | { key: string; month: string; error: string };

/**
 * Loads a month's transactions, summary and the categories. While reloading the same month the previous
 * data stays visible; responses for a month or reload that is no longer current are ignored.
 */
export function useMonthData(month: string): MonthData {
  // Every month change and every reload gets a new sequence number, so returning to a month (A -> B -> A)
  // is a new request and never matches an older result for that month.
  const [request, setRequest] = useState({ month, seq: 0 });
  if (request.month !== month) setRequest({ month, seq: request.seq + 1 });
  const seq = request.month === month ? request.seq : request.seq + 1;
  const [result, setResult] = useState<Result | null>(null);
  const [lastData, setLastData] = useState<Extract<Result, { summary: MonthSummary }> | null>(null);
  const key = `${month}#${seq}`;

  useEffect(() => {
    let current = true;
    Promise.all([listTransactions(month), getSummary(month), getCategories()]).then(
      ([transactions, summary, categories]) => {
        if (!current) return;
        const data = { key, month, transactions, summary, categories };
        setResult(data);
        setLastData(data);
      },
      (err: unknown) => {
        if (!current) return;
        setResult({ key, month, error: err instanceof Error ? err.message : String(err) });
      },
    );
    return () => {
      current = false;
    };
  }, [key, month]);

  const reload = useCallback(() => setRequest((r) => ({ ...r, seq: r.seq + 1 })), []);

  const data = lastData?.month === month ? lastData : null;
  return {
    transactions: data?.transactions ?? [],
    summary: data?.summary ?? null,
    categories: lastData?.categories ?? [],
    loading: result?.key !== key,
    error: result?.key === key && "error" in result ? result.error : null,
    reload,
  };
}
