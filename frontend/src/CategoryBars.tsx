import { formatMoney } from "./format";
import type { Category, CategorySummary } from "./types";
import "./CategoryBars.css";

export interface CategoryBarsProps {
  byCategory: CategorySummary[];
  categories: Category[];
  /** Month total in cents, the base for the share %. */
  totalCents: number;
}

/** Share of `part` in `total` as text: whole percent, "<1%" for tiny non-zero shares. */
export function formatShare(part: number, total: number): string {
  if (total <= 0) return "0%";
  const percent = Math.round((part / total) * 100);
  return percent === 0 && part > 0 ? "<1%" : `${percent}%`;
}

/** One horizontal bar per category, sorted by total; bar width is relative to the largest category. */
export default function CategoryBars({ byCategory, categories, totalCents }: CategoryBarsProps) {
  const labels = new Map(categories.map((c) => [c.id, c.label]));
  const rows = [...byCategory].sort((a, b) => b.totalCents - a.totalCents);
  const max = rows.length > 0 ? rows[0].totalCents : 0;

  return (
    <ul className="category-bars" aria-label="Spending by category">
      {rows.map((row) => {
        const width = max > 0 ? (row.totalCents / max) * 100 : 0;
        return (
          <li key={row.category} className="category-bars__row">
            <span className="category-bars__label">{labels.get(row.category) ?? row.category}</span>
            <span className="category-bars__amount">{formatMoney(row.totalCents)}</span>
            <span className="category-bars__share">{formatShare(row.totalCents, totalCents)}</span>
            <span className="category-bars__track" aria-hidden="true">
              <span className="category-bars__bar" data-testid="category-bar" style={{ width: `${width}%` }} />
            </span>
          </li>
        );
      })}
    </ul>
  );
}
