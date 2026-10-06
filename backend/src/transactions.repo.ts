import type { DatabaseSync } from "node:sqlite";
import {
  CATEGORIES,
  monthBounds,
  type CategoryId,
  type CategorySummary,
  type MonthSummary,
  type Transaction,
  type TransactionInput,
} from "./domain.js";

/** SQL for the `transactions` table. Inputs must already be validated (`validateTransactionInput`). */
export interface TransactionsRepo {
  create(input: TransactionInput): Transaction;
  /** Full replace; returns null if the id does not exist. */
  update(id: number, input: TransactionInput): Transaction | null;
  /** Returns false if the id does not exist. */
  remove(id: number): boolean;
  getById(id: number): Transaction | null;
  /** All transactions of a `YYYY-MM` month, date desc, then id desc. */
  listByMonth(month: string): Transaction[];
  summarizeMonth(month: string): MonthSummary;
}

interface Row {
  id: number;
  description: string;
  amount_cents: number;
  category: string;
  date: string;
  created_at: string;
  updated_at: string;
}

const COLUMNS = "id, description, amount_cents, category, date, created_at, updated_at";

function toTransaction(row: Row): Transaction {
  return {
    id: row.id,
    description: row.description,
    amountCents: row.amount_cents,
    category: row.category as CategoryId,
    date: row.date,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

const categoryOrder = new Map<string, number>(CATEGORIES.map((c, i) => [c.id, i]));

/** `now` is injectable so tests can control timestamps. */
export function createTransactionsRepo(db: DatabaseSync, now: () => Date = () => new Date()): TransactionsRepo {
  const insertStmt = db.prepare(
    `INSERT INTO transactions (description, amount_cents, category, date, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?) RETURNING ${COLUMNS}`,
  );
  const updateStmt = db.prepare(
    `UPDATE transactions SET description = ?, amount_cents = ?, category = ?, date = ?, updated_at = ?
     WHERE id = ? RETURNING ${COLUMNS}`,
  );
  const deleteStmt = db.prepare("DELETE FROM transactions WHERE id = ?");
  const getStmt = db.prepare(`SELECT ${COLUMNS} FROM transactions WHERE id = ?`);
  const listStmt = db.prepare(
    `SELECT ${COLUMNS} FROM transactions WHERE date BETWEEN ? AND ? ORDER BY date DESC, id DESC`,
  );
  const summaryStmt = db.prepare(
    `SELECT category, SUM(amount_cents) AS total_cents, COUNT(*) AS count
     FROM transactions WHERE date BETWEEN ? AND ? GROUP BY category`,
  );

  return {
    create(input) {
      const ts = now().toISOString();
      const row = insertStmt.get(input.description, input.amountCents, input.category, input.date, ts, ts);
      return toTransaction(row as unknown as Row);
    },

    update(id, input) {
      const ts = now().toISOString();
      const row = updateStmt.get(input.description, input.amountCents, input.category, input.date, ts, id);
      return row ? toTransaction(row as unknown as Row) : null;
    },

    remove(id) {
      return Number(deleteStmt.run(id).changes) > 0;
    },

    getById(id) {
      const row = getStmt.get(id);
      return row ? toTransaction(row as unknown as Row) : null;
    },

    listByMonth(month) {
      const { first, last } = monthBounds(month);
      return (listStmt.all(first, last) as unknown as Row[]).map(toTransaction);
    },

    summarizeMonth(month) {
      const { first, last } = monthBounds(month);
      const rows = summaryStmt.all(first, last) as unknown as { category: string; total_cents: number; count: number }[];
      const byCategory: CategorySummary[] = rows
        .map((r) => ({ category: r.category as CategoryId, totalCents: r.total_cents, count: r.count }))
        .sort(
          (a, b) =>
            b.totalCents - a.totalCents ||
            (categoryOrder.get(a.category) ?? Infinity) - (categoryOrder.get(b.category) ?? Infinity),
        );
      return {
        month,
        totalCents: byCategory.reduce((sum, c) => sum + c.totalCents, 0),
        count: byCategory.reduce((sum, c) => sum + c.count, 0),
        byCategory,
      };
    },
  };
}
