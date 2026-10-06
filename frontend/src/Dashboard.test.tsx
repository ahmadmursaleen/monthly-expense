import { act, render, screen, waitFor, within } from "@testing-library/react";
import * as api from "./api";
import App from "./App";
import type { DeleteDialogProps } from "./DeleteDialog";
import type { ExpenseDialogProps } from "./ExpenseDialog";
import type { Category, CategoryId, MonthSummary, Transaction } from "./types";

vi.mock("./api", async (importOriginal) => {
  const actual = await importOriginal<typeof import("./api")>();
  return {
    ...actual,
    getCategories: vi.fn(),
    listTransactions: vi.fn(),
    getSummary: vi.fn(),
  };
});

/** The dialog stubs render nothing; capture their props to check what the dashboard passes. */
const expenseDialogProps = vi.fn<(props: ExpenseDialogProps) => void>();
const deleteDialogProps = vi.fn<(props: DeleteDialogProps) => void>();
vi.mock("./ExpenseDialog", () => ({
  default: (props: ExpenseDialogProps) => {
    expenseDialogProps(props);
    return null;
  },
}));
vi.mock("./DeleteDialog", () => ({
  default: (props: DeleteDialogProps) => {
    deleteDialogProps(props);
    return null;
  },
}));

const categories: Category[] = [
  { id: "food", label: "Food & Groceries" },
  { id: "transport", label: "Transport" },
];

function tx(
  id: number,
  date: string,
  description: string,
  amountCents = 1000,
  category: CategoryId = "food",
): Transaction {
  return {
    id,
    description,
    amountCents,
    category,
    date,
    createdAt: `${date}T08:00:00.000Z`,
    updatedAt: `${date}T08:00:00.000Z`,
  };
}

function summaryOf(month: string, txs: Transaction[]): MonthSummary {
  return {
    month,
    totalCents: txs.reduce((sum, t) => sum + t.amountCents, 0),
    count: txs.length,
    byCategory: [],
  };
}

const october = [tx(3, "2026-10-06", "Groceries", 4250), tx(2, "2026-10-02", "Train ticket", 1990, "transport")];
const september = [tx(1, "2026-09-15", "Cinema", 1200)];
const data: Record<string, Transaction[]> = { "2026-10": october, "2026-09": september };

const listMock = vi.mocked(api.listTransactions);
const summaryMock = vi.mocked(api.getSummary);
const categoriesMock = vi.mocked(api.getCategories);

function serveData() {
  listMock.mockImplementation((month) => Promise.resolve(data[month] ?? []));
  summaryMock.mockImplementation((month) => Promise.resolve(summaryOf(month, data[month] ?? [])));
  categoriesMock.mockResolvedValue(categories);
}

function setUrl(search: string) {
  window.history.replaceState(null, "", `/${search}`);
}

const lastProps = <T,>(mock: { mock: { calls: [T][] } }): T => mock.mock.calls[mock.mock.calls.length - 1][0];

beforeEach(() => {
  vi.useFakeTimers({ toFake: ["Date"] });
  vi.setSystemTime(new Date(2026, 9, 6, 10, 30));
  listMock.mockReset();
  summaryMock.mockReset();
  categoriesMock.mockReset();
  expenseDialogProps.mockReset();
  deleteDialogProps.mockReset();
  serveData();
  setUrl("");
});

afterEach(() => {
  vi.useRealTimers();
});

async function renderLoaded() {
  render(<App />);
  await screen.findByRole("list", { name: /^Expenses in/ });
}

describe("month from the URL", () => {
  it("opens on the current month when ?month is missing and writes it to the URL", async () => {
    await renderLoaded();
    expect(screen.getByRole("heading", { level: 1, name: "October 2026" })).toBeInTheDocument();
    expect(listMock).toHaveBeenCalledWith("2026-10");
    expect(summaryMock).toHaveBeenCalledWith("2026-10");
    expect(window.location.search).toBe("?month=2026-10");
  });

  it("opens the month given in ?month", async () => {
    setUrl("?month=2026-09");
    await renderLoaded();
    expect(screen.getByRole("heading", { level: 1, name: "September 2026" })).toBeInTheDocument();
    expect(listMock).toHaveBeenCalledWith("2026-09");
    expect(screen.getByText("Cinema")).toBeInTheDocument();
  });

  it.each(["?month=2026-13", "?month=garbage", "?month=2026-1", "?month="])(
    "falls back to the current month for %s",
    async (search) => {
      setUrl(search);
      await renderLoaded();
      expect(screen.getByRole("heading", { level: 1, name: "October 2026" })).toBeInTheDocument();
      expect(listMock).toHaveBeenCalledWith("2026-10");
      expect(listMock).not.toHaveBeenCalledWith(expect.not.stringMatching(/^2026-10$/));
      expect(window.location.search).toBe("?month=2026-10");
    },
  );
});

describe("month navigation", () => {
  it("Previous, Today and Next change the month, the URL and refetch", async () => {
    await renderLoaded();
    expect(screen.getByRole("button", { name: "Today" })).toBeDisabled();

    act(() => screen.getByRole("button", { name: "Previous month" }).click());
    expect(screen.getByRole("heading", { level: 1, name: "September 2026" })).toBeInTheDocument();
    expect(window.location.search).toBe("?month=2026-09");
    expect(await screen.findByText("Cinema")).toBeInTheDocument();
    expect(screen.queryByText("Groceries")).not.toBeInTheDocument();
    expect(listMock).toHaveBeenLastCalledWith("2026-09");
    expect(summaryMock).toHaveBeenLastCalledWith("2026-09");

    act(() => screen.getByRole("button", { name: "Today" }).click());
    expect(screen.getByRole("heading", { level: 1, name: "October 2026" })).toBeInTheDocument();
    expect(await screen.findByText("Groceries")).toBeInTheDocument();

    act(() => screen.getByRole("button", { name: "Next month" }).click());
    expect(screen.getByRole("heading", { level: 1, name: "November 2026" })).toBeInTheDocument();
    expect(window.location.search).toBe("?month=2026-11");
    expect(await screen.findByText("No expenses in November 2026")).toBeInTheDocument();
    expect(listMock).toHaveBeenLastCalledWith("2026-11");
  });

  it("follows Back/Forward through the history", async () => {
    await renderLoaded();
    act(() => screen.getByRole("button", { name: "Previous month" }).click());
    await screen.findByText("Cinema");

    act(() => {
      window.history.replaceState(null, "", "/?month=2026-10");
      window.dispatchEvent(new PopStateEvent("popstate"));
    });
    expect(screen.getByRole("heading", { level: 1, name: "October 2026" })).toBeInTheDocument();
    expect(await screen.findByText("Groceries")).toBeInTheDocument();
  });
});

describe("loading and errors", () => {
  it("shows a loading skeleton until the month has loaded", async () => {
    render(<App />);
    expect(screen.getByRole("status", { name: "Loading expenses" })).toBeInTheDocument();
    expect(screen.getByTestId("summary-skeleton")).toBeInTheDocument();
    await screen.findByText("Groceries");
    expect(screen.queryByRole("status", { name: "Loading expenses" })).not.toBeInTheDocument();
    expect(screen.queryByTestId("summary-skeleton")).not.toBeInTheDocument();
  });

  it("shows an error banner with Retry, and Retry loads the month", async () => {
    listMock.mockRejectedValueOnce(new api.ApiError(0, "Can't reach the server"));
    render(<App />);
    const banner = await screen.findByRole("alert");
    expect(banner).toHaveTextContent("Can't reach the server");
    expect(screen.queryByRole("status", { name: "Loading expenses" })).not.toBeInTheDocument();

    act(() => within(banner).getByRole("button", { name: "Retry" }).click());
    expect(await screen.findByText("Groceries")).toBeInTheDocument();
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
    expect(listMock).toHaveBeenCalledTimes(2);
  });

  it("ignores a late response for a month that is no longer selected", async () => {
    let resolveOctober: (txs: Transaction[]) => void = () => {};
    listMock.mockImplementationOnce(() => new Promise((resolve) => (resolveOctober = resolve)));
    render(<App />);
    act(() => screen.getByRole("button", { name: "Previous month" }).click());
    expect(await screen.findByText("Cinema")).toBeInTheDocument();

    await act(async () => resolveOctober(october));
    expect(screen.getByText("Cinema")).toBeInTheDocument();
    expect(screen.queryByText("Groceries")).not.toBeInTheDocument();
  });
});

describe("transaction list", () => {
  it("shows the month total from the summary", async () => {
    await renderLoaded();
    expect(screen.getByRole("region", { name: "Spent this month" })).toHaveTextContent(/62,40\s€/);
  });

  it("lists rows newest first with date, description, category label and amount", async () => {
    await renderLoaded();
    const rows = within(screen.getByRole("list", { name: "Expenses in October 2026" })).getAllByRole("listitem");
    expect(rows).toHaveLength(2);
    expect(rows[0]).toHaveTextContent("06.10.2026");
    expect(rows[0]).toHaveTextContent("Groceries");
    expect(rows[0]).toHaveTextContent("Food & Groceries");
    expect(rows[0]).toHaveTextContent(/42,50\s€/);
    expect(rows[1]).toHaveTextContent("02.10.2026");
    expect(rows[1]).toHaveTextContent("Train ticket");
    expect(rows[1]).toHaveTextContent("Transport");
  });

  it("shows the empty month state with an Add button that opens the add dialog", async () => {
    setUrl("?month=2026-01");
    render(<App />);
    expect(await screen.findByText("No expenses in January 2026")).toBeInTheDocument();
    const buttons = screen.getAllByRole("button", { name: "Add expense" });
    expect(buttons).toHaveLength(2);
    act(() => buttons[1].click());
    expect(lastProps(expenseDialogProps)).toMatchObject({ open: true, transaction: null, month: "2026-01" });
  });
});

describe("dialogs", () => {
  it("Add expense opens the expense dialog with null", async () => {
    await renderLoaded();
    expect(lastProps(expenseDialogProps).open).toBe(false);
    act(() => screen.getByRole("button", { name: "Add expense" }).click());
    expect(lastProps(expenseDialogProps)).toMatchObject({
      open: true,
      transaction: null,
      month: "2026-10",
      categories,
    });
  });

  it("Edit opens the expense dialog with the row", async () => {
    await renderLoaded();
    act(() => screen.getByRole("button", { name: "Edit Train ticket" }).click());
    expect(lastProps(expenseDialogProps)).toMatchObject({ open: true, transaction: october[1] });
    expect(lastProps(deleteDialogProps).transaction).toBeNull();

    act(() => lastProps(expenseDialogProps).onClose());
    expect(lastProps(expenseDialogProps).open).toBe(false);
  });

  it("Delete opens the delete dialog with the row; onDeleted closes it and reloads", async () => {
    await renderLoaded();
    act(() => screen.getByRole("button", { name: "Delete Groceries" }).click());
    expect(lastProps(deleteDialogProps).transaction).toEqual(october[0]);
    expect(lastProps(expenseDialogProps).open).toBe(false);

    act(() => lastProps(deleteDialogProps).onDeleted());
    expect(lastProps(deleteDialogProps).transaction).toBeNull();
    await waitFor(() => expect(listMock).toHaveBeenCalledTimes(2));
  });

  it("onSaved in the viewed month closes the dialog and reloads without a notice", async () => {
    await renderLoaded();
    act(() => screen.getByRole("button", { name: "Add expense" }).click());
    act(() => lastProps(expenseDialogProps).onSaved(tx(9, "2026-10-01", "Bakery")));
    expect(lastProps(expenseDialogProps).open).toBe(false);
    await waitFor(() => expect(summaryMock).toHaveBeenCalledTimes(2));
    expect(screen.queryByText(/^Saved to/)).not.toBeInTheDocument();
  });

  it("onSaved in another month notifies where it went", async () => {
    await renderLoaded();
    act(() => screen.getByRole("button", { name: "Add expense" }).click());
    act(() => lastProps(expenseDialogProps).onSaved(tx(9, "2026-09-30", "Bakery")));
    expect(await screen.findByText("Saved to September 2026")).toBeInTheDocument();
    await waitFor(() => expect(listMock).toHaveBeenCalledTimes(2));
  });
});
