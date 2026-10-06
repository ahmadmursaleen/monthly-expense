import {
  currentMonth,
  defaultDateFor,
  formatDate,
  formatMoney,
  monthOf,
  monthTitle,
  parseAmount,
  shiftMonth,
  toISODate,
} from "./format";

/** Intl puts a non-breaking (or narrow no-break) space before the € sign; \s matches both. */
const normalize = (s: string) => s.replace(/\s/g, " ");

describe("formatMoney", () => {
  it.each([
    [123456, "1.234,56 €"],
    [4250, "42,50 €"],
    [0, "0,00 €"],
    [5, "0,05 €"],
    [100000000, "1.000.000,00 €"],
  ])("%i → %s", (cents, expected) => {
    expect(normalize(formatMoney(cents))).toBe(expected);
  });
});

describe("formatDate", () => {
  it.each([
    ["2026-10-06", "06.10.2026"],
    ["2026-01-31", "31.01.2026"],
  ])("%s → %s", (date, expected) => {
    expect(formatDate(date)).toBe(expected);
  });
});

describe("monthTitle", () => {
  it.each([
    ["2026-10", "October 2026"],
    ["2026-01", "January 2026"],
    ["2027-12", "December 2027"],
  ])("%s → %s", (month, expected) => {
    expect(monthTitle(month)).toBe(expected);
  });
});

describe("toISODate / currentMonth", () => {
  it.each([
    [new Date(2026, 9, 6, 10, 30), "2026-10-06", "2026-10"],
    [new Date(2026, 0, 1, 0, 0), "2026-01-01", "2026-01"],
    [new Date(2026, 11, 31, 23, 59), "2026-12-31", "2026-12"],
  ])("%s → %s / %s", (now, date, month) => {
    expect(toISODate(now)).toBe(date);
    expect(currentMonth(now)).toBe(month);
  });
});

describe("shiftMonth", () => {
  it.each([
    ["2026-10", 1, "2026-11"],
    ["2026-10", -1, "2026-09"],
    ["2026-12", 1, "2027-01"],
    ["2026-01", -1, "2025-12"],
    ["2026-10", 0, "2026-10"],
    ["2026-10", 15, "2028-01"],
    ["2026-10", -22, "2024-12"],
  ])("%s %+i → %s", (month, n, expected) => {
    expect(shiftMonth(month, n)).toBe(expected);
  });
});

describe("monthOf", () => {
  it.each([
    ["2026-10-06", "2026-10"],
    ["2025-12-31", "2025-12"],
  ])("%s → %s", (date, expected) => {
    expect(monthOf(date)).toBe(expected);
  });
});

describe("defaultDateFor", () => {
  const today = new Date(2026, 9, 6, 12, 0);
  it.each([
    ["2026-10", "2026-10-06"],
    ["2026-09", "2026-09-01"],
    ["2026-11", "2026-11-01"],
    ["2025-10", "2025-10-01"],
  ])("viewing %s → %s", (month, expected) => {
    expect(defaultDateFor(month, today)).toBe(expected);
  });
});

describe("parseAmount", () => {
  it.each([
    ["42", 4200],
    ["42,5", 4250],
    ["42,50", 4250],
    ["42.50", 4250],
    ["42.5", 4250],
    ["1.234,56", 123456],
    ["1.234.567,8", 123456780],
    ["0,01", 1],
    ["  42,50  ", 4250],
    ["1234,56", 123456],
  ])("accepts %j → %i", (text, cents) => {
    expect(parseAmount(text)).toBe(cents);
  });

  it.each([
    "",
    "   ",
    "abc",
    "0",
    "0,00",
    "-5",
    "42,505",
    "42.505",
    "42,",
    ",5",
    "1.234",
    "12.34,56",
    "1,234.56",
    "4 2",
    "42€",
    "1e3",
    "99999999999999999999",
  ])("rejects %j", (text) => {
    expect(parseAmount(text)).toBeNull();
  });
});
