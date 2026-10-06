import CategoryBars from "./CategoryBars";
import { formatMoney } from "./format";
import type { Category, MonthSummary } from "./types";
import "./SummaryPanel.css";

export interface SummaryPanelProps {
  /** Always the full, unfiltered month. */
  summary: MonthSummary;
  categories: Category[];
}

/** Month total, number of expenses and the spending per category. */
export default function SummaryPanel({ summary, categories }: SummaryPanelProps) {
  const empty = summary.count === 0 || summary.byCategory.length === 0;
  return (
    <section className="summary-panel" aria-labelledby="summary-title">
      <div className="summary-panel__totals">
        <h2 id="summary-title" className="summary-panel__title">
          Spent this month
        </h2>
        <p className="summary-panel__total">{formatMoney(summary.totalCents)}</p>
        <p className="summary-panel__count">
          {summary.count} {summary.count === 1 ? "expense" : "expenses"}
        </p>
      </div>
      <div className="summary-panel__categories">
        {empty ? (
          <p className="summary-panel__empty">Nothing spent yet</p>
        ) : (
          <CategoryBars byCategory={summary.byCategory} categories={categories} totalCents={summary.totalCents} />
        )}
      </div>
    </section>
  );
}
