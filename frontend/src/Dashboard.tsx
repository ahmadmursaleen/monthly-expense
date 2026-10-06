import { useState } from "react";
import DeleteDialog from "./DeleteDialog";
import ErrorBanner from "./ErrorBanner";
import ExpenseDialog from "./ExpenseDialog";
import FilterBar from "./FilterBar";
import { applyFilters, emptyFilters, type Filters } from "./filters";
import { currentMonth, monthOf, monthTitle, shiftMonth } from "./format";
import MonthHeader from "./MonthHeader";
import { useNotify } from "./Notice";
import ReportButton from "./ReportButton";
import SummaryPanel from "./SummaryPanel";
import TransactionList from "./TransactionList";
import type { Transaction } from "./types";
import { useMonthData } from "./useMonthData";
import { useMonthParam } from "./useMonthParam";
import "./Dashboard.css";

type EditorState = { open: false } | { open: true; transaction: Transaction | null };

function isFiltered(f: Filters): boolean {
  return f.query.trim() !== "" || f.category !== "";
}

/** The page: month header, summary, toolbar, transaction list and the dialogs. */
export default function Dashboard() {
  const [month, setMonth] = useMonthParam();
  const { transactions, summary, categories, loading, error, reload } = useMonthData(month);
  const [filters, setFilters] = useState<Filters>(emptyFilters);
  const [editor, setEditor] = useState<EditorState>({ open: false });
  const [deleting, setDeleting] = useState<Transaction | null>(null);
  const notify = useNotify();

  const today = currentMonth();
  const filtered = isFiltered(filters);
  const hasData = summary !== null;

  function handleSaved(tx: Transaction) {
    setEditor({ open: false });
    reload();
    const savedMonth = monthOf(tx.date);
    if (savedMonth !== month) notify(`Saved to ${monthTitle(savedMonth)}`, "info");
  }

  function handleDeleted() {
    setDeleting(null);
    reload();
  }

  return (
    <div className="dashboard">
      <MonthHeader
        month={month}
        isCurrent={month === today}
        onPrevious={() => setMonth(shiftMonth(month, -1))}
        onToday={() => setMonth(today)}
        onNext={() => setMonth(shiftMonth(month, 1))}
      />

      <main className="dashboard__main" aria-busy={loading}>
        {error !== null && <ErrorBanner message={error} onRetry={reload} />}

        {summary !== null ? (
          <SummaryPanel summary={summary} categories={categories} />
        ) : (
          loading && <div className="skeleton skeleton--summary" data-testid="summary-skeleton" />
        )}

        <div className="dashboard__toolbar">
          <FilterBar categories={categories} filters={filters} onChange={setFilters} />
          <div className="dashboard__actions">
            <ReportButton month={month} onError={(message) => notify(message, "error")} />
            <button
              type="button"
              className="btn btn-primary"
              onClick={() => setEditor({ open: true, transaction: null })}
            >
              Add expense
            </button>
          </div>
        </div>

        {hasData ? (
          <TransactionList
            transactions={applyFilters(transactions, filters)}
            categories={categories}
            month={month}
            filtered={filtered}
            onEdit={(tx) => setEditor({ open: true, transaction: tx })}
            onDelete={setDeleting}
            onAdd={() => setEditor({ open: true, transaction: null })}
            onClearFilters={() => setFilters(emptyFilters)}
          />
        ) : (
          loading && (
            <div className="skeleton-list" role="status" aria-label="Loading expenses">
              {[0, 1, 2, 3].map((i) => (
                <div key={i} className="skeleton skeleton--row" />
              ))}
            </div>
          )
        )}
      </main>

      <ExpenseDialog
        open={editor.open}
        month={month}
        transaction={editor.open ? editor.transaction : null}
        categories={categories}
        onClose={() => setEditor({ open: false })}
        onSaved={handleSaved}
      />
      <DeleteDialog transaction={deleting} onClose={() => setDeleting(null)} onDeleted={handleDeleted} />
    </div>
  );
}
