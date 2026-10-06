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

it("accepts a description of exactly 200 characters and rejects 201", async () => {
  vi.mocked(createTransaction).mockResolvedValue(row);
  setup();
  fill({ description: "x".repeat(201), amount: "5", category: "food", date: "2026-10-03" });
  submit();
  expect(screen.getByText("Description is required")).toBeInTheDocument();
  expect(createTransaction).not.toHaveBeenCalled();

  fill({ description: `  ${"y".repeat(200)}  ` });
  submit();
  expect(screen.queryByText("Description is required")).not.toBeInTheDocument();
  expect(createTransaction).toHaveBeenCalledWith(expect.objectContaining({ description: "y".repeat(200) }));
});

it("limits the description input to 200 characters", () => {
  setup();
  expect(field("Description")).toHaveAttribute("maxLength", "200");
});

it.each([
  ["0,01", 1],
  ["1000000", 100_000_000],
  ["42.50", 4250],
  ["42,5", 4250],
])("accepts the amount %s as %i cents", (amount, cents) => {
  vi.mocked(createTransaction).mockResolvedValue(row);
  setup();
  fill({ description: "Bus", amount, category: "transport", date: "2026-10-03" });
  submit();
  expect(screen.queryByText("Amount must be greater than zero")).not.toBeInTheDocument();
  expect(createTransaction).toHaveBeenCalledWith(expect.objectContaining({ amountCents: cents }));
});

it.each(["", "   ", "1e3", "0,00", "1.234.56"])("rejects the amount %j", (amount) => {
  setup();
  fill({ description: "Bus", amount, category: "transport" });
  submit();
  expect(screen.getByText("Amount must be greater than zero")).toBeInTheDocument();
  expect(createTransaction).not.toHaveBeenCalled();
});

it.each(["2026-13-01", "2026-10-1", "06.10.2026", "2025-02-29"])("rejects the date %s", (date) => {
  setup();
  fill({ description: "Bus", amount: "5", category: "transport", date });
  submit();
  expect(screen.getByText("Enter a valid date")).toBeInTheDocument();
  expect(createTransaction).not.toHaveBeenCalled();
});

it("accepts 29 February in a leap year", () => {
  vi.mocked(createTransaction).mockResolvedValue(row);
  setup();
  fill({ description: "Bus", amount: "5", category: "transport", date: "2028-02-29" });
  submit();
  expect(createTransaction).toHaveBeenCalledWith(expect.objectContaining({ date: "2028-02-29" }));
});

it("rejects a category that is not one of the given categories", () => {
  setup({ transaction: row, categories: [{ id: "transport", label: "Transport" }] });
  fireEvent.click(screen.getByRole("button", { name: "Save changes" }));
  expect(screen.getByText("Choose a category", { selector: "p" })).toBeInTheDocument();
  expect(updateTransaction).not.toHaveBeenCalled();
});

it("shows only the failing field's message and focuses that field", () => {
  setup();
  fill({ description: "Bus", amount: "abc", category: "transport", date: "2026-10-03" });
  submit();
  expect(screen.getByText("Amount must be greater than zero")).toBeInTheDocument();
  expect(screen.queryByText("Description is required")).not.toBeInTheDocument();
  expect(screen.queryByText("Enter a valid date")).not.toBeInTheDocument();
  expect(screen.queryByText("Choose a category", { selector: "p" })).not.toBeInTheDocument();
  expect(field("Description")).not.toHaveAttribute("aria-invalid");
  expect(field("Amount")).toHaveFocus();
});

/** Records the field's invalid state and accessible description at the moment it receives focus. */
function captureOnFocus(input: HTMLElement) {
  const seen: { invalid: string | null; description: string }[] = [];
  input.addEventListener("focus", () => {
    const ids = input.getAttribute("aria-describedby") ?? "";
    const description = ids
      .split(" ")
      .map((id) => document.getElementById(id)?.textContent ?? "")
      .join(" ")
      .trim();
    seen.push({ invalid: input.getAttribute("aria-invalid"), description });
  });
  return seen;
}

it("links the error to the field before focusing it (client validation)", () => {
  setup();
  fill({ description: "Bus", amount: "abc", category: "transport", date: "2026-10-03" });
  const seen = captureOnFocus(field("Amount"));
  submit();
  expect(field("Amount")).toHaveFocus();
  expect(seen).toEqual([{ invalid: "true", description: "Amount must be greater than zero" }]);
});

it("links the error to the field before focusing it (server 400 fields)", async () => {
  vi.mocked(createTransaction).mockRejectedValue(
    new ApiError(400, "Invalid transaction", { amountCents: "Amount must be greater than zero" }),
  );
  setup();
  fill({ description: "Bus", amount: "5", category: "transport", date: "2026-10-03" });
  const seen = captureOnFocus(field("Amount"));
  submit();
  await vi.waitFor(() => expect(field("Amount")).toHaveFocus());
  expect(seen).toEqual([{ invalid: "true", description: "Amount must be greater than zero" }]);
});

it("clears validation messages once the input is fixed and resubmitted", () => {
  vi.mocked(createTransaction).mockReturnValue(new Promise(() => {}));
  setup();
  fill({ description: "Bus", amount: "0", category: "transport", date: "2026-10-03" });
  submit();
  expect(screen.getByText("Amount must be greater than zero")).toBeInTheDocument();
  fill({ amount: "2,80" });
  submit();
  expect(screen.queryByText("Amount must be greater than zero")).not.toBeInTheDocument();
  expect(field("Amount")).not.toHaveAttribute("aria-invalid");
  expect(createTransaction).toHaveBeenCalledTimes(1);
});

it("submits only once while saving", () => {
  vi.mocked(createTransaction).mockReturnValue(new Promise(() => {}));
  setup();
  fill({ description: "Bus", amount: "5", category: "transport", date: "2026-10-03" });
  const form = field("Description").form;
  submit();
  if (form) fireEvent.submit(form);
  if (form) fireEvent.submit(form);
  expect(createTransaction).toHaveBeenCalledTimes(1);
});

it("submits on Enter in a field (form submit)", () => {
  vi.mocked(createTransaction).mockReturnValue(new Promise(() => {}));
  setup();
  fill({ description: "Bus", amount: "5", category: "transport", date: "2026-10-03" });
  const form = field("Description").form;
  if (form) fireEvent.submit(form);
  expect(createTransaction).toHaveBeenCalledTimes(1);
});

it("maps server 400 description and category errors and focuses the first one", async () => {
  vi.mocked(updateTransaction).mockRejectedValue(
    new ApiError(400, "Invalid transaction", {
      category: "Choose a category",
      description: "Description is required",
    }),
  );
  const { props } = setup({ transaction: row });
  fireEvent.click(screen.getByRole("button", { name: "Save changes" }));

  expect(await screen.findByText("Description is required")).toBeInTheDocument();
  expect(field("Category")).toHaveAccessibleDescription("Choose a category");
  expect(field("Description")).toHaveFocus();
  expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  expect(props.onSaved).not.toHaveBeenCalled();
});

it("shows the server message when a 400 has only unknown fields", async () => {
  vi.mocked(createTransaction).mockRejectedValue(new ApiError(400, "Invalid transaction", { foo: "bad" }));
  setup();
  fill({ description: "Bus", amount: "5", category: "transport", date: "2026-10-03" });
  submit();
  expect(await screen.findByRole("alert")).toHaveTextContent("Invalid transaction");
  expect(screen.queryByText("bad")).not.toBeInTheDocument();
  expect(field("Description")).toHaveValue("Bus");
});

it("shows the server message when a 400 has empty fields", async () => {
  vi.mocked(createTransaction).mockRejectedValue(new ApiError(400, "Invalid transaction", {}));
  setup();
  fill({ description: "Bus", amount: "5", category: "transport", date: "2026-10-03" });
  submit();
  expect(await screen.findByRole("alert")).toHaveTextContent("Invalid transaction");
  expect(screen.getByRole("button", { name: "Add expense" })).toBeEnabled();
});

it("shows a 404 on edit in the dialog and keeps the input", async () => {
  vi.mocked(updateTransaction).mockRejectedValue(new ApiError(404, "Transaction not found"));
  const { props } = setup({ transaction: row });
  fill({ description: "Changed" });
  fireEvent.click(screen.getByRole("button", { name: "Save changes" }));
  expect(await screen.findByRole("alert")).toHaveTextContent("Transaction not found");
  expect(field("Description")).toHaveValue("Changed");
  expect(screen.getByRole("button", { name: "Save changes" })).toBeEnabled();
  expect(props.onSaved).not.toHaveBeenCalled();
});

it("falls back to a generic message for a non-Error rejection", async () => {
  vi.mocked(createTransaction).mockRejectedValue("boom");
  setup();
  fill({ description: "Bus", amount: "5", category: "transport", date: "2026-10-03" });
  submit();
  expect(await screen.findByRole("alert")).toHaveTextContent("Saving failed");
});

it("clears the API error alert when resubmitting and succeeds on retry", async () => {
  vi.mocked(createTransaction)
    .mockRejectedValueOnce(new ApiError(0, "Can't reach the server"))
    .mockResolvedValueOnce(row);
  const { props } = setup();
  fill({ description: "Bus", amount: "5", category: "transport", date: "2026-10-03" });
  submit();
  expect(await screen.findByRole("alert")).toHaveTextContent("Can't reach the server");
  submit();
  expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  await vi.waitFor(() => expect(props.onSaved).toHaveBeenCalledWith(row));
  expect(createTransaction).toHaveBeenCalledTimes(2);
});

it("closes on the native cancel event (browser Escape)", () => {
  const { props } = setup();
  const event = new Event("cancel", { cancelable: true });
  screen.getByRole("dialog").dispatchEvent(event);
  expect(props.onClose).toHaveBeenCalledTimes(1);
  expect(event.defaultPrevented).toBe(true);
});

it("does not call the API when cancelled", () => {
  const { props } = setup({ transaction: row });
  fill({ description: "Changed" });
  fireEvent.click(screen.getByRole("button", { name: "Cancel" }));
  expect(props.onClose).toHaveBeenCalledTimes(1);
  expect(updateTransaction).not.toHaveBeenCalled();
  expect(props.onSaved).not.toHaveBeenCalled();
});

it("refills the form when switching to another row", () => {
  const { props, rerender } = setup({ transaction: row });
  fill({ description: "Draft" });
  rerender(<ExpenseDialog {...props} transaction={{ ...row, id: 8, description: "Bakery", amountCents: 5 }} />);
  expect(field("Description")).toHaveValue("Bakery");
  expect(field("Amount")).toHaveValue("0,05");
});

it("renders HTML in the description as plain text", () => {
  setup({ transaction: { ...row, description: "<img src=x onerror=alert(1)>" } });
  expect(field("Description")).toHaveValue("<img src=x onerror=alert(1)>");
  expect(screen.getByRole("dialog").querySelector("img")).toBeNull();
});

it("formats cents for the amount input", () => {
  expect(centsToInput(4250)).toBe("42,50");
  expect(centsToInput(5)).toBe("0,05");
  expect(centsToInput(123456)).toBe("1234,56");
});
