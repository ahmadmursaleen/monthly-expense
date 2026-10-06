import type { Category, Transaction } from "./types";
import "./ExpenseDialog.css";

export interface ExpenseDialogProps {
  open: boolean;
  /** The viewed month, `YYYY-MM`: sets the default date of a new expense. */
  month: string;
  /** Null to add a new expense, the row to edit it. */
  transaction: Transaction | null;
  categories: Category[];
  onClose: () => void;
  /** Called with the created/updated transaction; the dashboard closes the dialog and reloads. */
  onSaved: (tx: Transaction) => void;
}

/** Add/edit form dialog (owned by fe-form). Stub: renders nothing. */
export default function ExpenseDialog(props: ExpenseDialogProps) {
  void props;
  return null;
}
