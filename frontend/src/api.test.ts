import {
  ApiError,
  createTransaction,
  deleteTransaction,
  downloadReport,
  getCategories,
  getSummary,
  listTransactions,
  updateTransaction,
} from "./api";
import type { MonthSummary, Transaction, TransactionInput } from "./types";

const fetchMock = vi.fn<typeof fetch>();

beforeEach(() => {
  fetchMock.mockReset();
  vi.stubGlobal("fetch", fetchMock);
});

afterEach(() => {
  vi.unstubAllGlobals();
});

function jsonResponse(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

async function caught(promise: Promise<unknown>): Promise<ApiError> {
  try {
    await promise;
  } catch (err) {
    expect(err).toBeInstanceOf(ApiError);
    return err as ApiError;
  }
  throw new Error("expected the promise to reject");
}

const tx: Transaction = {
  id: 12,
  description: "Groceries",
  amountCents: 4250,
  category: "food",
  date: "2026-10-06",
  createdAt: "2026-10-06T08:30:00.000Z",
  updatedAt: "2026-10-06T08:30:00.000Z",
};
const input: TransactionInput = {
  description: "Groceries",
  amountCents: 4250,
  category: "food",
  date: "2026-10-06",
};

describe("getCategories", () => {
  it("GETs /api/categories", async () => {
    const categories = [{ id: "food", label: "Food & Groceries" }];
    fetchMock.mockResolvedValue(jsonResponse(200, categories));
    await expect(getCategories()).resolves.toEqual(categories);
    expect(fetchMock).toHaveBeenCalledWith("/api/categories", undefined);
  });
});

describe("listTransactions", () => {
  it("GETs the month's transactions", async () => {
    fetchMock.mockResolvedValue(jsonResponse(200, [tx]));
    await expect(listTransactions("2026-10")).resolves.toEqual([tx]);
    expect(fetchMock).toHaveBeenCalledWith("/api/transactions?month=2026-10", undefined);
  });

  it("throws ApiError with the server message on 400", async () => {
    fetchMock.mockResolvedValue(jsonResponse(400, { error: "Invalid month" }));
    const err = await caught(listTransactions("2026-13"));
    expect(err.status).toBe(400);
    expect(err.message).toBe("Invalid month");
    expect(err.fields).toBeUndefined();
  });
});

describe("getSummary", () => {
  it("GETs the month summary", async () => {
    const summary: MonthSummary = {
      month: "2026-10",
      totalCents: 4250,
      count: 1,
      byCategory: [{ category: "food", totalCents: 4250, count: 1 }],
    };
    fetchMock.mockResolvedValue(jsonResponse(200, summary));
    await expect(getSummary("2026-10")).resolves.toEqual(summary);
    expect(fetchMock).toHaveBeenCalledWith("/api/summary?month=2026-10", undefined);
  });
});

describe("createTransaction", () => {
  it("POSTs JSON and returns the created transaction", async () => {
    fetchMock.mockResolvedValue(jsonResponse(201, tx));
    await expect(createTransaction(input)).resolves.toEqual(tx);
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe("/api/transactions");
    expect(init?.method).toBe("POST");
    expect(init?.headers).toEqual({ "Content-Type": "application/json" });
    expect(JSON.parse(init?.body as string)).toEqual(input);
  });

  it("throws ApiError with fields on 400", async () => {
    const fields = { amountCents: "Amount must be greater than zero", category: "Choose a category" };
    fetchMock.mockResolvedValue(jsonResponse(400, { error: "Invalid transaction", fields }));
    const err = await caught(createTransaction(input));
    expect(err.status).toBe(400);
    expect(err.message).toBe("Invalid transaction");
    expect(err.fields).toEqual(fields);
  });
});

describe("updateTransaction", () => {
  it("PUTs JSON to the transaction's URL", async () => {
    fetchMock.mockResolvedValue(jsonResponse(200, tx));
    await expect(updateTransaction(12, input)).resolves.toEqual(tx);
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe("/api/transactions/12");
    expect(init?.method).toBe("PUT");
    expect(JSON.parse(init?.body as string)).toEqual(input);
  });

  it("throws ApiError on 404", async () => {
    fetchMock.mockResolvedValue(jsonResponse(404, { error: "Transaction not found" }));
    const err = await caught(updateTransaction(99, input));
    expect(err.status).toBe(404);
    expect(err.message).toBe("Transaction not found");
  });
});

describe("deleteTransaction", () => {
  it("DELETEs and resolves on 204", async () => {
    fetchMock.mockResolvedValue(new Response(null, { status: 204 }));
    await expect(deleteTransaction(12)).resolves.toBeUndefined();
    expect(fetchMock).toHaveBeenCalledWith("/api/transactions/12", { method: "DELETE" });
  });

  it("throws ApiError on 404", async () => {
    fetchMock.mockResolvedValue(jsonResponse(404, { error: "Transaction not found" }));
    const err = await caught(deleteTransaction(99));
    expect(err.status).toBe(404);
  });
});

describe("downloadReport", () => {
  it("returns the blob and the filename from Content-Disposition", async () => {
    fetchMock.mockResolvedValue(
      new Response("%PDF-1.7", {
        status: 200,
        headers: {
          "Content-Type": "application/pdf",
          "Content-Disposition": 'attachment; filename="expenses-2026-10.pdf"',
        },
      }),
    );
    const { blob, filename } = await downloadReport("2026-10");
    expect(fetchMock).toHaveBeenCalledWith("/api/reports/2026-10.pdf", undefined);
    expect(filename).toBe("expenses-2026-10.pdf");
    expect(await blob.text()).toBe("%PDF-1.7");
  });

  it("falls back to expenses-<month>.pdf without Content-Disposition", async () => {
    fetchMock.mockResolvedValue(new Response("%PDF", { status: 200 }));
    const { filename } = await downloadReport("2026-09");
    expect(filename).toBe("expenses-2026-09.pdf");
  });

  it("throws ApiError on a 400 JSON error", async () => {
    fetchMock.mockResolvedValue(jsonResponse(400, { error: "Invalid month" }));
    const err = await caught(downloadReport("bad"));
    expect(err.status).toBe(400);
    expect(err.message).toBe("Invalid month");
  });
});

describe("error handling", () => {
  it("turns a network failure into ApiError \"Can't reach the server\"", async () => {
    fetchMock.mockRejectedValue(new TypeError("Failed to fetch"));
    const err = await caught(getCategories());
    expect(err.status).toBe(0);
    expect(err.message).toBe("Can't reach the server");
  });

  it("uses a generic message when the error body is not JSON", async () => {
    fetchMock.mockResolvedValue(new Response("Internal Server Error", { status: 500 }));
    const err = await caught(getCategories());
    expect(err.status).toBe(500);
    expect(err.message).toBe("Request failed (500)");
    expect(err.fields).toBeUndefined();
  });
});
