/**
 * Keyboard focus around the delete flow with the real DeleteDialog (Dashboard.test.tsx stubs the
 * dialogs). Only the API is mocked.
 */
import { act, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import * as api from "./api";
import App from "./App";
import type { MonthSummary, Transaction } from "./types";

vi.mock("./api", async (importOriginal) => {
  const actual = await importOriginal<typeof import("./api")>();
  return {
    ...actual,
    getCategories: vi.fn(),
    listTransactions: vi.fn(),
    getSummary: vi.fn(),
    deleteTransaction: vi.fn(),
  };
});

function tx(id: number, date: string, description: string, amountCents: number): Transaction {
  return {
    id,
    description,
    amountCents,
    category: "food",
    date,
    createdAt: `${date}T08:00:00.000Z`,
    updatedAt: `${date}T08:00:00.000Z`,
  };
}

function summaryOf(txs: Transaction[]): MonthSummary {
  return { month: "2026-10", totalCents: txs.reduce((s, t) => s + t.amountCents, 0), count: txs.length, byCategory: [] };
}

const groceries = tx(3, "2026-10-06", "Groceries", 4250);
const bakery = tx(2, "2026-10-02", "Bakery", 380);

const listMock = vi.mocked(api.listTransactions);
const summaryMock = vi.mocked(api.getSummary);
const deleteMock = vi.mocked(api.deleteTransaction);

/** The fake server's rows; a successful delete removes the row so the reload no longer shows it. */
let rows: Transaction[] = [];

beforeEach(() => {
  vi.useFakeTimers({ toFake: ["Date"] });
  vi.setSystemTime(new Date(2026, 9, 6, 10, 30));
  window.history.replaceState(null, "", "/?month=2026-10");
  rows = [groceries, bakery];
  listMock.mockReset();
  summaryMock.mockReset();
  deleteMock.mockReset();
  vi.mocked(api.getCategories).mockResolvedValue([{ id: "food", label: "Food & Groceries" }]);
  listMock.mockImplementation(() => Promise.resolve([...rows]));
  summaryMock.mockImplementation(() => Promise.resolve(summaryOf(rows)));
  deleteMock.mockImplementation((id) => {
    rows = rows.filter((r) => r.id !== id);
    return Promise.resolve();
  });
});

afterEach(() => {
  vi.useRealTimers();
});

async function openDeleteFor(description: string) {
  render(<App />);
  await screen.findByText(description);
  const opener = screen.getByRole("button", { name: `Delete ${description}` });
  opener.focus();
  act(() => opener.click());
  const dialog = screen.getByRole("dialog");
  expect(within(dialog).getByRole("button", { name: "Cancel" })).toHaveFocus();
  return { opener, dialog };
}

it("moves focus to the Expenses section, not <body>, after confirming a delete", async () => {
  const { dialog } = await openDeleteFor("Groceries");

  fireEvent.click(within(dialog).getByRole("button", { name: "Delete" }));
  await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
  await waitFor(() => expect(screen.queryByText("Groceries")).not.toBeInTheDocument());

  expect(deleteMock).toHaveBeenCalledWith(3);
  expect(screen.getByText("Bakery")).toBeInTheDocument();
  expect(screen.getByRole("region", { name: "Expenses" })).toHaveFocus();
  expect(document.body).not.toHaveFocus();
});

it("moves focus to the Expenses section when the last row of the month is deleted", async () => {
  rows = [groceries];
  const { dialog } = await openDeleteFor("Groceries");

  fireEvent.click(within(dialog).getByRole("button", { name: "Delete" }));
  expect(await screen.findByText("No expenses in October 2026")).toBeInTheDocument();
  expect(screen.getByRole("region", { name: "Expenses" })).toHaveFocus();
});

it("returns focus to the row's Delete button when the delete is cancelled", async () => {
  const { opener, dialog } = await openDeleteFor("Groceries");

  fireEvent.click(within(dialog).getByRole("button", { name: "Cancel" }));
  expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  expect(opener).toHaveFocus();
  expect(screen.getByRole("region", { name: "Expenses" })).not.toHaveFocus();
  expect(deleteMock).not.toHaveBeenCalled();
  expect(listMock).toHaveBeenCalledTimes(1);
});

it("returns focus to the row's Delete button when the dialog is closed with Escape", async () => {
  const { opener, dialog } = await openDeleteFor("Bakery");

  fireEvent.keyDown(dialog, { key: "Escape" });
  expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  expect(opener).toHaveFocus();
});

it("keeps focus in the dialog when the delete fails, then cancel returns it to the row", async () => {
  deleteMock.mockRejectedValueOnce(new api.ApiError(500, "Server error"));
  const { opener, dialog } = await openDeleteFor("Groceries");

  fireEvent.click(within(dialog).getByRole("button", { name: "Delete" }));
  expect(await within(dialog).findByRole("alert")).toHaveTextContent("Server error");
  expect(screen.getByRole("region", { name: "Expenses" })).not.toHaveFocus();

  fireEvent.click(within(dialog).getByRole("button", { name: "Cancel" }));
  expect(opener).toHaveFocus();
});

it("a cancel after an earlier successful delete still returns focus to the row", async () => {
  const { dialog } = await openDeleteFor("Groceries");
  fireEvent.click(within(dialog).getByRole("button", { name: "Delete" }));
  await waitFor(() => expect(screen.queryByText("Groceries")).not.toBeInTheDocument());
  expect(screen.getByRole("region", { name: "Expenses" })).toHaveFocus();

  const opener = screen.getByRole("button", { name: "Delete Bakery" });
  opener.focus();
  act(() => opener.click());
  fireEvent.click(within(screen.getByRole("dialog")).getByRole("button", { name: "Cancel" }));
  expect(opener).toHaveFocus();
});
