import {
  ApiError,
  createTransaction,
  deleteTransaction,
  downloadReport,
  getCategories,
  getSummary,
  listTransactions,
  NETWORK_ERROR_MESSAGE,
  UNEXPECTED_RESPONSE_MESSAGE,
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

  it("ApiError is a real Error named ApiError", () => {
    const err = new ApiError(400, "Invalid transaction", { date: "Enter a valid date" });
    expect(err).toBeInstanceOf(Error);
    expect(err.name).toBe("ApiError");
    expect(err.status).toBe(400);
    expect(err.message).toBe("Invalid transaction");
    expect(err.fields).toEqual({ date: "Enter a valid date" });
  });

  it.each([
    ["an empty body", () => new Response(null, { status: 500 }), 500],
    ["JSON null", () => jsonResponse(500, null), 500],
    ["a JSON string", () => jsonResponse(500, "boom"), 500],
    ["an object without error", () => jsonResponse(500, { message: "boom" }), 500],
    ["an empty error string", () => jsonResponse(400, { error: "" }), 400],
    ["a non-string error", () => jsonResponse(400, { error: 42 }), 400],
  ])("uses the generic message for %s", async (_label, makeResponse, status) => {
    fetchMock.mockResolvedValue(makeResponse());
    const err = await caught(getCategories());
    expect(err.status).toBe(status);
    expect(err.message).toBe(`Request failed (${status})`);
    expect(err.fields).toBeUndefined();
  });

  it.each([
    ["502 with an empty text body (Vite proxy, backend down)", () => new Response("", { status: 502 }), 502],
    ["503 with a null body", () => new Response(null, { status: 503 }), 503],
    ["504 with a non-JSON body", () => new Response("Gateway Timeout", { status: 504 }), 504],
    ["502 with JSON lacking error", () => jsonResponse(502, { message: "bad gateway" }), 502],
  ])("uses \"Can't reach the server\" for a gateway error: %s", async (_label, makeResponse, status) => {
    fetchMock.mockResolvedValue(makeResponse());
    const err = await caught(getCategories());
    expect(err.status).toBe(status);
    expect(err.message).toBe(NETWORK_ERROR_MESSAGE);
    expect(err.fields).toBeUndefined();
  });

  it("keeps the server message for a gateway error with a JSON error", async () => {
    fetchMock.mockResolvedValue(jsonResponse(503, { error: "Maintenance in progress" }));
    const err = await caught(getCategories());
    expect(err.status).toBe(503);
    expect(err.message).toBe("Maintenance in progress");
  });

  it("throws ApiError for invalid JSON on a 2xx response", async () => {
    fetchMock.mockResolvedValue(new Response("<html>", { status: 200 }));
    const err = await caught(getCategories());
    expect(err.status).toBe(200);
    expect(err.message).toBe(UNEXPECTED_RESPONSE_MESSAGE);
    expect(err.fields).toBeUndefined();
  });

  it("throws ApiError for an empty body on a 2xx JSON call", async () => {
    fetchMock.mockResolvedValue(new Response(null, { status: 201 }));
    const err = await caught(createTransaction(input));
    expect(err.status).toBe(201);
    expect(err.message).toBe(UNEXPECTED_RESPONSE_MESSAGE);
  });

  it("throws ApiError \"Can't reach the server\" when reading the report body fails", async () => {
    const res = new Response("%PDF", { status: 200 });
    vi.spyOn(res, "blob").mockRejectedValue(new TypeError("network error"));
    fetchMock.mockResolvedValue(res);
    const err = await caught(downloadReport("2026-10"));
    expect(err.status).toBe(0);
    expect(err.message).toBe(NETWORK_ERROR_MESSAGE);
  });

  it.each([
    ["an array", ["amountCents"]],
    ["non-string values", { amountCents: 1 }],
    ["a string", "amountCents"],
    ["null", null],
  ])("ignores fields that are %s", async (_label, fields) => {
    fetchMock.mockResolvedValue(jsonResponse(400, { error: "Invalid transaction", fields }));
    const err = await caught(createTransaction(input));
    expect(err.status).toBe(400);
    expect(err.message).toBe("Invalid transaction");
    expect(err.fields).toBeUndefined();
  });
});

/** Every client function, so the shared error paths are verified for each of them. */
const allCalls: [string, () => Promise<unknown>][] = [
  ["getCategories", () => getCategories()],
  ["listTransactions", () => listTransactions("2026-10")],
  ["getSummary", () => getSummary("2026-10")],
  ["createTransaction", () => createTransaction(input)],
  ["updateTransaction", () => updateTransaction(12, input)],
  ["deleteTransaction", () => deleteTransaction(12)],
  ["downloadReport", () => downloadReport("2026-10")],
];

describe.each(allCalls)("%s error paths", (_name, call) => {
  it("throws ApiError \"Can't reach the server\" with status 0 on a network failure", async () => {
    fetchMock.mockRejectedValue(new TypeError("Failed to fetch"));
    const err = await caught(call());
    expect(err.status).toBe(0);
    expect(err.message).toBe("Can't reach the server");
    expect(err.fields).toBeUndefined();
  });

  it("throws ApiError with status, message and fields on 400", async () => {
    const fields = { description: "Description is required" };
    fetchMock.mockResolvedValue(jsonResponse(400, { error: "Validation failed", fields }));
    const err = await caught(call());
    expect(err.status).toBe(400);
    expect(err.message).toBe("Validation failed");
    expect(err.fields).toEqual(fields);
  });

  it("throws ApiError with status and message on 404", async () => {
    fetchMock.mockResolvedValue(jsonResponse(404, { error: "Not found" }));
    const err = await caught(call());
    expect(err.status).toBe(404);
    expect(err.message).toBe("Not found");
    expect(err.fields).toBeUndefined();
  });
});

describe("request URLs", () => {
  it("encodes the month in query strings and the report path", async () => {
    fetchMock.mockImplementation(() => Promise.resolve(jsonResponse(200, [])));
    await listTransactions("2026-10&x=1");
    await getSummary("2026/10");
    expect(fetchMock.mock.calls[0][0]).toBe("/api/transactions?month=2026-10%26x%3D1");
    expect(fetchMock.mock.calls[1][0]).toBe("/api/summary?month=2026%2F10");

    fetchMock.mockResolvedValue(new Response("%PDF", { status: 200 }));
    await downloadReport("../x");
    expect(fetchMock.mock.calls[2][0]).toBe("/api/reports/..%2Fx.pdf");
  });

  it("does not send a body or method for GET requests", async () => {
    fetchMock.mockResolvedValue(jsonResponse(200, []));
    await getCategories();
    expect(fetchMock.mock.calls[0][1]).toBeUndefined();
  });

  it("sends the full TransactionInput as JSON on PUT", async () => {
    fetchMock.mockResolvedValue(jsonResponse(200, tx));
    await updateTransaction(7, input);
    const [, init] = fetchMock.mock.calls[0];
    expect(init?.headers).toEqual({ "Content-Type": "application/json" });
    expect(init?.body).toBe(JSON.stringify(input));
  });
});

describe("downloadReport Content-Disposition parsing", () => {
  it.each([
    ['attachment; filename="expenses-2026-10.pdf"', "expenses-2026-10.pdf"],
    ["attachment; filename=expenses-2026-10.pdf", "expenses-2026-10.pdf"],
    ['attachment; FILENAME="report.pdf"', "report.pdf"],
    ['attachment; filename="expenses-2026-10.pdf"; size=123', "expenses-2026-10.pdf"],
    ["attachment", "expenses-2026-10.pdf"],
  ])("%j → %s", async (disposition, expected) => {
    fetchMock.mockResolvedValue(
      new Response("%PDF", { status: 200, headers: { "Content-Disposition": disposition } }),
    );
    const { filename } = await downloadReport("2026-10");
    expect(filename).toBe(expected);
  });

  it("returns the body bytes as a Blob", async () => {
    fetchMock.mockResolvedValue(
      new Response("%PDF-1.7 body", { status: 200, headers: { "Content-Type": "application/pdf" } }),
    );
    const { blob } = await downloadReport("2026-10");
    expect(blob.type).toBe("application/pdf");
    expect(await blob.text()).toBe("%PDF-1.7 body");
  });
});
