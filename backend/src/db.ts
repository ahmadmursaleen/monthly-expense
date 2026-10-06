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

function migrate(db: DatabaseSync): void {
  // Schema is added by the data-model task.
  void db;
}
