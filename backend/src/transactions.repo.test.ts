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
    const tx = createTransactionsRepo(db1).create(input());
    db1.close();

    const db2 = openDb(path);
    expect(createTransactionsRepo(db2).getById(tx.id)).toEqual(tx);
    expect(createTransactionsRepo(db2).listByMonth("2026-10")).toEqual([tx]);
    db2.close();
  });
});
