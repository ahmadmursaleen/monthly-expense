import { describe, expect, it } from "vitest";
import { CATEGORIES, validateTransactionInput } from "./domain.js";
import { generateSeed, localDate } from "./seed.js";

const TODAYS = ["2026-10-06", "2026-01-01", "2026-03-31", "2024-02-29", "2026-12-31"];

describe("generateSeed", () => {
  it.each(TODAYS)("returns 40-60 valid expenses for %s", (today) => {
    const items = generateSeed(today);
    expect(items.length).toBeGreaterThanOrEqual(40);
    expect(items.length).toBeLessThanOrEqual(60);
    for (const item of items) {
      expect(validateTransactionInput(item)).toEqual({ ok: true, value: item });
    }
  });

  it("covers the current month and the 2 previous ones, never after today", () => {
    const items = generateSeed("2026-10-06");
    expect(new Set(items.map((t) => t.date.slice(0, 7)))).toEqual(new Set(["2026-08", "2026-09", "2026-10"]));
    expect(items.every((t) => t.date >= "2026-08-01" && t.date <= "2026-10-06")).toBe(true);
  });

  it("crosses the year boundary in January", () => {
    const items = generateSeed("2026-01-01");
    expect(new Set(items.map((t) => t.date.slice(0, 7)))).toEqual(new Set(["2025-11", "2025-12", "2026-01"]));
    expect(items.filter((t) => t.date.startsWith("2026-01")).every((t) => t.date === "2026-01-01")).toBe(true);
  });

  it("uses every category in every month", () => {
    const items = generateSeed("2026-10-06");
    for (const month of ["2026-08", "2026-09", "2026-10"]) {
      const used = new Set(items.filter((t) => t.date.startsWith(month)).map((t) => t.category));
      expect(used).toEqual(new Set(CATEGORIES.map((c) => c.id)));
    }
  });

  it("is deterministic for the same day and sorted by date", () => {
    const items = generateSeed("2026-10-06");
    expect(generateSeed("2026-10-06")).toEqual(items);
    expect(items.map((t) => t.date)).toEqual([...items.map((t) => t.date)].sort());
  });

  it("rejects an invalid date", () => {
    expect(() => generateSeed("2026-02-30")).toThrow("Invalid date");
  });

  it.each(["", "2026-10", "06.10.2026", "2026-13-01", "2025-02-29"])("rejects malformed today %j", (today) => {
    expect(() => generateSeed(today)).toThrow("Invalid date");
  });

  it("holds every acceptance property for every day of a leap and a non-leap year", () => {
    const allCategories = new Set(CATEGORIES.map((c) => c.id));
    for (const year of [2024, 2026]) {
      for (let d = new Date(Date.UTC(year, 0, 1)); d.getUTCFullYear() === year; d.setUTCDate(d.getUTCDate() + 1)) {
        const today = d.toISOString().slice(0, 10);
        const items = generateSeed(today);
        const [y, m] = today.split("-").map(Number);
        const months = [2, 1, 0].map((back) => {
          const index = y * 12 + (m - 1) - back;
          return `${Math.floor(index / 12)}-${String((index % 12) + 1).padStart(2, "0")}`;
        });

        expect(items.length, today).toBeGreaterThanOrEqual(40);
        expect(items.length, today).toBeLessThanOrEqual(60);
        expect(new Set(items.map((t) => t.date.slice(0, 7))), today).toEqual(new Set(months));
        for (const month of months) {
          const used = new Set(items.filter((t) => t.date.startsWith(month)).map((t) => t.category));
          expect(used, `${today} ${month}`).toEqual(allCategories);
        }
        for (const item of items) {
          expect(item.date <= today, `${today}: ${item.date}`).toBe(true);
          expect(validateTransactionInput(item).ok, `${today}: ${JSON.stringify(item)}`).toBe(true);
        }
      }
    }
  });
});

describe("localDate", () => {
  it("formats the local calendar date", () => {
    expect(localDate(new Date(2026, 0, 5, 23, 59))).toBe("2026-01-05");
  });
});
