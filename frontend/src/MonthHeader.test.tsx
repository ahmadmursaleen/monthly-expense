import { fireEvent, render, screen } from "@testing-library/react";
import MonthHeader, { type MonthHeaderProps } from "./MonthHeader";

function setup(overrides: Partial<MonthHeaderProps> = {}) {
  const props: MonthHeaderProps = {
    month: "2026-10",
    isCurrent: false,
    onPrevious: vi.fn(),
    onToday: vi.fn(),
    onNext: vi.fn(),
    ...overrides,
  };
  const view = render(<MonthHeader {...props} />);
  return { props, ...view };
}

it("shows the month title as the page heading", () => {
  setup({ month: "2026-03" });
  expect(screen.getByRole("heading", { level: 1, name: "March 2026" })).toBeInTheDocument();
});

it("calls onPrevious and onNext", () => {
  const { props } = setup();
  fireEvent.click(screen.getByRole("button", { name: "Previous month" }));
  fireEvent.click(screen.getByRole("button", { name: "Next month" }));
  expect(props.onPrevious).toHaveBeenCalledTimes(1);
  expect(props.onNext).toHaveBeenCalledTimes(1);
});

describe("Today button", () => {
  it("is enabled and calls onToday on another month", () => {
    const { props } = setup({ isCurrent: false });
    const today = screen.getByRole("button", { name: "Today" });
    expect(today).toHaveAttribute("aria-disabled", "false");
    fireEvent.click(today);
    expect(props.onToday).toHaveBeenCalledTimes(1);
  });

  it("is aria-disabled on the current month but stays focusable (no native disabled)", () => {
    setup({ isCurrent: true });
    const today = screen.getByRole("button", { name: "Today" });
    expect(today).toHaveAttribute("aria-disabled", "true");
    expect(today).not.toHaveAttribute("disabled");
    today.focus();
    expect(today).toHaveFocus();
  });

  it("ignores clicks on the current month", () => {
    const { props } = setup({ isCurrent: true });
    const today = screen.getByRole("button", { name: "Today" });
    today.focus();
    fireEvent.click(today);
    expect(props.onToday).not.toHaveBeenCalled();
    expect(today).toHaveFocus();
  });

  it("keeps focus when it becomes the current month after being pressed", () => {
    const { props, rerender } = setup({ isCurrent: false });
    const today = screen.getByRole("button", { name: "Today" });
    today.focus();
    fireEvent.click(today);
    expect(props.onToday).toHaveBeenCalledTimes(1);
    rerender(<MonthHeader {...props} isCurrent />);
    expect(today).toHaveAttribute("aria-disabled", "true");
    expect(today).toHaveFocus();
  });
});
