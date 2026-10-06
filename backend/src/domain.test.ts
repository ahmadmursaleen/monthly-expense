import { describe, expect, it } from "vitest";
import { CATEGORIES, isValidDate, isValidMonth, monthBounds, validateTransactionInput } from "./domain.js";

const valid = { description: "Groceries", amountCents: 4250, category: "food", date: "2026-10-06" };

describe("CATEGORIES", () => {
  it("lists the SPEC §5 ids and labels in order", () => {
    expect(CATEGORIES.map((c) => [c.id, c.label])).toEqual([
      ["food", "Food & Groceries"],
      ["transport", "Transport"],
      ["housing", "Housing"],
      ["utilities", "Utilities"],
      ["health", "Health"],
      ["entertainment", "Entertainment"],
      ["shopping", "Shopping"],
      ["other", "Other"],
    ]);
  });
});

describe("validateTransactionInput", () => {
  it("accepts a valid body and trims the description", () => {
    expect(validateTransactionInput({ ...valid, description: "  Groceries  " })).toEqual({
      ok: true,
      value: valid,
    });
  });

  it("drops unknown properties", () => {
    const res = validateTransactionInput({ ...valid, id: 99, createdAt: "x" });
    expect(res).toEqual({ ok: true, value: valid });
  });

  it.each([
    ["missing", undefined],
    ["empty", ""],
    ["whitespace-only", "   \t\n "],
    ["201 chars", "a".repeat(201)],
    ["not a string", 42],
  ])("rejects a %s description", (_, description) => {
    expect(validateTransactionInput({ ...valid, description })).toEqual({
      ok: false,
      fields: { description: "Description is required" },
    });
  });

  it("accepts a 200-char description (after trimming)", () => {
    const res = validateTransactionInput({ ...valid, description: ` ${"a".repeat(200)} ` });
    expect(res.ok).toBe(true);
  });

  it.each([
    ["zero", 0],
    ["negative", -100],
    ["non-integer", 42.5],
    ["above the maximum", 100_000_001],
    ["a numeric string", "4250"],
    ["NaN", Number.NaN],
    ["Infinity", Number.POSITIVE_INFINITY],
    ["missing", undefined],
  ])("rejects an amount that is %s", (_, amountCents) => {
    expect(validateTransactionInput({ ...valid, amountCents })).toEqual({
      ok: false,
      fields: { amountCents: "Amount must be greater than zero" },
    });
  });

  it("accepts the boundary amounts 1 and 100 000 000", () => {
    expect(validateTransactionInput({ ...valid, amountCents: 1 }).ok).toBe(true);
    expect(validateTransactionInput({ ...valid, amountCents: 100_000_000 }).ok).toBe(true);
  });

  it.each([["unknown", "groceries"], ["wrong case", "Food"], ["missing", undefined], ["not a string", 1]])(
    "rejects a %s category",
    (_, category) => {
      expect(validateTransactionInput({ ...valid, category })).toEqual({
        ok: false,
        fields: { category: "Choose a category" },
      });
    },
  );

  it.each([
    ["2026-02-30"],
    ["2025-02-29"],
    ["2026-13-01"],
    ["2026-00-10"],
    ["2026-10-00"],
    ["2026-10-32"],
    ["06.10.2026"],
    ["2026-1-6"],
    ["2026-10-06T00:00:00Z"],
    [""],
    [20261006],
    [undefined],
  ])("rejects the date %j", (date) => {
    expect(validateTransactionInput({ ...valid, date })).toEqual({
      ok: false,
      fields: { date: "Enter a valid date" },
    });
  });

  it("accepts 29 February in a leap year", () => {
    expect(validateTransactionInput({ ...valid, date: "2028-02-29" }).ok).toBe(true);
  });

  it("reports every invalid field at once", () => {
    expect(validateTransactionInput({})).toEqual({
      ok: false,
      fields: {
        description: "Description is required",
        amountCents: "Amount must be greater than zero",
        category: "Choose a category",
        date: "Enter a valid date",
      },
    });
  });

  it.each([[null], [undefined], ["text"], [[]]])("treats a non-object body %j as all fields missing", (body) => {
    const res = validateTransactionInput(body);
    expect(res.ok).toBe(false);
    if (!res.ok) expect(Object.keys(res.fields).sort()).toEqual(["amountCents", "category", "date", "description"]);
  });
});

describe("isValidDate", () => {
  it("accepts real dates", () => {
    expect(isValidDate("2026-10-06")).toBe(true);
    expect(isValidDate("2026-12-31")).toBe(true);
  });
  it("rejects impossible dates", () => {
    expect(isValidDate("2026-04-31")).toBe(false);
  });
});

describe("isValidMonth", () => {
  it.each(["2026-01", "2026-10", "2026-12"])("accepts %s", (m) => expect(isValidMonth(m)).toBe(true));
  it.each(["2026-00", "2026-13", "2026-1", "2026-10-01", "202610", "", "Oct 2026"])("rejects %j", (m) =>
    expect(isValidMonth(m)).toBe(false),
  );
  it("rejects non-strings", () => {
    expect(isValidMonth(202610)).toBe(false);
    expect(isValidMonth(undefined)).toBe(false);
  });
});

describe("monthBounds", () => {
  it("returns the first and last day of the month", () => {
    expect(monthBounds("2026-10")).toEqual({ first: "2026-10-01", last: "2026-10-31" });
    expect(monthBounds("2026-09")).toEqual({ first: "2026-09-01", last: "2026-09-30" });
    expect(monthBounds("2026-12")).toEqual({ first: "2026-12-01", last: "2026-12-31" });
  });
  it("handles February in leap and common years", () => {
    expect(monthBounds("2028-02").last).toBe("2028-02-29");
    expect(monthBounds("2026-02").last).toBe("2026-02-28");
  });
  it("throws on an invalid month", () => {
    expect(() => monthBounds("2026-13")).toThrow();
  });
});
