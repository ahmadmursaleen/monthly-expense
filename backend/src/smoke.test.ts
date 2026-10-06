/** End-to-end smoke test (SPEC S2): the real app on a real port with a temp-file DB, driven with `fetch`. */
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { mkdtempSync, rmSync } from "node:fs";
import type { Server } from "node:http";
import type { AddressInfo } from "node:net";
import { tmpdir } from "node:os";
import { join } from "node:path";
import type { DatabaseSync } from "node:sqlite";
import { createApp } from "./app.js";
import { openDb } from "./db.js";
import type { Transaction } from "./domain.js";

let dir: string;
let db: DatabaseSync;
let server: Server;
let base: string;

beforeAll(async () => {
  dir = mkdtempSync(join(tmpdir(), "expenses-smoke-"));
  db = openDb(join(dir, "smoke.db"));
  server = await new Promise<Server>((resolve) => {
    const s = createApp(db).listen(0, "127.0.0.1", () => resolve(s));
  });
  base = `http://127.0.0.1:${(server.address() as AddressInfo).port}/api`;
});

afterAll(async () => {
  await new Promise<void>((resolve, reject) => server.close((err) => (err ? reject(err) : resolve())));
  db.close();
  rmSync(dir, { recursive: true, force: true });
});

function send(method: string, path: string, body?: unknown): Promise<Response> {
  return fetch(`${base}${path}`, {
    method,
    headers: body === undefined ? undefined : { "Content-Type": "application/json" },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
}

describe("API smoke test against a running server", () => {
  it("runs the whole flow: health → categories → create → list → update → summary → PDF → delete", async () => {
    const health = await send("GET", "/health");
    expect(health.status).toBe(200);
    expect(await health.json()).toEqual({ ok: true });

    const categories = await send("GET", "/categories");
    expect(categories.status).toBe(200);
    expect(await categories.json()).toContainEqual({ id: "food", label: "Food & Groceries" });

    const created = await send("POST", "/transactions", {
      description: "Weekly groceries",
      amountCents: 4250,
      category: "food",
      date: "2026-10-06",
    });
    expect(created.status).toBe(201);
    const tx = (await created.json()) as Transaction;
    expect(tx).toMatchObject({ description: "Weekly groceries", amountCents: 4250, category: "food", date: "2026-10-06" });

    const list = await send("GET", "/transactions?month=2026-10");
    expect(list.status).toBe(200);
    expect(await list.json()).toEqual([tx]);

    const updated = await send("PUT", `/transactions/${tx.id}`, {
      description: "Groceries and bakery",
      amountCents: 5100,
      category: "food",
      date: "2026-10-05",
    });
    expect(updated.status).toBe(200);
    expect(await updated.json()).toMatchObject({ id: tx.id, description: "Groceries and bakery", amountCents: 5100 });

    const summary = await send("GET", "/summary?month=2026-10");
    expect(summary.status).toBe(200);
    expect(await summary.json()).toEqual({
      month: "2026-10",
      totalCents: 5100,
      count: 1,
      byCategory: [{ category: "food", totalCents: 5100, count: 1 }],
    });

    const pdf = await send("GET", "/reports/2026-10.pdf");
    expect(pdf.status).toBe(200);
    expect(pdf.headers.get("content-type")).toBe("application/pdf");
    expect(pdf.headers.get("content-disposition")).toBe('attachment; filename="expenses-2026-10.pdf"');
    const bytes = Buffer.from(await pdf.arrayBuffer());
    expect(bytes.subarray(0, 5).toString("latin1")).toBe("%PDF-");

    const deleted = await send("DELETE", `/transactions/${tx.id}`);
    expect(deleted.status).toBe(204);

    const empty = await send("GET", "/transactions?month=2026-10");
    expect(empty.status).toBe(200);
    expect(await empty.json()).toEqual([]);
  }, 5000);
});
