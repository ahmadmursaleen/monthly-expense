import { useCallback, useEffect, useState } from "react";
import { currentMonth } from "./format";

const MONTH = /^\d{4}-(0[1-9]|1[0-2])$/;

/** The `?month=YYYY-MM` of the current URL; missing or invalid → the current month. */
export function monthFromUrl(search: string = window.location.search): string {
  const month = new URLSearchParams(search).get("month");
  return month !== null && MONTH.test(month) ? month : currentMonth();
}

function urlFor(month: string): string {
  const params = new URLSearchParams(window.location.search);
  params.set("month", month);
  return `${window.location.pathname}?${params.toString()}${window.location.hash}`;
}

/**
 * The selected month, kept in the URL so reloads keep it. Changing it pushes a history entry;
 * Back/Forward update it. A missing or invalid `?month=` is replaced by the current month.
 */
export function useMonthParam(): [string, (month: string) => void] {
  const [month, setMonthState] = useState(() => monthFromUrl());

  useEffect(() => {
    const fromUrl = new URLSearchParams(window.location.search).get("month");
    if (fromUrl !== month) window.history.replaceState(window.history.state, "", urlFor(month));
    const onPopState = () => setMonthState(monthFromUrl());
    window.addEventListener("popstate", onPopState);
    return () => window.removeEventListener("popstate", onPopState);
    // Only normalizes the URL once on mount; later changes go through setMonth.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const setMonth = useCallback((next: string) => {
    window.history.pushState(window.history.state, "", urlFor(next));
    setMonthState(next);
  }, []);

  return [month, setMonth];
}
