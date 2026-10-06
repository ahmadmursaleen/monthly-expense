import { act, renderHook, waitFor } from "@testing-library/react";
import * as api from "./api";
import type { Category, MonthSummary, Transaction } from "./types";
import { useMonthData } from "./useMonthData";

vi.mock("./api", async (importOriginal) => {
  const actual = await importOriginal<typeof import("./api")>();
  return {
    ...actual,
    getCategories: vi.fn(),
    listTransactions: vi.fn(),
    getSummary: vi.fn(),
  };
});

const listMock = vi.mocked(api.listTransactions);
const summaryMock = vi.mocked(api.getSummary);
const categoriesMock = vi.mocked(api.getCategories);

const categories: Category[] = [{ id: "food", label: "Food & Groceries" }];

function tx(id: number, date: string, description: string): Transaction {
  return {
    id,
    description,
    amountCents: 1000,
    category: "food",
    date,
    createdAt: `${date}T08:00:00.000Z`,
    updatedAt: `${date}T08:00:00.000Z`,
  };
}

function summaryOf(month: string, txs: Transaction[]): MonthSummary {
  return { month, totalCents: txs.length * 1000, count: txs.length, byCategory: [] };
}

const october = [tx(2, "2026-10-05", "Bakery"), tx(1, "2026-10-01", "Bus pass")];
const september = [tx(3, "2026-09-12", "Museum")];
const data: Record<string, Transaction[]> = { "2026-10": october, "2026-09": september };

function deferred<T>() {
  let resolve: (value: T) => void = () => {};
  let reject: (reason: unknown) => void = () => {};
  const promise = new Promise<T>((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
}

beforeEach(() => {
  listMock.mockReset();
  summaryMock.mockReset();
  categoriesMock.mockReset();
  listMock.mockImplementation((month) => Promise.resolve(data[month] ?? []));
  summaryMock.mockImplementation((month) => Promise.resolve(summaryOf(month, data[month] ?? [])));
  categoriesMock.mockResolvedValue(categories);
});

it("starts loading with no data, then returns transactions, summary and categories", async () => {
  const { result } = renderHook(() => useMonthData("2026-10"));
  expect(result.current.loading).toBe(true);
  expect(result.current.error).toBeNull();
  expect(result.current.transactions).toEqual([]);
  expect(result.current.summary).toBeNull();
  expect(result.current.categories).toEqual([]);

  await waitFor(() => expect(result.current.loading).toBe(false));
  expect(result.current.transactions).toEqual(october);
  expect(result.current.summary).toEqual(summaryOf("2026-10", october));
  expect(result.current.categories).toEqual(categories);
  expect(result.current.error).toBeNull();
  expect(listMock).toHaveBeenCalledWith("2026-10");
  expect(summaryMock).toHaveBeenCalledWith("2026-10");
  expect(categoriesMock).toHaveBeenCalledTimes(1);
});

it("keeps the previous data visible while reloading the same month", async () => {
  const { result } = renderHook(() => useMonthData("2026-10"));
  await waitFor(() => expect(result.current.loading).toBe(false));

  const pending = deferred<Transaction[]>();
  listMock.mockImplementationOnce(() => pending.promise);
  act(() => result.current.reload());

  expect(result.current.loading).toBe(true);
  expect(result.current.transactions).toEqual(october);
  expect(result.current.summary).toEqual(summaryOf("2026-10", october));
  expect(result.current.categories).toEqual(categories);

  const updated = [tx(4, "2026-10-06", "Cafe"), ...october];
  await act(async () => pending.resolve(updated));
  expect(result.current.loading).toBe(false);
  expect(result.current.transactions).toEqual(updated);
  expect(listMock).toHaveBeenCalledTimes(2);
});

it("keeps the data and reports the error when a reload fails", async () => {
  const { result } = renderHook(() => useMonthData("2026-10"));
  await waitFor(() => expect(result.current.loading).toBe(false));

  summaryMock.mockRejectedValueOnce(new api.ApiError(500, "Server error"));
  act(() => result.current.reload());
  await waitFor(() => expect(result.current.loading).toBe(false));

  expect(result.current.error).toBe("Server error");
  expect(result.current.transactions).toEqual(october);
  expect(result.current.summary).toEqual(summaryOf("2026-10", october));
});

it("reports a failed first load with no data and stops loading", async () => {
  categoriesMock.mockRejectedValueOnce(new api.ApiError(0, "Can't reach the server"));
  const { result } = renderHook(() => useMonthData("2026-10"));
  await waitFor(() => expect(result.current.loading).toBe(false));
  expect(result.current.error).toBe("Can't reach the server");
  expect(result.current.transactions).toEqual([]);
  expect(result.current.summary).toBeNull();
});

it("turns a non-Error rejection into a string message", async () => {
  listMock.mockRejectedValueOnce("boom");
  const { result } = renderHook(() => useMonthData("2026-10"));
  await waitFor(() => expect(result.current.error).toBe("boom"));
});

it("clears the error while retrying and after a successful retry", async () => {
  listMock.mockRejectedValueOnce(new Error("offline"));
  const { result } = renderHook(() => useMonthData("2026-10"));
  await waitFor(() => expect(result.current.error).toBe("offline"));

  const pending = deferred<Transaction[]>();
  listMock.mockImplementationOnce(() => pending.promise);
  act(() => result.current.reload());
  expect(result.current.loading).toBe(true);
  expect(result.current.error).toBeNull();

  await act(async () => pending.resolve(october));
  expect(result.current.error).toBeNull();
  expect(result.current.transactions).toEqual(october);
});

it("does not show the previous month's data after switching months, but keeps the categories", async () => {
  const { result, rerender } = renderHook(({ month }) => useMonthData(month), {
    initialProps: { month: "2026-10" },
  });
  await waitFor(() => expect(result.current.loading).toBe(false));

  const pending = deferred<Transaction[]>();
  listMock.mockImplementationOnce(() => pending.promise);
  rerender({ month: "2026-09" });

  expect(result.current.loading).toBe(true);
  expect(result.current.transactions).toEqual([]);
  expect(result.current.summary).toBeNull();
  expect(result.current.categories).toEqual(categories);

  await act(async () => pending.resolve(september));
  expect(result.current.transactions).toEqual(september);
  expect(result.current.summary?.month).toBe("2026-09");
});

it("does not carry an error over to a newly selected month", async () => {
  listMock.mockRejectedValueOnce(new Error("offline"));
  const { result, rerender } = renderHook(({ month }) => useMonthData(month), {
    initialProps: { month: "2026-10" },
  });
  await waitFor(() => expect(result.current.error).toBe("offline"));

  rerender({ month: "2026-09" });
  expect(result.current.error).toBeNull();
  await waitFor(() => expect(result.current.loading).toBe(false));
  expect(result.current.transactions).toEqual(september);
});

it("ignores a late response for a month that is no longer selected", async () => {
  const lateOctober = deferred<Transaction[]>();
  listMock.mockImplementationOnce(() => lateOctober.promise);
  const { result, rerender } = renderHook(({ month }) => useMonthData(month), {
    initialProps: { month: "2026-10" },
  });

  rerender({ month: "2026-09" });
  await waitFor(() => expect(result.current.loading).toBe(false));
  expect(result.current.transactions).toEqual(september);

  await act(async () => lateOctober.resolve(october));
  expect(result.current.transactions).toEqual(september);
  expect(result.current.summary?.month).toBe("2026-09");
});

it("ignores a late failure for a month that is no longer selected", async () => {
  const lateOctober = deferred<Transaction[]>();
  listMock.mockImplementationOnce(() => lateOctober.promise);
  const { result, rerender } = renderHook(({ month }) => useMonthData(month), {
    initialProps: { month: "2026-10" },
  });

  rerender({ month: "2026-09" });
  await waitFor(() => expect(result.current.loading).toBe(false));

  await act(async () => lateOctober.reject(new Error("too late")));
  expect(result.current.error).toBeNull();
  expect(result.current.transactions).toEqual(september);
});

it("ignores a superseded reload that resolves after the newer one", async () => {
  const { result } = renderHook(() => useMonthData("2026-10"));
  await waitFor(() => expect(result.current.loading).toBe(false));

  const first = deferred<Transaction[]>();
  const second = deferred<Transaction[]>();
  listMock.mockImplementationOnce(() => first.promise).mockImplementationOnce(() => second.promise);
  act(() => result.current.reload());
  act(() => result.current.reload());

  const newest = [tx(9, "2026-10-07", "Newest")];
  await act(async () => second.resolve(newest));
  expect(result.current.loading).toBe(false);
  expect(result.current.transactions).toEqual(newest);

  await act(async () => first.resolve([tx(8, "2026-10-03", "Stale")]));
  expect(result.current.transactions).toEqual(newest);
});

it("reports loading when returning to a month before the other month loaded (A -> B -> A)", async () => {
  const { result, rerender } = renderHook(({ month }) => useMonthData(month), {
    initialProps: { month: "2026-10" },
  });
  await waitFor(() => expect(result.current.loading).toBe(false));

  const septemberPending = deferred<Transaction[]>();
  const octoberPending = deferred<Transaction[]>();
  listMock
    .mockImplementationOnce(() => septemberPending.promise)
    .mockImplementationOnce(() => octoberPending.promise);
  rerender({ month: "2026-09" });
  rerender({ month: "2026-10" });

  expect(result.current.loading).toBe(true);
  expect(listMock).toHaveBeenCalledTimes(3);

  const refreshed = [tx(5, "2026-10-06", "Refreshed"), ...october];
  await act(async () => octoberPending.resolve(refreshed));
  expect(result.current.loading).toBe(false);
  expect(result.current.transactions).toEqual(refreshed);

  await act(async () => septemberPending.resolve(september));
  expect(result.current.transactions).toEqual(refreshed);
});

it("does not show a stale error when returning to a month that failed (A -> B -> A)", async () => {
  listMock.mockRejectedValueOnce(new Error("offline"));
  const { result, rerender } = renderHook(({ month }) => useMonthData(month), {
    initialProps: { month: "2026-10" },
  });
  await waitFor(() => expect(result.current.error).toBe("offline"));

  const septemberPending = deferred<Transaction[]>();
  const octoberPending = deferred<Transaction[]>();
  listMock
    .mockImplementationOnce(() => septemberPending.promise)
    .mockImplementationOnce(() => octoberPending.promise);
  rerender({ month: "2026-09" });
  rerender({ month: "2026-10" });

  expect(result.current.loading).toBe(true);
  expect(result.current.error).toBeNull();

  await act(async () => octoberPending.resolve(october));
  expect(result.current.loading).toBe(false);
  expect(result.current.error).toBeNull();
  expect(result.current.transactions).toEqual(october);
});

it("keeps the same reload function across renders", async () => {
  const { result } = renderHook(() => useMonthData("2026-10"));
  const reload = result.current.reload;
  await waitFor(() => expect(result.current.loading).toBe(false));
  expect(result.current.reload).toBe(reload);
});
