import { describe, expect, it } from "vitest";
import express from "express";
import request from "supertest";
import { createApp } from "../app.js";
import { openDb } from "../db.js";
import { extractPdfPages } from "../testing/pdfText.js";
import { INVALID_MONTH } from "./api.js";
import { createReportRouter } from "./report.js";

const newApp = () => createApp(openDb(":memory:"));

async function addTx(app: express.Express, description: string, date: string, amountCents = 1000) {
  const res = await request(app).post("/api/transactions").send({ description, amountCents, category: "food", date });
  expect(res.status).toBe(201);
}

async function reportText(app: express.Express, path: string): Promise<string[]> {
  const res = await request(app).get(path).buffer(true).parse(binary);
  expect(res.status).toBe(200);
  return extractPdfPages(res.body as Buffer).flatMap((p) => p.text);
}

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

  it("uses the same invalid-month error message as the other endpoints", async () => {
    const res = await request(newApp()).get("/api/reports/2026-13.pdf");
    expect(res.body).toEqual({ error: INVALID_MONTH });
  });

  it("includes the first and last day of the month and excludes adjacent months", async () => {
    const app = newApp();
    await addTx(app, "Late September", "2026-09-30");
    await addTx(app, "First of October", "2026-10-01");
    await addTx(app, "Last of October", "2026-10-31");
    await addTx(app, "First of November", "2026-11-01");

    const text = await reportText(app, "/api/reports/2026-10.pdf");
    expect(text).toContain("Expense report: October 2026");
    expect(text).toContain("2 transactions");
    expect(text).toContain("Total: 20,00 €");
    expect(text.indexOf("Last of October")).toBeGreaterThanOrEqual(0);
    expect(text.indexOf("First of October")).toBeGreaterThan(text.indexOf("Last of October"));
    expect(text).not.toContain("Late September");
    expect(text).not.toContain("First of November");
  });

  it("handles the year boundary and the end of February", async () => {
    const app = newApp();
    await addTx(app, "New Year's Eve", "2026-12-31");
    await addTx(app, "New Year", "2027-01-01");
    await addTx(app, "Leap day", "2028-02-29");
    await addTx(app, "March first", "2028-03-01");

    const january = await reportText(app, "/api/reports/2027-01.pdf");
    expect(january).toContain("New Year");
    expect(january).not.toContain("New Year's Eve");
    expect(january).toContain("1 transaction");

    const february = await reportText(app, "/api/reports/2028-02.pdf");
    expect(february).toContain("Leap day");
    expect(february).not.toContain("March first");
  });

  it("reports the whole month even when query parameters ask for something else", async () => {
    const app = newApp();
    await addTx(app, "October item", "2026-10-06");
    await addTx(app, "September item", "2026-09-06");

    const text = await reportText(app, "/api/reports/2026-10.pdf?month=2026-09&category=transport&q=none");
    expect(text).toContain("October item");
    expect(text).not.toContain("September item");
    expect(text).toContain("1 transaction");
  });

  it("shows the empty message for a month that has no transactions while other months do", async () => {
    const app = newApp();
    await addTx(app, "October item", "2026-10-06");
    const text = await reportText(app, "/api/reports/2026-11.pdf");
    expect(text).toContain("No transactions this month.");
    expect(text).toContain("Total: 0,00 €");
    expect(text).not.toContain("October item");
  });

  it("stamps the report with the injected clock", async () => {
    const app = express();
    app.use("/api", createReportRouter(openDb(":memory:"), () => new Date(2026, 9, 6, 10, 30)));
    const text = await reportText(app, "/api/reports/2026-10.pdf");
    expect(text).toContain("Generated 06.10.2026 10:30");
  });

  it("uses the requested month in the filename", async () => {
    const res = await request(newApp()).get("/api/reports/1999-12.pdf").buffer(true).parse(binary);
    expect(res.status).toBe(200);
    expect(res.headers["content-disposition"]).toBe('attachment; filename="expenses-1999-12.pdf"');
  });
});
