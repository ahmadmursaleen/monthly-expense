import { formatDate, formatMoney, monthTitle } from "./format";
import type { Category, Transaction } from "./types";
import "./TransactionList.css";

export interface TransactionListProps {
  /** The rows to show (already filtered by the dashboard). */
  transactions: Transaction[];
  categories: Category[];
  month: string;
  /** True when a search or category filter is active: picks the "no matches" empty state. */
  filtered: boolean;
  onEdit: (tx: Transaction) => void;
  onDelete: (tx: Transaction) => void;
  onAdd: () => void;
  onClearFilters: () => void;
}

/** Newest first: date desc, then the most recently created (highest id) first. */
function newestFirst(a: Transaction, b: Transaction): number {
  if (a.date !== b.date) return a.date < b.date ? 1 : -1;
  return b.id - a.id;
}

/** The month's expenses as ruled ledger lines, with Edit and Delete per row. */
export default function TransactionList({
  transactions,
  categories,
  month,
  filtered,
  onEdit,
  onDelete,
  onAdd,
  onClearFilters,
}: TransactionListProps) {
  if (transactions.length === 0) {
    return (
      <div className="tx-empty">
        {filtered ? (
          <>
            <p className="tx-empty__text">No expenses match your filters</p>
            <button type="button" className="btn" onClick={onClearFilters}>
              Clear filters
            </button>
          </>
        ) : (
          <>
            <p className="tx-empty__text">No expenses in {monthTitle(month)}</p>
            <button type="button" className="btn btn-primary" onClick={onAdd}>
              Add expense
            </button>
          </>
        )}
      </div>
    );
  }

  const labels = new Map(categories.map((c) => [c.id, c.label]));
  return (
    <ul className="tx-list" aria-label={`Expenses in ${monthTitle(month)}`}>
      {[...transactions].sort(newestFirst).map((tx) => (
        <li key={tx.id} className="tx-row">
          <span className="tx-row__date">{formatDate(tx.date)}</span>
          <span className="tx-row__main">
            <span className="tx-row__description">{tx.description}</span>
            <span className="tx-row__category">{labels.get(tx.category) ?? tx.category}</span>
          </span>
          <span className="tx-row__amount">{formatMoney(tx.amountCents)}</span>
          <span className="tx-row__actions">
            <button
              type="button"
              className="btn btn-quiet"
              aria-label={`Edit ${tx.description}`}
              onClick={() => onEdit(tx)}
            >
              Edit
            </button>
            <button
              type="button"
              className="btn btn-quiet tx-row__delete"
              aria-label={`Delete ${tx.description}`}
              onClick={() => onDelete(tx)}
            >
              Delete
            </button>
          </span>
        </li>
      ))}
    </ul>
  );
}
