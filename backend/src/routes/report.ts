import { Router } from "express";
import type { DatabaseSync } from "node:sqlite";
import { isValidMonth } from "../domain.js";
import { buildReport, renderReportPdf } from "../report.js";
import { createTransactionsRepo } from "../transactions.repo.js";
import { INVALID_MONTH } from "./api.js";

/** `GET /api/reports/YYYY-MM.pdf` (SPEC §6–7). Always the whole month; query parameters are ignored. */
export function createReportRouter(db: DatabaseSync, now: () => Date = () => new Date()): Router {
  const repo = createTransactionsRepo(db);
  const router = Router();

  router.get("/reports/:file", async (req, res) => {
    const match = /^(.*)\.pdf$/.exec(req.params.file);
    const month = match?.[1];
    if (!isValidMonth(month)) {
      res.status(400).json({ error: INVALID_MONTH });
      return;
    }
    const pdf = await renderReportPdf(buildReport(month, repo.listByMonth(month), now()));
    res
      .status(200)
      .type("application/pdf")
      .set("Content-Disposition", `attachment; filename="expenses-${month}.pdf"`)
      .send(pdf);
  });

  return router;
}
