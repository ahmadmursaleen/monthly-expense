import { describe, expect, it } from "vitest";
import request from "supertest";
import { createApp } from "../app.js";
import { openDb } from "../db.js";
import { CATEGORIES, MESSAGES } from "../domain.js";

const body = (overrides: Record<string, unknown> = {}) => ({
  description: "Groceries",
  amountCents: 4250,
  category: "food",
  date: "2026-10-06",
  ...overrides,
});

const newApp = () => createApp(openDb(":memory:"));

describe("GET /api/categories", () => {
  it("lists all categories in spec order", async () => {
    const res = await request(newApp()).get("/api/categories");
    expect(res.status).toBe(200);
    expect(res.body).toEqual(CATEGORIES.map(({ id, label }) => ({ id, label })));
    expect(res.body[0]).toEqual({ id: "food", label: "Food & Groceries" });
  });
});

describe("POST /api/transactions", () => {
  it("creates a transaction and answers 201 with it", async () => {
    const res = await request(newApp()).post("/api/transactions").send(body({ description: "  Groceries  " }));
    expect(res.status).toBe(201);
    expect(res.body).toMatchObject({ id: 1, description: "Groceries", amountCents: 4250, category: "food", date: "2026-10-06" });
    expect(typeof res.body.createdAt).toBe("string");
    expect(res.body.updatedAt).toBe(res.body.createdAt);
  });

  it("answers 400 with a message per invalid field", async () => {
    const res = await request(newApp())
      .post("/api/transactions")
      .send({ description: " ", amountCents: 0, category: "pets", date: "2026-02-30" });
    expect(res.status).toBe(400);
    expect(res.body).toEqual({
      error: expect.any(String),
      fields: {
        description: MESSAGES.description,
        amountCents: MESSAGES.amountCents,
        category: MESSAGES.category,
        date: MESSAGES.date,
      },
    });
  });

  it("only reports the invalid fields", async () => {
    const res = await request(newApp()).post("/api/transactions").send(body({ amountCents: 12.5 }));
    expect(res.status).toBe(400);
    expect(res.body.fields).toEqual({ amountCents: MESSAGES.amountCents });
  });

  it("answers 400 {error} for a malformed JSON body", async () => {
    const res = await request(newApp())
      .post("/api/transactions")
      .set("Content-Type", "application/json")
      .send('{"description": ');
    expect(res.status).toBe(400);
    expect(res.headers["content-type"]).toMatch(/application\/json/);
    expect(res.body).toEqual({ error: expect.any(String) });
  });

  it("answers 400 for a missing body", async () => {
    const res = await request(newApp()).post("/api/transactions");
    expect(res.status).toBe(400);
    expect(Object.keys(res.body.fields)).toEqual(["description", "amountCents", "category", "date"]);
  });
});

describe("GET /api/transactions", () => {
  it("lists only the month's transactions, date desc then id desc, including month edges", async () => {
    const app = newApp();
    for (const date of ["2026-09-30", "2026-10-01", "2026-10-31", "2026-10-15", "2026-10-15", "2026-11-01"]) {
      await request(app).post("/api/transactions").send(body({ date }));
    }
    const res = await request(app).get("/api/transactions?month=2026-10");
    expect(res.status).toBe(200);
    expect(res.body.map((t: { id: number; date: string }) => [t.date, t.id])).toEqual([
      ["2026-10-31", 3],
      ["2026-10-15", 5],
      ["2026-10-15", 4],
      ["2026-10-01", 2],
    ]);
  });

  it("answers an empty list for an empty month", async () => {
    const res = await request(newApp()).get("/api/transactions?month=2026-01");
    expect(res.status).toBe(200);
    expect(res.body).toEqual([]);
  });

  it.each(["", "?month=", "?month=2026-13", "?month=2026-1", "?month=abc", "?month=2026-10&month=2026-11"])(
    "answers 400 {error} for month query %j",
    async (query) => {
      const res = await request(newApp()).get(`/api/transactions${query}`);
      expect(res.status).toBe(400);
      expect(res.body).toEqual({ error: expect.any(String) });
    },
  );
});

describe("PUT /api/transactions/:id", () => {
  it("replaces the transaction and answers 200", async () => {
    const app = newApp();
    const created = (await request(app).post("/api/transactions").send(body())).body;
    const res = await request(app)
      .put(`/api/transactions/${created.id}`)
      .send({ description: "Train", amountCents: 1990, category: "transport", date: "2026-09-02" });
    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({
      id: created.id,
      description: "Train",
      amountCents: 1990,
      category: "transport",
      date: "2026-09-02",
      createdAt: created.createdAt,
    });
  });

  it("answers 400 with fields for an invalid body", async () => {
    const app = newApp();
    const created = (await request(app).post("/api/transactions").send(body())).body;
    const res = await request(app).put(`/api/transactions/${created.id}`).send(body({ date: "06.10.2026" }));
    expect(res.status).toBe(400);
    expect(res.body.fields).toEqual({ date: MESSAGES.date });
  });

  it.each(["999", "abc", "1.5", "-1", "0"])("answers 404 for id %j", async (id) => {
    const app = newApp();
    await request(app).post("/api/transactions").send(body());
    const res = await request(app).put(`/api/transactions/${id}`).send(body());
    expect(res.status).toBe(404);
    expect(res.body).toEqual({ error: expect.any(String) });
  });
});

describe("DELETE /api/transactions/:id", () => {
  it("deletes and answers 204, then 404", async () => {
    const app = newApp();
    const created = (await request(app).post("/api/transactions").send(body())).body;
    const res = await request(app).delete(`/api/transactions/${created.id}`);
    expect(res.status).toBe(204);
    expect(res.text).toBe("");
    expect((await request(app).delete(`/api/transactions/${created.id}`)).status).toBe(404);
  });

  it("answers 404 JSON for a non-numeric id", async () => {
    const res = await request(newApp()).delete("/api/transactions/abc");
    expect(res.status).toBe(404);
    expect(res.body).toEqual({ error: expect.any(String) });
  });
});

describe("GET /api/summary", () => {
  it("sums the month only, per category sorted by total desc", async () => {
    const app = newApp();
    const items = [
      { date: "2026-10-01", category: "food", amountCents: 1000 },
      { date: "2026-10-31", category: "food", amountCents: 2000 },
      { date: "2026-10-10", category: "housing", amountCents: 50000 },
      { date: "2026-09-30", category: "food", amountCents: 7000 },
      { date: "2026-11-01", category: "transport", amountCents: 9000 },
    ];
    for (const item of items) await request(app).post("/api/transactions").send(body(item));
    const res = await request(app).get("/api/summary?month=2026-10");
    expect(res.status).toBe(200);
    expect(res.body).toEqual({
      month: "2026-10",
      totalCents: 53000,
      count: 3,
      byCategory: [
        { category: "housing", totalCents: 50000, count: 1 },
        { category: "food", totalCents: 3000, count: 2 },
      ],
    });
  });

  it("answers zeros for an empty month", async () => {
    const res = await request(newApp()).get("/api/summary?month=2026-01");
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ month: "2026-01", totalCents: 0, count: 0, byCategory: [] });
  });

  it("answers 400 {error} for an invalid month", async () => {
    const res = await request(newApp()).get("/api/summary?month=2026-00");
    expect(res.status).toBe(400);
    expect(res.body).toEqual({ error: expect.any(String) });
  });
});

describe("unknown /api paths", () => {
  it("answer 404 JSON", async () => {
    const res = await request(newApp()).get("/api/nope");
    expect(res.status).toBe(404);
    expect(res.headers["content-type"]).toMatch(/application\/json/);
    expect(res.body).toEqual({ error: expect.any(String) });
  });

  it("answer 404 JSON for unsupported methods on known paths", async () => {
    const res = await request(newApp()).patch("/api/transactions/1").send(body());
    expect(res.status).toBe(404);
    expect(res.body).toEqual({ error: expect.any(String) });
  });
});

describe("round trip", () => {
  it("create → list → update → summary → delete", async () => {
    const app = newApp();
    const a = (await request(app).post("/api/transactions").send(body())).body;
    const b = (await request(app).post("/api/transactions").send(body({ description: "Bus", category: "transport", amountCents: 300 }))).body;

    let list = (await request(app).get("/api/transactions?month=2026-10")).body;
    expect(list.map((t: { id: number }) => t.id)).toEqual([b.id, a.id]);

    const updated = await request(app).put(`/api/transactions/${a.id}`).send(body({ amountCents: 4500 }));
    expect(updated.status).toBe(200);

    let summary = (await request(app).get("/api/summary?month=2026-10")).body;
    expect(summary.totalCents).toBe(4800);
    expect(summary.byCategory).toEqual([
      { category: "food", totalCents: 4500, count: 1 },
      { category: "transport", totalCents: 300, count: 1 },
    ]);

    expect((await request(app).delete(`/api/transactions/${b.id}`)).status).toBe(204);
    list = (await request(app).get("/api/transactions?month=2026-10")).body;
    expect(list).toEqual([updated.body]);
    summary = (await request(app).get("/api/summary?month=2026-10")).body;
    expect(summary).toEqual({ month: "2026-10", totalCents: 4500, count: 1, byCategory: [{ category: "food", totalCents: 4500, count: 1 }] });
  });
});
