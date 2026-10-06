import { DatabaseSync } from "node:sqlite";
import { mkdirSync } from "node:fs";
import { dirname } from "node:path";

/** The only module that talks to SQLite. Pass ":memory:" in tests. */
export function openDb(path = process.env.DB_PATH ?? "data/expenses.db"): DatabaseSync {
  if (path !== ":memory:") mkdirSync(dirname(path), { recursive: true });
  const db = new DatabaseSync(path);
  db.exec("PRAGMA foreign_keys = ON");
  migrate(db);
  return db;
}

/** Creates the schema (SPEC §5). Idempotent. */
export function migrate(db: DatabaseSync): void {
  db.exec(`
    CREATE TABLE IF NOT EXISTS transactions (
      id           INTEGER PRIMARY KEY AUTOINCREMENT,
      description  TEXT    NOT NULL,
      amount_cents INTEGER NOT NULL CHECK (amount_cents > 0),
      category     TEXT    NOT NULL,
      date         TEXT    NOT NULL,
      created_at   TEXT    NOT NULL,
      updated_at   TEXT    NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_transactions_date ON transactions (date);
  `);
}
