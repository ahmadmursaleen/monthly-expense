import { Router, type ErrorRequestHandler, type Request, type Response } from "express";
import type { DatabaseSync } from "node:sqlite";
import { CATEGORIES, isValidMonth, validateTransactionInput } from "../domain.js";
import { createTransactionsRepo } from "../transactions.repo.js";

export const INVALID_MONTH = "Month must be in the format YYYY-MM";
export const INVALID_TRANSACTION = "Invalid transaction";
export const NOT_FOUND = "Transaction not found";

/** Parses a `:id` path parameter; null for anything but a positive decimal integer (→ 404). */
function parseId(raw: string): number | null {
  if (!/^\d+$/.test(raw)) return null;
  const id = Number(raw);
  return Number.isSafeInteger(id) && id > 0 ? id : null;
}

/** Returns the valid `?month=` value, or answers 400 and returns null. */
function requireMonth(req: Request, res: Response): string | null {
  const month = req.query.month;
  if (!isValidMonth(month)) {
    res.status(400).json({ error: INVALID_MONTH });
    return null;
  }
  return month;
}

/** JSON endpoints of SPEC §6 (categories, transactions, summary). */
export function createApiRouter(db: DatabaseSync): Router {
  const repo = createTransactionsRepo(db);
  const router = Router();

  router.get("/categories", (_req, res) => {
    res.json(CATEGORIES.map(({ id, label }) => ({ id, label })));
  });

  router.get("/transactions", (req, res) => {
    const month = requireMonth(req, res);
    if (month !== null) res.json(repo.listByMonth(month));
  });

  router.post("/transactions", (req, res) => {
    const result = validateTransactionInput(req.body);
    if (!result.ok) {
      res.status(400).json({ error: INVALID_TRANSACTION, fields: result.fields });
      return;
    }
    res.status(201).json(repo.create(result.value));
  });

  router.put("/transactions/:id", (req, res) => {
    const id = parseId(req.params.id);
    if (id === null || repo.getById(id) === null) {
      res.status(404).json({ error: NOT_FOUND });
      return;
    }
    const result = validateTransactionInput(req.body);
    if (!result.ok) {
      res.status(400).json({ error: INVALID_TRANSACTION, fields: result.fields });
      return;
    }
    const updated = repo.update(id, result.value);
    if (updated === null) res.status(404).json({ error: NOT_FOUND });
    else res.json(updated);
  });

  router.delete("/transactions/:id", (req, res) => {
    const id = parseId(req.params.id);
    if (id === null || !repo.remove(id)) {
      res.status(404).json({ error: NOT_FOUND });
      return;
    }
    res.status(204).end();
  });

  router.get("/summary", (req, res) => {
    const month = requireMonth(req, res);
    if (month !== null) res.json(repo.summarizeMonth(month));
  });

  return router;
}

/** Unknown `/api/*` paths answer JSON instead of Express's HTML page. Mount after all API routers. */
export function apiNotFound(_req: Request, res: Response): void {
  res.status(404).json({ error: "Not found" });
}

/** Malformed JSON bodies (and other client errors raised by middleware) → `{error}`; anything else → 500. */
export const apiErrorHandler: ErrorRequestHandler = (err: unknown, _req, res, next) => {
  if (res.headersSent) {
    next(err);
    return;
  }
  const e = typeof err === "object" && err !== null ? (err as { status?: unknown; type?: unknown }) : {};
  const status = typeof e.status === "number" && e.status >= 400 && e.status < 500 ? e.status : 500;
  if (status === 500) console.error(err);
  const error =
    e.type === "entity.parse.failed"
      ? "Malformed JSON body"
      : status === 413
        ? "Request body too large"
        : status === 500
          ? "Internal server error"
          : "Bad request";
  res.status(status).json({ error });
};
