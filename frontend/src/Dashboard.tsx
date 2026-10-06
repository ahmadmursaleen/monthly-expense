import { useEffect, useRef, useState } from "react";
import DeleteDialog from "./DeleteDialog";
import ErrorBanner from "./ErrorBanner";
import ExpenseDialog from "./ExpenseDialog";
import FilterBar from "./FilterBar";
import { applyFilters, emptyFilters, isFiltered, type Filters } from "./filters";
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

/** The page: month header, summary, toolbar, transaction list and the dialogs. */
export default function Dashboard() {
  const [month, setMonth] = useMonthParam();
  const { transactions, summary, categories, loading, error, reload } = useMonthData(month);
  const [filters, setFilters] = useState<Filters>(emptyFilters);
  const [editor, setEditor] = useState<EditorState>({ open: false });
  const [deleting, setDeleting] = useState<Transaction | null>(null);
  const focusListAfterDelete = useRef(false);
  const focusListIfLostAfterReload = useRef(false);
  const listRef = useRef<HTMLElement>(null);
  const notify = useNotify();

  const today = currentMonth();
  const filtered = isFiltered(filters);
  const hasData = summary !== null;

  function handleSaved(tx: Transaction) {
    focusListIfLostAfterReload.current = true;
    setEditor({ open: false });
    reload();
    const savedMonth = monthOf(tx.date);
    if (savedMonth !== month) notify(`Saved to ${monthTitle(savedMonth)}`, "info");
  }

  function handleDeleted() {
    focusListAfterDelete.current = true;
    setDeleting(null);
    reload();
  }

  // Retry and the empty state's Clear filters unmount themselves when pressed; move keyboard focus to
  // the list section first so it does not drop to <body>.
  function handleRetry() {
    listRef.current?.focus();
    reload();
  }

  function handleClearFilters() {
    listRef.current?.focus();
    setFilters(emptyFilters);
  }

  // The deleted row's Delete button (the dialog's opener) disappears with the reload, which would drop
  // keyboard focus to <body>. Runs after the dialog's unmount cleanup, so it overrides the focus return.
  useEffect(() => {
    if (deleting !== null || !focusListAfterDelete.current) return;
    focusListAfterDelete.current = false;
    listRef.current?.focus();
  }, [deleting]);

  // After a save the dialog returns focus to its opener, but the reload can then remove that opener (the
  // empty state's Add expense, or an edited row that moved to another month). Only if focus was lost.
  useEffect(() => {
    if (loading || !focusListIfLostAfterReload.current) return;
    focusListIfLostAfterReload.current = false;
    const active = document.activeElement;
    if (active === null || active === document.body) listRef.current?.focus();
  }, [loading]);

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
        {error !== null && <ErrorBanner message={error} onRetry={handleRetry} />}

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

        {/* Focus target when the focused control disappears (delete, Retry, Clear filters, save); not in the tab order. */}
        <section ref={listRef} className="dashboard__list" aria-label="Expenses" tabIndex={-1}>
          {hasData ? (
            <TransactionList
              transactions={applyFilters(transactions, filters)}
              categories={categories}
              month={month}
              filtered={filtered}
              onEdit={(tx) => setEditor({ open: true, transaction: tx })}
              onDelete={setDeleting}
              onAdd={() => setEditor({ open: true, transaction: null })}
              onClearFilters={handleClearFilters}
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
        </section>
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
