import express from "express";
import type { DatabaseSync } from "node:sqlite";
import { apiErrorHandler, apiNotFound, createApiRouter } from "./routes/api.js";
import { createReportRouter } from "./routes/report.js";

/** Builds the app without listening, so tests can drive it with supertest. */
export function createApp(db: DatabaseSync) {
  const app = express();
  app.use(express.json());

  app.get("/api/health", (_req, res) => {
    db.prepare("SELECT 1").get();
    res.json({ ok: true });
  });

  app.use("/api", createApiRouter(db));
  app.use("/api", createReportRouter(db));
  // Further API routers go above this line: the 404 catch-all must stay last.
  app.use("/api", apiNotFound);
  app.use(apiErrorHandler);

  return app;
}
