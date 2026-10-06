import { fireEvent, render, screen } from "@testing-library/react";
import { ApiError, deleteTransaction } from "./api";
import DeleteDialog, { type DeleteDialogProps } from "./DeleteDialog";
import type { Transaction } from "./types";

vi.mock("./api", async (importOriginal) => ({
  ...(await importOriginal<typeof import("./api")>()),
  deleteTransaction: vi.fn(),
}));

const row: Transaction = {
  id: 7,
  description: "Groceries",
  amountCents: 4250,
  category: "food",
  date: "2026-10-03",
  createdAt: "2026-10-03T08:00:00.000Z",
  updatedAt: "2026-10-03T08:00:00.000Z",
};

function setup(overrides: Partial<DeleteDialogProps> = {}) {
  const props: DeleteDialogProps = { transaction: row, onClose: vi.fn(), onDeleted: vi.fn(), ...overrides };
  const view = render(<DeleteDialog {...props} />);
  return { props, ...view };
}

beforeEach(() => {
  vi.mocked(deleteTransaction).mockReset();
});

it("renders nothing without a transaction", () => {
  setup({ transaction: null });
  expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
});

it("asks to confirm with the description and amount", () => {
  setup();
  const dialog = screen.getByRole("dialog");
  expect(dialog).toHaveAccessibleName(/^Delete “Groceries” \(42,50\s€\)\?$/);
  expect(dialog).toHaveAccessibleDescription("This can’t be undone.");
  expect(screen.getByRole("button", { name: "Cancel" })).toHaveFocus();
});

it("deletes on confirm and calls onDeleted", async () => {
  vi.mocked(deleteTransaction).mockResolvedValue();
  const { props } = setup();
  fireEvent.click(screen.getByRole("button", { name: "Delete" }));
  expect(deleteTransaction).toHaveBeenCalledWith(7);
  expect(screen.getByRole("button", { name: "Deleting…" })).toHaveAttribute("aria-disabled", "true");
  await vi.waitFor(() => expect(props.onDeleted).toHaveBeenCalledTimes(1));
  expect(props.onClose).not.toHaveBeenCalled();
});

it("keeps focus on Delete while deleting (aria-disabled, not disabled) and ignores further clicks", async () => {
  let reject!: (err: Error) => void;
  vi.mocked(deleteTransaction).mockReturnValue(new Promise((_, r) => (reject = r)));
  setup();
  const button = screen.getByRole("button", { name: "Delete" });
  expect(button).toHaveAttribute("aria-disabled", "false");
  button.focus();
  fireEvent.click(button);

  const busy = screen.getByRole("button", { name: "Deleting…" });
  expect(busy).toBeEnabled();
  expect(busy).toHaveFocus();
  fireEvent.click(busy);
  expect(deleteTransaction).toHaveBeenCalledTimes(1);

  reject(new ApiError(500, "Server error"));
  expect(await screen.findByRole("alert")).toHaveTextContent("Server error");
  const again = screen.getByRole("button", { name: "Delete" });
  expect(again).toHaveAttribute("aria-disabled", "false");
  expect(again).toHaveFocus();
});

it("cancels without deleting", () => {
  const { props } = setup();
  fireEvent.click(screen.getByRole("button", { name: "Cancel" }));
  expect(props.onClose).toHaveBeenCalledTimes(1);
  expect(deleteTransaction).not.toHaveBeenCalled();
});

it("closes on Escape", () => {
  const { props } = setup();
  fireEvent.keyDown(screen.getByRole("dialog"), { key: "Escape" });
  expect(props.onClose).toHaveBeenCalledTimes(1);
});

it("closes on the native cancel event (browser Escape)", () => {
  const { props } = setup();
  const event = new Event("cancel", { cancelable: true });
  screen.getByRole("dialog").dispatchEvent(event);
  expect(props.onClose).toHaveBeenCalledTimes(1);
  expect(event.defaultPrevented).toBe(true);
  expect(deleteTransaction).not.toHaveBeenCalled();
});

it("formats larger amounts with grouping in the question", () => {
  setup({ transaction: { ...row, description: "Rent", amountCents: 123456 } });
  expect(screen.getByRole("dialog")).toHaveAccessibleName(/^Delete “Rent” \(1\.234,56\s€\)\?$/);
});

it("renders HTML in the description as plain text", () => {
  setup({ transaction: { ...row, description: "<b>Tea</b>" } });
  const dialog = screen.getByRole("dialog");
  expect(dialog).toHaveTextContent("Delete “<b>Tea</b>”");
  expect(dialog.querySelector("b")).toBeNull();
});

it("deletes only once when Delete is clicked repeatedly", () => {
  vi.mocked(deleteTransaction).mockReturnValue(new Promise(() => {}));
  setup();
  const button = screen.getByRole("button", { name: "Delete" });
  fireEvent.click(button);
  fireEvent.click(button);
  expect(deleteTransaction).toHaveBeenCalledTimes(1);
});

it("falls back to a generic message for a non-Error rejection", async () => {
  vi.mocked(deleteTransaction).mockRejectedValue("boom");
  setup();
  fireEvent.click(screen.getByRole("button", { name: "Delete" }));
  expect(await screen.findByRole("alert")).toHaveTextContent("Deleting failed");
});

it("clears the error and succeeds on retry", async () => {
  vi.mocked(deleteTransaction)
    .mockRejectedValueOnce(new ApiError(0, "Can't reach the server"))
    .mockResolvedValueOnce();
  const { props } = setup();
  fireEvent.click(screen.getByRole("button", { name: "Delete" }));
  expect(await screen.findByRole("alert")).toHaveTextContent("Can't reach the server");
  fireEvent.click(screen.getByRole("button", { name: "Delete" }));
  expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  await vi.waitFor(() => expect(props.onDeleted).toHaveBeenCalledTimes(1));
  expect(deleteTransaction).toHaveBeenCalledTimes(2);
});

it("returns focus to the opener when it closes", () => {
  const opener = document.createElement("button");
  document.body.append(opener);
  opener.focus();
  const { props, rerender } = setup();
  expect(screen.getByRole("button", { name: "Cancel" })).toHaveFocus();
  rerender(<DeleteDialog {...props} transaction={null} />);
  expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  expect(opener).toHaveFocus();
  opener.remove();
});

it("shows the error and stays open when the delete fails", async () => {
  vi.mocked(deleteTransaction).mockRejectedValue(new ApiError(404, "Transaction not found"));
  const { props } = setup();
  fireEvent.click(screen.getByRole("button", { name: "Delete" }));
  expect(await screen.findByRole("alert")).toHaveTextContent("Transaction not found");
  expect(screen.getByRole("button", { name: "Delete" })).toBeEnabled();
  expect(props.onDeleted).not.toHaveBeenCalled();
});
