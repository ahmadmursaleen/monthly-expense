import { fireEvent, render, screen } from "@testing-library/react";
import { ApiError, createTransaction, updateTransaction } from "./api";
import ExpenseDialog, { centsToInput, type ExpenseDialogProps } from "./ExpenseDialog";
import type { Category, Transaction } from "./types";

vi.mock("./api", async (importOriginal) => ({
  ...(await importOriginal<typeof import("./api")>()),
  createTransaction: vi.fn(),
  updateTransaction: vi.fn(),
}));

const categories: Category[] = [
  { id: "food", label: "Food & Groceries" },
  { id: "transport", label: "Transport" },
];

const row: Transaction = {
  id: 7,
  description: "Groceries",
  amountCents: 4250,
  category: "food",
  date: "2026-10-03",
  createdAt: "2026-10-03T08:00:00.000Z",
  updatedAt: "2026-10-03T08:00:00.000Z",
};

function setup(overrides: Partial<ExpenseDialogProps> = {}) {
  const props: ExpenseDialogProps = {
    open: true,
    month: "2026-10",
    transaction: null,
    categories,
    onClose: vi.fn(),
    onSaved: vi.fn(),
    ...overrides,
  };
  const view = render(<ExpenseDialog {...props} />);
  return { props, ...view };
}

const field = (label: string) => screen.getByLabelText(label) as HTMLInputElement;

function fill(values: { description?: string; amount?: string; category?: string; date?: string }) {
  if (values.description !== undefined) fireEvent.change(field("Description"), { target: { value: values.description } });
  if (values.amount !== undefined) fireEvent.change(field("Amount"), { target: { value: values.amount } });
  if (values.category !== undefined) fireEvent.change(field("Category"), { target: { value: values.category } });
  if (values.date !== undefined) fireEvent.change(field("Date"), { target: { value: values.date } });
}

const submit = () => fireEvent.click(screen.getByRole("button", { name: /Add expense|Save changes/ }));

beforeEach(() => {
  vi.mocked(createTransaction).mockReset();
  vi.mocked(updateTransaction).mockReset();
});

afterEach(() => {
  vi.useRealTimers();
});

it("renders nothing while closed", () => {
  setup({ open: false });
  expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
});

it("opens an empty add form with the category placeholder and focuses the first field", () => {
  setup();
  expect(screen.getByRole("dialog", { name: "Add expense" })).toBeInTheDocument();
  expect(field("Description")).toHaveValue("");
  expect(field("Amount")).toHaveValue("");
  expect(field("Category")).toHaveValue("");
  expect(screen.getByRole("option", { name: "Choose a category" })).toBeInTheDocument();
  expect(field("Description")).toHaveFocus();
});

it("defaults the date to today in the current month", () => {
  vi.useFakeTimers({ toFake: ["Date"] });
  vi.setSystemTime(new Date(2026, 9, 6, 12));
  setup({ month: "2026-10" });
  expect(field("Date")).toHaveValue("2026-10-06");
});

it("defaults the date to the 1st of another viewed month", () => {
  vi.useFakeTimers({ toFake: ["Date"] });
  vi.setSystemTime(new Date(2026, 9, 6, 12));
  setup({ month: "2026-08" });
  expect(field("Date")).toHaveValue("2026-08-01");
});

it("shows every validation message next to its field and does not call the API", () => {
  setup();
  fill({ date: "" });
  submit();
  expect(screen.getByText("Description is required")).toBeInTheDocument();
  expect(screen.getByText("Amount must be greater than zero")).toBeInTheDocument();
  expect(screen.getByText("Choose a category", { selector: "p" })).toBeInTheDocument();
  expect(screen.getByText("Enter a valid date")).toBeInTheDocument();
  expect(field("Amount")).toHaveAttribute("aria-invalid", "true");
  expect(field("Amount")).toHaveAccessibleDescription("Amount must be greater than zero");
  expect(field("Description")).toHaveFocus();
  expect(createTransaction).not.toHaveBeenCalled();
});

it.each(["0", "-5", "abc", "1,234", "1000000,01"])("rejects the amount %s", (amount) => {
  setup();
  fill({ description: "Bus", amount, category: "transport" });
  submit();
  expect(screen.getByText("Amount must be greater than zero")).toBeInTheDocument();
  expect(createTransaction).not.toHaveBeenCalled();
});

it("treats a whitespace-only description as missing", () => {
  setup();
  fill({ description: "   ", amount: "5", category: "food" });
  submit();
  expect(screen.getByText("Description is required")).toBeInTheDocument();
});

it("rejects an impossible date", () => {
  setup();
  fill({ description: "Bus", amount: "5", category: "transport", date: "2026-02-30" });
  submit();
  expect(screen.getByText("Enter a valid date")).toBeInTheDocument();
});

it("creates with the amount in cents and a trimmed description, then calls onSaved", async () => {
  const saved = { ...row, id: 9 };
  let resolve: (tx: Transaction) => void = () => {};
  vi.mocked(createTransaction).mockReturnValue(new Promise((r) => (resolve = r)));
  const { props } = setup();
  fill({ description: "  Groceries ", amount: "1.234,56", category: "food", date: "2026-10-03" });
  submit();

  expect(createTransaction).toHaveBeenCalledWith({
    description: "Groceries",
    amountCents: 123456,
    category: "food",
    date: "2026-10-03",
  });
  const saving = screen.getByRole("button", { name: "Saving…" });
  expect(saving).toBeDisabled();

  resolve(saved);
  await vi.waitFor(() => expect(props.onSaved).toHaveBeenCalledWith(saved));
  expect(props.onClose).not.toHaveBeenCalled();
});

it("prefills an edit with the amount as 42,50 and sends a PUT", async () => {
  const updated = { ...row, amountCents: 500 };
  vi.mocked(updateTransaction).mockResolvedValue(updated);
  const { props } = setup({ transaction: row });

  expect(screen.getByRole("dialog", { name: "Edit expense" })).toBeInTheDocument();
  expect(field("Description")).toHaveValue("Groceries");
  expect(field("Amount")).toHaveValue("42,50");
  expect(field("Category")).toHaveValue("food");
  expect(field("Date")).toHaveValue("2026-10-03");

  fill({ amount: "5" });
  fireEvent.click(screen.getByRole("button", { name: "Save changes" }));
  expect(updateTransaction).toHaveBeenCalledWith(7, {
    description: "Groceries",
    amountCents: 500,
    category: "food",
    date: "2026-10-03",
  });
  expect(createTransaction).not.toHaveBeenCalled();
  await vi.waitFor(() => expect(props.onSaved).toHaveBeenCalledWith(updated));
});

it("maps server 400 fields to the same places", async () => {
  vi.mocked(createTransaction).mockRejectedValue(
    new ApiError(400, "Invalid transaction", {
      amountCents: "Amount must be greater than zero",
      date: "Enter a valid date",
    }),
  );
  const { props } = setup();
  fill({ description: "Bus", amount: "5", category: "transport", date: "2026-10-03" });
  submit();

  expect(await screen.findByText("Enter a valid date")).toBeInTheDocument();
  expect(field("Amount")).toHaveAccessibleDescription("Amount must be greater than zero");
  expect(field("Date")).toHaveAttribute("aria-invalid", "true");
  expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  expect(screen.getByRole("button", { name: "Add expense" })).toBeEnabled();
  expect(props.onSaved).not.toHaveBeenCalled();
});

it("shows other API errors in the dialog and keeps the input", async () => {
  vi.mocked(createTransaction).mockRejectedValue(new ApiError(0, "Can't reach the server"));
  const { props } = setup();
  fill({ description: "Bus", amount: "2,80", category: "transport", date: "2026-10-03" });
  submit();

  expect(await screen.findByRole("alert")).toHaveTextContent("Can't reach the server");
  expect(field("Description")).toHaveValue("Bus");
  expect(field("Amount")).toHaveValue("2,80");
  expect(field("Category")).toHaveValue("transport");
  expect(field("Date")).toHaveValue("2026-10-03");
  expect(screen.getByRole("button", { name: "Add expense" })).toBeEnabled();
  expect(props.onSaved).not.toHaveBeenCalled();
});

it("closes on Cancel and on Escape", () => {
  const { props } = setup();
  fireEvent.click(screen.getByRole("button", { name: "Cancel" }));
  expect(props.onClose).toHaveBeenCalledTimes(1);
  fireEvent.keyDown(screen.getByRole("dialog"), { key: "Escape" });
  expect(props.onClose).toHaveBeenCalledTimes(2);
});

it("returns focus to the opener when it closes", () => {
  const opener = document.createElement("button");
  document.body.append(opener);
  opener.focus();
  const { props, rerender } = setup();
  expect(field("Description")).toHaveFocus();
  rerender(<ExpenseDialog {...props} open={false} />);
  expect(opener).toHaveFocus();
  opener.remove();
});

it("starts fresh when reopened", () => {
  const { props, rerender } = setup();
  fill({ description: "Draft" });
  rerender(<ExpenseDialog {...props} open={false} />);
  rerender(<ExpenseDialog {...props} open />);
  expect(field("Description")).toHaveValue("");
});

it("formats cents for the amount input", () => {
  expect(centsToInput(4250)).toBe("42,50");
  expect(centsToInput(5)).toBe("0,05");
  expect(centsToInput(123456)).toBe("1234,56");
});
