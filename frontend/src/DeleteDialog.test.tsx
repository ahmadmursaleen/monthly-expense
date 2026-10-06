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
  expect(screen.getByRole("button", { name: "Cancel" })).toHaveFocus();
});

it("deletes on confirm and calls onDeleted", async () => {
  vi.mocked(deleteTransaction).mockResolvedValue();
  const { props } = setup();
  fireEvent.click(screen.getByRole("button", { name: "Delete" }));
  expect(deleteTransaction).toHaveBeenCalledWith(7);
  expect(screen.getByRole("button", { name: "Deleting…" })).toBeDisabled();
  await vi.waitFor(() => expect(props.onDeleted).toHaveBeenCalledTimes(1));
  expect(props.onClose).not.toHaveBeenCalled();
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

it("shows the error and stays open when the delete fails", async () => {
  vi.mocked(deleteTransaction).mockRejectedValue(new ApiError(404, "Transaction not found"));
  const { props } = setup();
  fireEvent.click(screen.getByRole("button", { name: "Delete" }));
  expect(await screen.findByRole("alert")).toHaveTextContent("Transaction not found");
  expect(screen.getByRole("button", { name: "Delete" })).toBeEnabled();
  expect(props.onDeleted).not.toHaveBeenCalled();
});
