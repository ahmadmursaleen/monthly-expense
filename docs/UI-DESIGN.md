# UI design

Set by `fe-shell` with the frontend-design skill. Later UI tasks follow it. Tokens live as CSS custom
properties in `frontend/src/styles.css`. Use the tokens and don't hard-code colors or sizes in components.

## Direction: the cash book

The app is a personal *Kassenbuch*: a cash book where one person writes down what they spent, a page
per month. The interface borrows from ledger paper (cool green-grey sheet, ruled lines, ink-blue
writing) and not from fintech dashboards. There are no gradient cards, no glowing accents and no
all-caps labels.

- **One loud element:** the month title. It is set large in Bricolage Grotesque, like the heading
  of a ledger page, and sits on a heavy ink rule. Everything else stays quiet.
- **Ledger, not cards:** transactions are ruled lines on a white sheet (hairline `--rule` between rows),
  not a stack of rounded cards. Only the summary and dialogs are bordered panels.
- **Numbers line up:** the whole UI uses tabular figures, and amounts are right-aligned and semibold.
- **Left-aligned** throughout. Text is in sentence case. Buttons say what they do ("Add expense",
  "Download PDF", "Retry").

## Palette

| Token | Hex | Use |
|---|---|---|
| `--paper` | `#edf1ec` | page background (ledger paper) |
| `--surface` | `#fbfcfa` | sheets: list, summary, dialogs, toasts |
| `--ink` | `#1d2a44` | text, the heavy header rule |
| `--ink-soft` / `--ink-faint` | `#4d5a70` / `#5f6a7a` | secondary text (dates, category labels) |
| `--rule` / `--rule-strong` | `#b9cdbf` / `#8fae99` | row rules, sheet and section rules (decorative, not for controls) |
| `--control-border` | `#677f6f` | borders of inputs, selects and `.btn` (4.2:1 on `--surface`, 3.8:1 on `--paper`, meets WCAG 1.4.11) |
| `--action` | `#2846b8` | primary buttons, links, focus ring, bars (`--bar`) |
| `--danger` | `#b3261e` | delete, error banner and error toasts (`--danger-tint` background; `--danger-hover` `#8f1e18`) |
| `--success` | `#2e6b45` | success toasts |

Bars use one ink (`--bar` on `--bar-track`). The category label carries the meaning, not a color, so
the bars stay readable in black and white. All text colors pass WCAG AA on `--paper` and `--surface`.

## Type

- **Display:** Bricolage Grotesque Variable (`--font-display`). Use it only for the month title
  (`--text-display`, weight 700, slightly condensed) and the month total (`--text-xl`).
- **UI:** Public Sans Variable (`--font-ui`) for everything else, with `font-variant-numeric: tabular-nums`.
- Scale: `--text-xs` 13, `--text-sm` 14, `--text-md` 16, `--text-lg` 20, `--text-xl` 32,
  `--text-display` 40–72 px (fluid). Body line-height 1.5, headings 1.1.
- Fonts are self-hosted via `@fontsource-variable/*` (imported in `main.tsx`); no external requests.

## Spacing and shape

- 4 px base: `--space-1` 4, `-2` 8, `-3` 12, `-4` 16, `-5` 24, `-6` 32, `-7` 48.
- Page max width `--page-width` (60rem), centered. Sections are 24 px apart.
- Radius: `--radius-sm` 4 px (skeletons), `--radius-md` 6 px (buttons, inputs, panels). Ledger rows: none.
- Shadow `--shadow-raised` only for floating layers (dialogs, toasts).
- **Below 720 px** (`@media (max-width: 719px)`): single column, the toolbar stacks, and buttons
  stretch to full width. List rows become two lines (description + amount, then date + actions).

## Component patterns

- **Buttons** (global classes in `styles.css`): `.btn` (outlined, default), `.btn-primary` (ink-blue
  fill, one per area: "Add expense", dialog submit), `.btn-danger` (confirm delete), `.btn-quiet`
  (text button, e.g. row Edit/Delete). Min height 40 px (32 px for quiet). A button that can become
  unavailable right after it is pressed (Today) uses `aria-disabled="true"` instead of `disabled`, so
  keyboard focus stays on it.
- **Focus after delete:** the deleted row's button disappears, so the dashboard moves focus to the
  expense list section (`tabIndex=-1`).
- **Inputs** (for `fe-form` / `fe-filters-report`): 40 px high, `--surface` background,
  `1px solid var(--control-border)` (never `--rule`/`--rule-strong`: too faint for a field boundary), `--radius-md`, a visible label above, and the error text in `--danger`
  below the field with `aria-describedby`.
- **Dialogs**: use a native `<dialog>` with `showModal()`, a `--surface` panel, `--shadow-raised`,
  max width 28rem, the title in `--text-lg`, and actions right-aligned (Cancel `.btn`, submit
  `.btn-primary` / `.btn-danger`).
- **Loading:** shimmer skeleton blocks (`.skeleton`) shaped like the content they replace.
- **Errors:** `ErrorBanner` (danger tint, Retry) for failed loads. Use `notify(message, "error")`
  toasts for failed actions (e.g. the PDF download).
- **Empty states:** one sentence plus the action that fixes it ("Add expense" / "Clear filters").
- **Motion:** only in response to the user (toast slide-in, button hover). `prefers-reduced-motion`
  turns it off.

## Component ownership

Each component has its own `.tsx` and `.css` file. A later task edits only its own files. The props
below are the contract. Don't change them without updating the dashboard and this section.

| File | Props / API | Owner |
|---|---|---|
| `Dashboard.tsx`, `MonthHeader.tsx`, `TransactionList.tsx`, `ErrorBanner.tsx`, `Notice.tsx`, `useMonthData.ts`, `useMonthParam.ts`, `styles.css` | — | `fe-shell` |
| `SummaryPanel.tsx` | `{summary: MonthSummary, categories: Category[]}`. Always the unfiltered month. | `fe-summary` |
| `FilterBar.tsx` | `{categories, filters: Filters, onChange(filters)}` | `fe-filters-report` |
| `filters.ts` | `type Filters = {query: string; category: string}`, `emptyFilters`, `applyFilters(txs, f)` | `fe-filters-report` |
| `ReportButton.tsx` | `{month: string, onError(message: string)}`. `onError` shows an error toast. | `fe-filters-report` |
| `ExpenseDialog.tsx` | `{open, month, transaction: Transaction \| null, categories, onClose(), onSaved(tx)}` | `fe-form` |
| `DeleteDialog.tsx` | `{transaction: Transaction \| null, onClose(), onDeleted()}`. Open while `transaction` is not null. | `fe-form` |

Dashboard behavior the owners can rely on:

- The dashboard keeps the filter state. The list gets `applyFilters(transactions, filters)`, and
  `filtered` is true when `query.trim()` or `category` is non-empty. "Clear filters" sets `emptyFilters`.
- "Add expense" opens `ExpenseDialog` with `transaction = null`, and a row's Edit opens it with that row.
- `onSaved(tx)` → the dashboard closes the dialog and reloads the month. If `tx.date` is in another month,
  it calls `notify("Saved to September 2026", "info")`. The dialog shouldn't close itself.
- `onDeleted()` → the dashboard closes the dialog and reloads.
- `useNotify()` from `Notice.tsx` returns `notify(message, kind)`, with kind `"info" | "success" | "error"`.
