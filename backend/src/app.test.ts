import { describe, expect, it } from "vitest";
import request from "supertest";
import { createApp } from "./app.js";
import { openDb } from "./db.js";

describe("GET /api/health", () => {
  it("answers ok", async () => {
    const res = await request(createApp(openDb(":memory:"))).get("/api/health");
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ ok: true });
  });
});
