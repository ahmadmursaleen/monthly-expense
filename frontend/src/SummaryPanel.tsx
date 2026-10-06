import { formatMoney } from "./format";
import type { Category, MonthSummary } from "./types";
import "./SummaryPanel.css";

export interface SummaryPanelProps {
  /** Always the full, unfiltered month. */
  summary: MonthSummary;
  categories: Category[];
}

/** Month total and category bars (owned by fe-summary). Stub: shows the total only. */
export default function SummaryPanel({ summary }: SummaryPanelProps) {
  return (
    <section className="summary-panel" aria-labelledby="summary-title">
      <h2 id="summary-title" className="summary-panel__title">
        Spent this month
      </h2>
      <p className="summary-panel__total">{formatMoney(summary.totalCents)}</p>
    </section>
  );
}
