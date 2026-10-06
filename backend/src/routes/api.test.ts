import { afterEach, describe, expect, it, vi } from "vitest";
import express from "express";
import request from "supertest";
import { createApp } from "../app.js";
import { openDb } from "../db.js";
import { CATEGORIES, MAX_AMOUNT_CENTS, MAX_DESCRIPTION_LENGTH, MESSAGES } from "../domain.js";
import { apiErrorHandler } from "./api.js";

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

describe("validation boundaries over HTTP", () => {
  it("accepts a description of exactly the max length and rejects one char more", async () => {
    const app = newApp();
    const ok = await request(app).post("/api/transactions").send(body({ description: "a".repeat(MAX_DESCRIPTION_LENGTH) }));
    expect(ok.status).toBe(201);
    expect(ok.body.description).toHaveLength(MAX_DESCRIPTION_LENGTH);

    const tooLong = await request(app)
      .post("/api/transactions")
      .send(body({ description: "a".repeat(MAX_DESCRIPTION_LENGTH + 1) }));
    expect(tooLong.status).toBe(400);
    expect(tooLong.body.fields).toEqual({ description: MESSAGES.description });
  });

  it("accepts the max amount and rejects one cent more", async () => {
    const app = newApp();
    expect((await request(app).post("/api/transactions").send(body({ amountCents: MAX_AMOUNT_CENTS }))).status).toBe(201);
    const res = await request(app).post("/api/transactions").send(body({ amountCents: MAX_AMOUNT_CENTS + 1 }));
    expect(res.status).toBe(400);
    expect(res.body.fields).toEqual({ amountCents: MESSAGES.amountCents });
  });

  it.each([
    ["amountCents as numeric string", { amountCents: "4250" }, "amountCents"],
    ["negative amount", { amountCents: -1 }, "amountCents"],
    ["description as number", { description: 42 }, "description"],
    ["category with wrong case", { category: "Food" }, "category"],
    ["date as null", { date: null }, "date"],
  ])("rejects %s with only that field", async (_name, override, field) => {
    const res = await request(newApp()).post("/api/transactions").send(body(override));
    expect(res.status).toBe(400);
    expect(Object.keys(res.body.fields)).toEqual([field]);
  });

  it("answers 400 with all fields for a JSON array body", async () => {
    const res = await request(newApp()).post("/api/transactions").send([body()]);
    expect(res.status).toBe(400);
    expect(Object.keys(res.body.fields).sort()).toEqual(["amountCents", "category", "date", "description"]);
  });

  it("answers 400 {error} for a JSON primitive body (strict JSON parser)", async () => {
    const res = await request(newApp()).post("/api/transactions").set("Content-Type", "application/json").send("null");
    expect(res.status).toBe(400);
    expect(res.body).toEqual({ error: expect.any(String) });
  });

  it("does not parse a non-JSON content type and answers 400 with fields", async () => {
    const res = await request(newApp())
      .post("/api/transactions")
      .set("Content-Type", "text/plain")
      .send(JSON.stringify(body()));
    expect(res.status).toBe(400);
    expect(res.body.error).toEqual(expect.any(String));
    expect(Object.keys(res.body.fields)).toHaveLength(4);
  });

  it("ignores client-supplied id and timestamps on create and update", async () => {
    const app = newApp();
    const created = await request(app)
      .post("/api/transactions")
      .send(body({ id: 99, createdAt: "2000-01-01T00:00:00.000Z", updatedAt: "2000-01-01T00:00:00.000Z" }));
    expect(created.status).toBe(201);
    expect(created.body.id).toBe(1);
    expect(created.body.createdAt).not.toBe("2000-01-01T00:00:00.000Z");
    expect(Object.keys(created.body).sort()).toEqual(
      ["amountCents", "category", "createdAt", "date", "description", "id", "updatedAt"],
    );

    const updated = await request(app)
      .put("/api/transactions/1")
      .send(body({ id: 2, createdAt: "2000-01-01T00:00:00.000Z" }));
    expect(updated.status).toBe(200);
    expect(updated.body.id).toBe(1);
    expect(updated.body.createdAt).toBe(created.body.createdAt);
  });
});

describe("PUT/DELETE id edge cases", () => {
  it.each(["1e0", "0x1", "+1", "9007199254740993", "99999999999999999999"])("PUT answers 404 for id %j", async (id) => {
    const app = newApp();
    await request(app).post("/api/transactions").send(body());
    const res = await request(app).put(`/api/transactions/${id}`).send(body({ description: "Changed" }));
    expect(res.status).toBe(404);
    expect(res.body).toEqual({ error: expect.any(String) });
    // the existing transaction 1 must not have been touched
    const list = (await request(app).get("/api/transactions?month=2026-10")).body;
    expect(list[0].description).toBe("Groceries");
  });

  it.each(["0", "-1", "1.0", "abc", "9007199254740991"])("DELETE answers 404 JSON for id %j and deletes nothing", async (id) => {
    const app = newApp();
    await request(app).post("/api/transactions").send(body());
    const res = await request(app).delete(`/api/transactions/${id}`);
    expect(res.status).toBe(404);
    expect(res.body).toEqual({ error: expect.any(String) });
    expect((await request(app).get("/api/transactions?month=2026-10")).body).toHaveLength(1);
  });

  it("PUT answers 404 (not 400) for an unknown id with an invalid body", async () => {
    const res = await request(newApp()).put("/api/transactions/5").send({ description: "" });
    expect(res.status).toBe(404);
  });

  it("PUT answers 400 {error} for a malformed JSON body", async () => {
    const app = newApp();
    await request(app).post("/api/transactions").send(body());
    const res = await request(app).put("/api/transactions/1").set("Content-Type", "application/json").send("{oops");
    expect(res.status).toBe(400);
    expect(res.body).toEqual({ error: expect.any(String) });
  });

  it("DELETE only removes the targeted transaction", async () => {
    const app = newApp();
    await request(app).post("/api/transactions").send(body({ description: "Keep" }));
    await request(app).post("/api/transactions").send(body({ description: "Drop" }));
    expect((await request(app).delete("/api/transactions/2")).status).toBe(204);
    const list = (await request(app).get("/api/transactions?month=2026-10")).body;
    expect(list.map((t: { description: string }) => t.description)).toEqual(["Keep"]);
  });
});

describe("month query edge cases", () => {
  it.each(["?month[]=2026-10", "?month=2026-10-01", "?month=%202026-10", "?month=26-10", "?month=2026/10"])(
    "summary answers 400 {error} for %j",
    async (query) => {
      const res = await request(newApp()).get(`/api/summary${query}`);
      expect(res.status).toBe(400);
      expect(res.body).toEqual({ error: expect.any(String) });
    },
  );

  it("transactions answers 400 for a bracketed month array", async () => {
    const res = await request(newApp()).get("/api/transactions?month[]=2026-10");
    expect(res.status).toBe(400);
  });

  it("includes Feb 29 in a leap-year February list and summary", async () => {
    const app = newApp();
    for (const date of ["2028-01-31", "2028-02-01", "2028-02-29", "2028-03-01"]) {
      await request(app).post("/api/transactions").send(body({ date }));
    }
    const list = (await request(app).get("/api/transactions?month=2028-02")).body;
    expect(list.map((t: { date: string }) => t.date)).toEqual(["2028-02-29", "2028-02-01"]);
    const summary = (await request(app).get("/api/summary?month=2028-02")).body;
    expect(summary).toMatchObject({ month: "2028-02", count: 2, totalCents: 8500 });
  });

  it("handles December/January year boundaries", async () => {
    const app = newApp();
    for (const date of ["2026-12-31", "2027-01-01"]) await request(app).post("/api/transactions").send(body({ date }));
    expect((await request(app).get("/api/transactions?month=2026-12")).body.map((t: { date: string }) => t.date)).toEqual(["2026-12-31"]);
    expect((await request(app).get("/api/summary?month=2027-01")).body.count).toBe(1);
  });
});

describe("response content types", () => {
  it.each([
    ["get", "/api/categories"],
    ["get", "/api/transactions?month=2026-10"],
    ["get", "/api/summary?month=2026-10"],
    ["get", "/api/transactions?month=bad"],
    ["delete", "/api/transactions/1"],
  ] as const)("%s %s answers JSON", async (method, path) => {
    const res = await request(newApp())[method](path);
    expect(res.headers["content-type"]).toMatch(/application\/json/);
  });

  it("unknown nested /api path and unsupported method on /api/categories answer 404 JSON", async () => {
    const app = newApp();
    for (const res of [await request(app).get("/api/transactions/1/extra"), await request(app).post("/api/categories").send({})]) {
      expect(res.status).toBe(404);
      expect(res.headers["content-type"]).toMatch(/application\/json/);
      expect(res.body).toEqual({ error: expect.any(String) });
    }
  });
});

describe("error handler", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("answers 413 {error} for a body over the JSON size limit", async () => {
    const res = await request(newApp())
      .post("/api/transactions")
      .set("Content-Type", "application/json")
      .send(JSON.stringify(body({ description: "x".repeat(200 * 1024) })));
    expect(res.status).toBe(413);
    expect(res.headers["content-type"]).toMatch(/application\/json/);
    expect(res.body).toEqual({ error: "Request body too large" });
  });

  it("answers 415 {error} for an unsupported JSON charset", async () => {
    const res = await request(newApp())
      .post("/api/transactions")
      .set("Content-Type", "application/json; charset=latin1")
      .send(JSON.stringify(body()));
    expect(res.status).toBe(415);
    expect(res.body).toEqual({ error: expect.any(String) });
  });

  it("answers 500 {error} without leaking details when the database fails", async () => {
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    const db = openDb(":memory:");
    const app = createApp(db);
    db.close();
    const res = await request(app).get("/api/transactions?month=2026-10");
    expect(res.status).toBe(500);
    expect(res.headers["content-type"]).toMatch(/application\/json/);
    expect(res.body).toEqual({ error: "Internal server error" });
    expect(errorSpy).toHaveBeenCalled();
  });

  const appThrowing = (err: unknown) => {
    const app = express();
    app.get("/boom", () => {
      throw err;
    });
    app.use(apiErrorHandler);
    return app;
  };

  it.each([
    ["a non-object error", "plain string"],
    ["an error with a 5xx status", Object.assign(new Error("upstream"), { status: 503 })],
    ["an error with a non-numeric status", Object.assign(new Error("x"), { status: "400" })],
  ])("maps %s to 500 Internal server error", async (_name, err) => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    const res = await request(appThrowing(err)).get("/boom");
    expect(res.status).toBe(500);
    expect(res.body).toEqual({ error: "Internal server error" });
  });

  it("keeps other 4xx statuses with a generic message", async () => {
    const res = await request(appThrowing(Object.assign(new Error("secret detail"), { status: 403 }))).get("/boom");
    expect(res.status).toBe(403);
    expect(res.body).toEqual({ error: "Bad request" });
  });
});
