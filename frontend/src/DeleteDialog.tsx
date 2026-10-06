import type { Transaction } from "./types";
import "./DeleteDialog.css";

export interface DeleteDialogProps {
  /** The row to delete; null means the dialog is closed. */
  transaction: Transaction | null;
  onClose: () => void;
  /** Called after a successful delete; the dashboard closes the dialog and reloads. */
  onDeleted: () => void;
}

/** Delete confirmation dialog (owned by fe-form). Stub: renders nothing. */
export default function DeleteDialog(props: DeleteDialogProps) {
  void props;
  return null;
}
