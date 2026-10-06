import { afterEach, describe, expect, it } from "vitest";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { openDb } from "./db.js";
import type { TransactionInput } from "./domain.js";
import { createTransactionsRepo } from "./transactions.repo.js";

const input = (overrides: Partial<TransactionInput> = {}): TransactionInput => ({
  description: "Groceries",
  amountCents: 4250,
  category: "food",
  date: "2026-10-06",
  ...overrides,
});

function memoryRepo(now?: () => Date) {
  return createTransactionsRepo(openDb(":memory:"), now);
}

describe("transactions repo CRUD", () => {
  it("creates a transaction with id and timestamps", () => {
    const repo = memoryRepo(() => new Date("2026-10-06T08:30:00.000Z"));
    expect(repo.create(input())).toEqual({
      id: 1,
      description: "Groceries",
      amountCents: 4250,
      category: "food",
      date: "2026-10-06",
      createdAt: "2026-10-06T08:30:00.000Z",
      updatedAt: "2026-10-06T08:30:00.000Z",
    });
  });

  it("gets by id, or null when missing", () => {
    const repo = memoryRepo();
    const tx = repo.create(input());
    expect(repo.getById(tx.id)).toEqual(tx);
    expect(repo.getById(999)).toBeNull();
  });

  it("updates all fields, keeps createdAt and bumps updatedAt", () => {
    let t = new Date("2026-10-06T08:30:00.000Z");
    const repo = memoryRepo(() => t);
    const tx = repo.create(input());
    t = new Date("2026-10-07T09:00:00.000Z");
    const updated = repo.update(tx.id, {
      description: "Train",
      amountCents: 1990,
      category: "transport",
      date: "2026-09-30",
    });
    expect(updated).toEqual({
      id: tx.id,
      description: "Train",
      amountCents: 1990,
      category: "transport",
      date: "2026-09-30",
      createdAt: "2026-10-06T08:30:00.000Z",
      updatedAt: "2026-10-07T09:00:00.000Z",
    });
    expect(repo.getById(tx.id)).toEqual(updated);
  });

  it("returns null when updating a missing id", () => {
    expect(memoryRepo().update(42, input())).toBeNull();
  });

  it("removes a transaction and reports whether it existed", () => {
    const repo = memoryRepo();
    const tx = repo.create(input());
    expect(repo.remove(tx.id)).toBe(true);
    expect(repo.getById(tx.id)).toBeNull();
    expect(repo.remove(tx.id)).toBe(false);
  });

  it("enforces amount_cents > 0 in the schema", () => {
    expect(() => memoryRepo().create(input({ amountCents: 0 }))).toThrow();
  });

  it("update and remove only touch the targeted row", () => {
    const repo = memoryRepo();
    const a = repo.create(input({ description: "Coffee" }));
    const b = repo.create(input({ description: "Bread" }));
    const c = repo.create(input({ description: "Milk" }));
    repo.update(b.id, input({ description: "Rye bread" }));
    expect(repo.remove(c.id)).toBe(true);
    expect(repo.getById(a.id)).toEqual(a);
    expect(repo.getById(b.id)?.description).toBe("Rye bread");
    expect(repo.getById(c.id)).toBeNull();
  });

  it("does not reuse the id of a deleted transaction", () => {
    const repo = memoryRepo();
    repo.create(input());
    const second = repo.create(input());
    repo.remove(second.id);
    expect(repo.create(input()).id).toBeGreaterThan(second.id);
  });

  it("stores descriptions with quotes and SQL-like text verbatim", () => {
    const repo = memoryRepo();
    const description = `Bob's "café"'); DROP TABLE transactions; --`;
    const tx = repo.create(input({ description }));
    expect(repo.getById(tx.id)?.description).toBe(description);
    expect(repo.listByMonth("2026-10")).toHaveLength(1);
  });

  it("stores the maximum amount exactly", () => {
    const repo = memoryRepo();
    const tx = repo.create(input({ amountCents: 100_000_000 }));
    expect(repo.getById(tx.id)?.amountCents).toBe(100_000_000);
  });

  it("returns false when removing an id that never existed", () => {
    expect(memoryRepo().remove(12345)).toBe(false);
  });
});

describe("listByMonth", () => {
  it("separates 30 September from 1 October", () => {
    const repo = memoryRepo();
    const sep = repo.create(input({ date: "2026-09-30" }));
    const oct = repo.create(input({ date: "2026-10-01" }));
    const octEnd = repo.create(input({ date: "2026-10-31" }));
    repo.create(input({ date: "2026-11-01" }));
    expect(repo.listByMonth("2026-09").map((t) => t.id)).toEqual([sep.id]);
    expect(repo.listByMonth("2026-10").map((t) => t.id)).toEqual([octEnd.id, oct.id]);
  });

  it("sorts by date desc, then id desc", () => {
    const repo = memoryRepo();
    const a = repo.create(input({ date: "2026-10-05" }));
    const b = repo.create(input({ date: "2026-10-06" }));
    const c = repo.create(input({ date: "2026-10-05" }));
    const d = repo.create(input({ date: "2026-10-01" }));
    expect(repo.listByMonth("2026-10").map((t) => t.id)).toEqual([b.id, c.id, a.id, d.id]);
  });

  it("separates 31 December from 1 January of the next year", () => {
    const repo = memoryRepo();
    const dec = repo.create(input({ date: "2026-12-31" }));
    const jan = repo.create(input({ date: "2027-01-01" }));
    expect(repo.listByMonth("2026-12").map((t) => t.id)).toEqual([dec.id]);
    expect(repo.listByMonth("2027-01").map((t) => t.id)).toEqual([jan.id]);
  });

  it("includes 29 February in a leap-year February and excludes 1 March", () => {
    const repo = memoryRepo();
    const feb29 = repo.create(input({ date: "2028-02-29" }));
    repo.create(input({ date: "2028-03-01" }));
    repo.create(input({ date: "2028-01-31" }));
    expect(repo.listByMonth("2028-02").map((t) => t.id)).toEqual([feb29.id]);
  });

  it("moves a transaction between months when its date is updated", () => {
    const repo = memoryRepo();
    const tx = repo.create(input({ date: "2026-10-01" }));
    repo.update(tx.id, input({ date: "2026-09-30" }));
    expect(repo.listByMonth("2026-10")).toEqual([]);
    expect(repo.listByMonth("2026-09").map((t) => t.id)).toEqual([tx.id]);
  });

  it("returns an empty list for an empty month", () => {
    expect(memoryRepo().listByMonth("2026-01")).toEqual([]);
  });

  it("throws on an invalid month", () => {
    expect(() => memoryRepo().listByMonth("2026-13")).toThrow();
  });
});

describe("summarizeMonth", () => {
  it("summarizes an empty month", () => {
    expect(memoryRepo().summarizeMonth("2026-01")).toEqual({
      month: "2026-01",
      totalCents: 0,
      count: 0,
      byCategory: [],
    });
  });

  it("totals the month per category, only categories with spending, total desc", () => {
    const repo = memoryRepo();
    repo.create(input({ category: "food", amountCents: 1000 }));
    repo.create(input({ category: "food", amountCents: 2500 }));
    repo.create(input({ category: "housing", amountCents: 80000 }));
    repo.create(input({ category: "transport", amountCents: 1990, date: "2026-10-31" }));
    repo.create(input({ category: "health", amountCents: 99999, date: "2026-09-30" }));
    expect(repo.summarizeMonth("2026-10")).toEqual({
      month: "2026-10",
      totalCents: 85490,
      count: 4,
      byCategory: [
        { category: "housing", totalCents: 80000, count: 1 },
        { category: "food", totalCents: 3500, count: 2 },
        { category: "transport", totalCents: 1990, count: 1 },
      ],
    });
  });

  it("breaks total ties by the category order", () => {
    const repo = memoryRepo();
    repo.create(input({ category: "other", amountCents: 500 }));
    repo.create(input({ category: "transport", amountCents: 500 }));
    expect(repo.summarizeMonth("2026-10").byCategory.map((c) => c.category)).toEqual(["transport", "other"]);
  });

  it("returns an empty summary for a month that only has neighbouring-month data", () => {
    const repo = memoryRepo();
    repo.create(input({ date: "2026-09-30" }));
    repo.create(input({ date: "2026-11-01" }));
    expect(repo.summarizeMonth("2026-10")).toEqual({ month: "2026-10", totalCents: 0, count: 0, byCategory: [] });
  });

  it("agrees with listByMonth on total and count", () => {
    const repo = memoryRepo();
    repo.create(input({ amountCents: 1234, date: "2026-10-01" }));
    repo.create(input({ amountCents: 5678, category: "shopping", date: "2026-10-31" }));
    repo.create(input({ amountCents: 999, category: "other", date: "2026-10-15" }));
    const list = repo.listByMonth("2026-10");
    const summary = repo.summarizeMonth("2026-10");
    expect(summary.count).toBe(list.length);
    expect(summary.totalCents).toBe(list.reduce((s, t) => s + t.amountCents, 0));
  });

  it("sums many maximum amounts exactly as integer cents", () => {
    const repo = memoryRepo();
    for (let i = 0; i < 50; i++) repo.create(input({ amountCents: 100_000_000 }));
    const summary = repo.summarizeMonth("2026-10");
    expect(summary.totalCents).toBe(5_000_000_000);
    expect(summary.byCategory).toEqual([{ category: "food", totalCents: 5_000_000_000, count: 50 }]);
  });

  it("reflects removals and updates", () => {
    const repo = memoryRepo();
    const a = repo.create(input({ category: "food", amountCents: 1000 }));
    const b = repo.create(input({ category: "health", amountCents: 2000 }));
    repo.remove(a.id);
    repo.update(b.id, input({ category: "utilities", amountCents: 3000 }));
    expect(repo.summarizeMonth("2026-10").byCategory).toEqual([
      { category: "utilities", totalCents: 3000, count: 1 },
    ]);
  });

  it("throws on an invalid month", () => {
    expect(() => memoryRepo().summarizeMonth("2026-00")).toThrow();
  });
});

describe("persistence", () => {
  let dir: string | undefined;
  afterEach(() => {
    if (dir) rmSync(dir, { recursive: true, force: true });
    dir = undefined;
  });

  it("keeps data after closing and reopening a file DB", () => {
    dir = mkdtempSync(join(tmpdir(), "expenses-"));
    const path = join(dir, "nested", "test.db");
    const db1 = openDb(path);
    let tx;
    try {
      tx = createTransactionsRepo(db1).create(input());
    } finally {
      db1.close();
    }

    const db2 = openDb(path);
    try {
      expect(createTransactionsRepo(db2).getById(tx.id)).toEqual(tx);
      expect(createTransactionsRepo(db2).listByMonth("2026-10")).toEqual([tx]);
    } finally {
      db2.close();
    }
  });

  it("persists updates and deletes, and continues ids after reopening", () => {
    dir = mkdtempSync(join(tmpdir(), "expenses-"));
    const path = join(dir, "test.db");
    const db1 = openDb(path);
    let gone, updated;
    try {
      const repo1 = createTransactionsRepo(db1, () => new Date("2026-10-06T08:30:00.000Z"));
      const kept = repo1.create(input({ description: "Rent" }));
      gone = repo1.create(input({ description: "Typo" }));
      updated = repo1.update(kept.id, input({ description: "Rent October", category: "housing" }));
      repo1.remove(gone.id);
    } finally {
      db1.close();
    }

    const db2 = openDb(path);
    try {
      const repo2 = createTransactionsRepo(db2);
      expect(repo2.listByMonth("2026-10")).toEqual([updated]);
      expect(repo2.create(input()).id).toBeGreaterThan(gone.id);
    } finally {
      db2.close();
    }
  });
});

describe("transactions repo replaceAll", () => {
  let dir: string | undefined;
  afterEach(() => {
    if (dir) rmSync(dir, { recursive: true, force: true });
    dir = undefined;
  });

  it("deletes everything, inserts the new rows and returns the deleted count", () => {
    const repo = memoryRepo(() => new Date("2026-10-06T08:30:00.000Z"));
    repo.create(input({ date: "2026-09-01" }));
    repo.create(input());
    expect(repo.replaceAll([input({ description: "Seeded" }), input({ description: "Seeded 2", date: "2026-10-05" })])).toBe(2);
    expect(repo.listByMonth("2026-09")).toEqual([]);
    expect(repo.listByMonth("2026-10").map((t) => t.description)).toEqual(["Seeded", "Seeded 2"]);
  });

  it("rolls back when an insert fails", () => {
    const repo = memoryRepo();
    const kept = repo.create(input());
    expect(() => repo.replaceAll([input(), input({ amountCents: 0 })])).toThrow();
    expect(repo.listByMonth("2026-10")).toEqual([kept]);
  });

  it("returns 0 on an empty table and clears everything when given no inputs", () => {
    const repo = memoryRepo();
    expect(repo.replaceAll([input({ description: "First seed" })])).toBe(0);
    expect(repo.replaceAll([])).toBe(1);
    expect(repo.listByMonth("2026-10")).toEqual([]);
  });

  it("leaves no open transaction after a rollback, so the repo keeps working", () => {
    const repo = memoryRepo();
    const kept = repo.create(input());
    expect(() => repo.replaceAll([input({ amountCents: -5 })])).toThrow();
    const added = repo.create(input({ description: "After failure", date: "2026-10-07" }));
    expect(repo.listByMonth("2026-10")).toEqual([added, kept]);
    expect(repo.replaceAll([input({ description: "Retry" })])).toBe(2);
    expect(repo.listByMonth("2026-10").map((t) => t.description)).toEqual(["Retry"]);
  });

  it("commits the replacement durably to a file database", () => {
    dir = mkdtempSync(join(tmpdir(), "expenses-"));
    const path = join(dir, "seed.db");
    const db1 = openDb(path);
    try {
      const repo1 = createTransactionsRepo(db1);
      repo1.create(input({ description: "Old" }));
      repo1.replaceAll([input({ description: "Seeded rent", category: "housing", amountCents: 95000 })]);
    } finally {
      db1.close();
    }

    const db2 = openDb(path);
    try {
      expect(createTransactionsRepo(db2).listByMonth("2026-10").map((t) => t.description)).toEqual(["Seeded rent"]);
    } finally {
      db2.close();
    }
  });
});
