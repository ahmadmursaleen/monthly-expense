import { fireEvent, render, screen } from "@testing-library/react";
import { useModalDialog } from "./useModalDialog";

function Probe({ onClose, autofocus = true }: { onClose: () => void; autofocus?: boolean }) {
  const ref = useModalDialog(onClose);
  return (
    <dialog ref={ref} aria-label="Probe">
      <button type="button">First</button>
      <input aria-label="Marked" data-autofocus={autofocus ? "" : undefined} />
    </dialog>
  );
}

afterEach(() => {
  vi.restoreAllMocks();
});

it("opens the dialog with the open attribute where showModal is missing (jsdom)", () => {
  render(<Probe onClose={vi.fn()} />);
  expect(screen.getByRole("dialog", { name: "Probe" })).toHaveAttribute("open");
});

it("uses showModal when available and close on unmount", () => {
  const proto = HTMLDialogElement.prototype as HTMLDialogElement & {
    showModal?: () => void;
    close?: () => void;
  };
  const originalShow = proto.showModal;
  const originalClose = proto.close;
  const showModal = vi.fn(function (this: HTMLDialogElement) {
    this.setAttribute("open", "");
  });
  const close = vi.fn(function (this: HTMLDialogElement) {
    this.removeAttribute("open");
  });
  proto.showModal = showModal;
  proto.close = close;
  try {
    const { unmount } = render(<Probe onClose={vi.fn()} />);
    expect(showModal).toHaveBeenCalledTimes(1);
    expect(screen.getByRole("dialog")).toHaveAttribute("open");
    unmount();
    expect(close).toHaveBeenCalledTimes(1);
  } finally {
    proto.showModal = originalShow;
    proto.close = originalClose;
  }
});

it("focuses the data-autofocus element on open", () => {
  render(<Probe onClose={vi.fn()} />);
  expect(screen.getByLabelText("Marked")).toHaveFocus();
});

it("falls back to the first focusable element without data-autofocus", () => {
  render(<Probe onClose={vi.fn()} autofocus={false} />);
  expect(screen.getByRole("button", { name: "First" })).toHaveFocus();
});

it("calls onClose on Escape and prevents the default", () => {
  const onClose = vi.fn();
  render(<Probe onClose={onClose} />);
  const notCancelled = fireEvent.keyDown(screen.getByRole("dialog"), { key: "Escape" });
  expect(onClose).toHaveBeenCalledTimes(1);
  expect(notCancelled).toBe(false);
});

it("ignores other keys", () => {
  const onClose = vi.fn();
  render(<Probe onClose={onClose} />);
  fireEvent.keyDown(screen.getByRole("dialog"), { key: "Enter" });
  fireEvent.keyDown(screen.getByRole("dialog"), { key: "a" });
  expect(onClose).not.toHaveBeenCalled();
});

it("handles the native cancel event by calling onClose instead of letting the browser close", () => {
  const onClose = vi.fn();
  render(<Probe onClose={onClose} />);
  const dialog = screen.getByRole("dialog");
  const event = new Event("cancel", { cancelable: true });
  dialog.dispatchEvent(event);
  expect(onClose).toHaveBeenCalledTimes(1);
  expect(event.defaultPrevented).toBe(true);
  expect(dialog).toHaveAttribute("open");
});

it("calls the latest onClose after a rerender", () => {
  const first = vi.fn();
  const second = vi.fn();
  const { rerender } = render(<Probe onClose={first} />);
  rerender(<Probe onClose={second} />);
  fireEvent.keyDown(screen.getByRole("dialog"), { key: "Escape" });
  expect(first).not.toHaveBeenCalled();
  expect(second).toHaveBeenCalledTimes(1);
});

it("returns focus to the opener on unmount", () => {
  const opener = document.createElement("button");
  document.body.append(opener);
  opener.focus();
  const { unmount } = render(<Probe onClose={vi.fn()} />);
  expect(screen.getByLabelText("Marked")).toHaveFocus();
  unmount();
  expect(opener).toHaveFocus();
  opener.remove();
});

it("does not fail when the opener was removed before closing", () => {
  const opener = document.createElement("button");
  document.body.append(opener);
  opener.focus();
  const { unmount } = render(<Probe onClose={vi.fn()} />);
  opener.remove();
  expect(() => unmount()).not.toThrow();
});

it("stops listening after unmount", () => {
  const onClose = vi.fn();
  const { container, unmount } = render(<Probe onClose={onClose} />);
  const dialog = container.querySelector("dialog");
  unmount();
  if (dialog) {
    fireEvent.keyDown(dialog, { key: "Escape" });
    dialog.dispatchEvent(new Event("cancel", { cancelable: true }));
  }
  expect(onClose).not.toHaveBeenCalled();
});
