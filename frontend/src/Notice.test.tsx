import { act, render, screen } from "@testing-library/react";
import { NOTICE_TIMEOUT_MS, NoticeProvider, useNotify, type NoticeKind } from "./Notice";

function Trigger({ message, kind }: { message: string; kind?: NoticeKind }) {
  const notify = useNotify();
  return <button onClick={() => notify(message, kind)}>notify</button>;
}

afterEach(() => {
  vi.useRealTimers();
});

it("shows info and success notices as status messages", () => {
  render(
    <NoticeProvider>
      <Trigger message="Saved to September 2026" />
    </NoticeProvider>,
  );
  act(() => screen.getByRole("button", { name: "notify" }).click());
  expect(screen.getByRole("status")).toHaveTextContent("Saved to September 2026");
  expect(screen.getByRole("status")).toHaveClass("notice--info");
});

it("shows error notices as alerts", () => {
  render(
    <NoticeProvider>
      <Trigger message="Couldn't download the PDF" kind="error" />
    </NoticeProvider>,
  );
  act(() => screen.getByRole("button", { name: "notify" }).click());
  expect(screen.getByRole("alert")).toHaveTextContent("Couldn't download the PDF");
});

it("stacks notices, dismisses one on click and the rest after the timeout", () => {
  vi.useFakeTimers();
  render(
    <NoticeProvider>
      <Trigger message="Hello" kind="success" />
    </NoticeProvider>,
  );
  act(() => screen.getByRole("button", { name: "notify" }).click());
  act(() => screen.getByRole("button", { name: "notify" }).click());
  expect(screen.getAllByRole("status")).toHaveLength(2);

  act(() => screen.getAllByRole("button", { name: "Dismiss notice" })[0].click());
  expect(screen.getAllByRole("status")).toHaveLength(1);

  act(() => vi.advanceTimersByTime(NOTICE_TIMEOUT_MS));
  expect(screen.queryByRole("status")).not.toBeInTheDocument();
});

it("useNotify throws outside a NoticeProvider", () => {
  vi.spyOn(console, "error").mockImplementation(() => {});
  expect(() => render(<Trigger message="x" />)).toThrow(/NoticeProvider/);
  vi.mocked(console.error).mockRestore();
});
