/** Fictitious demo data (SPEC S1). Pure: the same `today` always yields the same expenses. */
import { CATEGORIES, isValidDate, monthBounds, type CategoryId, type TransactionInput } from "./domain.js";

/** Number of months covered: the month of `today` and the ones before it. */
export const SEED_MONTHS = 3;

type Template = readonly [description: string, minCents: number, maxCents: number];

const TEMPLATES: Record<CategoryId, readonly Template[]> = {
  food: [
    ["Weekly groceries", 4500, 12000],
    ["Bakery", 300, 1200],
    ["Farmers market", 1500, 4000],
    ["Lunch with colleagues", 1200, 3500],
  ],
  transport: [
    ["Train ticket", 800, 4500],
    ["Fuel", 4000, 8000],
    ["Bike repair", 1500, 6000],
    ["Taxi ride", 1200, 3500],
  ],
  housing: [
    ["Rent", 95000, 95000],
    ["Home insurance", 2500, 2500],
    ["Hardware store", 800, 5000],
  ],
  utilities: [
    ["Electricity bill", 6000, 9500],
    ["Internet & phone", 4500, 4500],
    ["Water bill", 2000, 3500],
  ],
  health: [
    ["Pharmacy", 500, 3000],
    ["Dentist check-up", 6000, 12000],
    ["Gym membership", 3500, 3500],
  ],
  entertainment: [
    ["Cinema tickets", 1800, 3200],
    ["Streaming subscription", 1299, 1299],
    ["Concert", 3500, 9000],
    ["Board game", 2500, 6000],
  ],
  shopping: [
    ["Running shoes", 6000, 14000],
    ["Books", 1500, 4500],
    ["Kitchen supplies", 1000, 4000],
    ["Birthday present", 2000, 7000],
  ],
  other: [
    ["Haircut", 2000, 4000],
    ["Charity donation", 1000, 5000],
    ["Post office", 300, 1500],
  ],
};

/** Small deterministic PRNG (mulberry32), seeded from `today` so a reseed on the same day is identical. */
function createRandom(seedText: string): () => number {
  let state = 0;
  for (const ch of seedText) state = (Math.imul(state, 31) + ch.charCodeAt(0)) | 0;
  return () => {
    state = (state + 0x6d2b79f5) | 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** `YYYY-MM` of `month` shifted back by `back` months. */
function previousMonth(month: string, back: number): string {
  const [year, mon] = month.split("-").map(Number);
  const index = year * 12 + (mon - 1) - back;
  return `${Math.floor(index / 12)}-${String((index % 12) + 1).padStart(2, "0")}`;
}

/**
 * 42–54 expenses over the month of `today` (`YYYY-MM-DD`) and the {@link SEED_MONTHS} − 1 months before it.
 * Every month uses every category; dates in the current month never lie after `today`.
 */
export function generateSeed(today: string): TransactionInput[] {
  if (!isValidDate(today)) throw new Error(`Invalid date: ${today}`);
  const random = createRandom(today);
  const pick = <T>(items: readonly T[]): T => items[Math.floor(random() * items.length)];
  const between = (min: number, max: number): number => min + Math.floor(random() * (max - min + 1));

  const currentMonth = today.slice(0, 7);
  const items: TransactionInput[] = [];

  for (let back = SEED_MONTHS - 1; back >= 0; back--) {
    const month = previousMonth(currentMonth, back);
    const lastDay = back === 0 ? Number(today.slice(8, 10)) : Number(monthBounds(month).last.slice(8, 10));
    const categories: CategoryId[] = CATEGORIES.map((c) => c.id);
    const extra = between(6, 10);
    for (let i = 0; i < extra; i++) categories.push(pick(CATEGORIES).id);

    for (const category of categories) {
      const [description, min, max] = pick(TEMPLATES[category]);
      // Round to whole 10 cents unless the price is fixed, so amounts look like real receipts.
      const amountCents = min === max ? min : Math.max(10, Math.round(between(min, max) / 10) * 10);
      const day = String(between(1, lastDay)).padStart(2, "0");
      items.push({ description, amountCents, category, date: `${month}-${day}` });
    }
  }

  return items.sort((a, b) => a.date.localeCompare(b.date));
}

/** Local calendar date as `YYYY-MM-DD` (the user's "today", not UTC's). */
export function localDate(date: Date): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}
