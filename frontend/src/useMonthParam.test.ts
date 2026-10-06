import { act, renderHook } from "@testing-library/react";
import { monthFromUrl, useMonthParam } from "./useMonthParam";

function setUrl(url: string) {
  window.history.replaceState(null, "", url);
}

beforeEach(() => {
  vi.useFakeTimers({ toFake: ["Date"] });
  vi.setSystemTime(new Date(2026, 9, 6, 10, 30));
  setUrl("/");
});

afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
});

describe("monthFromUrl", () => {
  it.each([
    ["?month=2026-10", "2026-10"],
    ["?month=2026-01", "2026-01"],
    ["?month=2026-12", "2026-12"],
    ["?month=1999-06", "1999-06"],
    ["?month=1000-01", "1000-01"],
    ["?month=9999-12", "9999-12"],
    ["?foo=bar&month=2026-09", "2026-09"],
    ["?month=2026-09&month=2026-03", "2026-09"],
  ])("reads a valid month from %s", (search, expected) => {
    expect(monthFromUrl(search)).toBe(expected);
  });

  it.each([
    "",
    "?",
    "?foo=bar",
    "?month=",
    "?month=2026-00",
    "?month=2026-13",
    "?month=2026-1",
    "?month=26-10",
    "?month=2026-10-01",
    "?month=2026/10",
    "?month=%202026-10",
    "?month=2026-10%20",
    "?Month=2026-09",
    "?month=abcd-ef",
    // Years below 1000 would be mis-rendered (Date.UTC maps 0-99 to 1900-1999).
    "?month=0000-01",
    "?month=0050-06",
    "?month=0999-12",
  ])("falls back to the current month for %j", (search) => {
    expect(monthFromUrl(search)).toBe("2026-10");
  });

  it("uses the real current month, not a hard-coded one", () => {
    vi.setSystemTime(new Date(2027, 0, 1, 0, 5));
    expect(monthFromUrl("?month=bad")).toBe("2027-01");
  });

  it("defaults to window.location.search", () => {
    setUrl("/?month=2025-02");
    expect(monthFromUrl()).toBe("2025-02");
  });
});

describe("useMonthParam", () => {
  it("returns the month from the URL and leaves a valid URL untouched", () => {
    setUrl("/?month=2026-09");
    const replace = vi.spyOn(window.history, "replaceState");
    const { result } = renderHook(() => useMonthParam());
    expect(result.current[0]).toBe("2026-09");
    expect(replace).not.toHaveBeenCalled();
  });

  it("writes the current month into a URL without ?month using replaceState (no new history entry)", () => {
    const lengthBefore = window.history.length;
    const push = vi.spyOn(window.history, "pushState");
    const { result } = renderHook(() => useMonthParam());
    expect(result.current[0]).toBe("2026-10");
    expect(window.location.search).toBe("?month=2026-10");
    expect(push).not.toHaveBeenCalled();
    expect(window.history.length).toBe(lengthBefore);
  });

  it("replaces an invalid ?month but keeps the other params, the path and the hash", () => {
    setUrl("/app/?foo=bar&month=2026-13&x=1#list");
    const { result } = renderHook(() => useMonthParam());
    expect(result.current[0]).toBe("2026-10");
    expect(window.location.pathname).toBe("/app/");
    expect(window.location.hash).toBe("#list");
    const params = new URLSearchParams(window.location.search);
    expect(params.get("month")).toBe("2026-10");
    expect(params.get("foo")).toBe("bar");
    expect(params.get("x")).toBe("1");
    expect(params.getAll("month")).toHaveLength(1);
  });

  it("setMonth pushes a history entry and keeps a single month param plus the other params", () => {
    setUrl("/?foo=bar&month=2026-10#top");
    const push = vi.spyOn(window.history, "pushState");
    const { result } = renderHook(() => useMonthParam());

    act(() => result.current[1]("2026-09"));

    expect(result.current[0]).toBe("2026-09");
    expect(push).toHaveBeenCalledTimes(1);
    const params = new URLSearchParams(window.location.search);
    expect(params.getAll("month")).toEqual(["2026-09"]);
    expect(params.get("foo")).toBe("bar");
    expect(window.location.hash).toBe("#top");
  });

  it("collapses duplicate month params into one when the month changes", () => {
    setUrl("/?month=2026-09&month=2026-03");
    const { result } = renderHook(() => useMonthParam());
    expect(result.current[0]).toBe("2026-09");

    act(() => result.current[1]("2026-08"));
    expect(new URLSearchParams(window.location.search).getAll("month")).toEqual(["2026-08"]);
  });

  it("follows popstate, and falls back to the current month when the popped URL is invalid", () => {
    setUrl("/?month=2026-09");
    const { result } = renderHook(() => useMonthParam());

    act(() => {
      setUrl("/?month=2025-12");
      window.dispatchEvent(new PopStateEvent("popstate"));
    });
    expect(result.current[0]).toBe("2025-12");

    act(() => {
      setUrl("/?month=nope");
      window.dispatchEvent(new PopStateEvent("popstate"));
    });
    expect(result.current[0]).toBe("2026-10");
  });

  it("stops listening to popstate after unmount", () => {
    const remove = vi.spyOn(window, "removeEventListener");
    const { unmount } = renderHook(() => useMonthParam());
    unmount();
    expect(remove).toHaveBeenCalledWith("popstate", expect.any(Function));
  });

  it("keeps the same setMonth function across renders", () => {
    const { result, rerender } = renderHook(() => useMonthParam());
    const first = result.current[1];
    rerender();
    expect(result.current[1]).toBe(first);
  });
});
