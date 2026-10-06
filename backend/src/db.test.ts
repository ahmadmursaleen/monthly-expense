import { describe, expect, it } from "vitest";
import { DatabaseSync } from "node:sqlite";
import { migrate, openDb } from "./db.js";

interface ColumnInfo {
  name: string;
  type: string;
  notnull: number;
  pk: number;
}

const insertSql = `INSERT INTO transactions (description, amount_cents, category, date, created_at, updated_at)
  VALUES (?, ?, ?, ?, ?, ?)`;
const ts = "2026-10-06T08:30:00.000Z";

describe("migrate", () => {
  it("creates the transactions table with the SPEC §5 columns", () => {
    const db = openDb(":memory:");
    const cols = db.prepare("PRAGMA table_info(transactions)").all() as unknown as ColumnInfo[];
    expect(cols.map((c) => [c.name, c.type, c.notnull, c.pk])).toEqual([
      ["id", "INTEGER", 0, 1],
      ["description", "TEXT", 1, 0],
      ["amount_cents", "INTEGER", 1, 0],
      ["category", "TEXT", 1, 0],
      ["date", "TEXT", 1, 0],
      ["created_at", "TEXT", 1, 0],
      ["updated_at", "TEXT", 1, 0],
    ]);
  });

  it("creates an index on date", () => {
    const db = openDb(":memory:");
    const indexes = db.prepare("PRAGMA index_list(transactions)").all() as unknown as { name: string }[];
    const dateIndexes = indexes.filter((idx) => {
      const cols = db.prepare(`PRAGMA index_info(${JSON.stringify(idx.name)})`).all() as unknown as {
        name: string;
      }[];
      return cols.length === 1 && cols[0].name === "date";
    });
    expect(dateIndexes).toHaveLength(1);
  });

  it("is idempotent and keeps existing rows", () => {
    const db = new DatabaseSync(":memory:");
    migrate(db);
    db.prepare(insertSql).run("Groceries", 4250, "food", "2026-10-06", ts, ts);
    expect(() => migrate(db)).not.toThrow();
    expect(db.prepare("SELECT COUNT(*) AS n FROM transactions").get()).toEqual({ n: 1 });
  });

  it.each([[0], [-1]])("rejects amount_cents %d via the CHECK constraint", (amount) => {
    const db = openDb(":memory:");
    expect(() => db.prepare(insertSql).run("Groceries", amount, "food", "2026-10-06", ts, ts)).toThrow(/CHECK/);
  });

  it("accepts amount_cents 1", () => {
    const db = openDb(":memory:");
    expect(() => db.prepare(insertSql).run("Groceries", 1, "food", "2026-10-06", ts, ts)).not.toThrow();
  });

  it("rejects NULL in required columns", () => {
    const db = openDb(":memory:");
    expect(() => db.prepare(insertSql).run(null, 4250, "food", "2026-10-06", ts, ts)).toThrow(/NOT NULL/);
    expect(() => db.prepare(insertSql).run("Groceries", 4250, "food", null, ts, ts)).toThrow(/NOT NULL/);
  });
});
