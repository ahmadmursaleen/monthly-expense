import { describe, expect, it } from "vitest";
import request from "supertest";
import { createApp } from "../app.js";
import { openDb } from "../db.js";

const newApp = () => createApp(openDb(":memory:"));

/** supertest buffers binary bodies only with an explicit parser. */
function binary(res: unknown, cb: (err: Error | null, body: unknown) => void) {
  const stream = res as NodeJS.ReadableStream; // the raw Node response, typed loosely by superagent
  const chunks: Buffer[] = [];
  stream.on("data", (c: Buffer) => chunks.push(c));
  stream.on("end", () => cb(null, Buffer.concat(chunks)));
}

describe("GET /api/reports/:month.pdf", () => {
  it("returns the month's PDF as an attachment", async () => {
    const app = newApp();
    await request(app)
      .post("/api/transactions")
      .send({ description: "Groceries", amountCents: 4250, category: "food", date: "2026-10-06" });
    const res = await request(app).get("/api/reports/2026-10.pdf").buffer(true).parse(binary);
    expect(res.status).toBe(200);
    expect(res.headers["content-type"]).toBe("application/pdf");
    expect(res.headers["content-disposition"]).toBe('attachment; filename="expenses-2026-10.pdf"');
    expect((res.body as Buffer).subarray(0, 4).toString("latin1")).toBe("%PDF");
  });

  it("answers 200 for an empty month", async () => {
    const res = await request(newApp()).get("/api/reports/2026-01.pdf").buffer(true).parse(binary);
    expect(res.status).toBe(200);
    expect((res.body as Buffer).subarray(0, 4).toString("latin1")).toBe("%PDF");
  });

  it("ignores query parameters", async () => {
    const res = await request(newApp())
      .get("/api/reports/2026-10.pdf?month=abc&category=food&q=x")
      .buffer(true)
      .parse(binary);
    expect(res.status).toBe(200);
    expect(res.headers["content-disposition"]).toBe('attachment; filename="expenses-2026-10.pdf"');
  });

  it("renders 80 transactions", async () => {
    const app = newApp();
    for (let i = 0; i < 80; i++) {
      await request(app)
        .post("/api/transactions")
        .send({ description: `Item ${i}`, amountCents: 100 + i, category: "other", date: "2026-10-10" });
    }
    const res = await request(app).get("/api/reports/2026-10.pdf").buffer(true).parse(binary);
    expect(res.status).toBe(200);
    expect((res.body as Buffer).subarray(0, 4).toString("latin1")).toBe("%PDF");
  });

  it.each(["2026-13.pdf", "abc.pdf", "abc", "2026-10", "2026-1.pdf", "2026-10.PDF", "2026-00.pdf"])(
    "answers 400 JSON for %j",
    async (file) => {
      const res = await request(newApp()).get(`/api/reports/${file}`);
      expect(res.status).toBe(400);
      expect(res.headers["content-type"]).toMatch(/application\/json/);
      expect(res.body).toEqual({ error: expect.any(String) });
    },
  );
});
