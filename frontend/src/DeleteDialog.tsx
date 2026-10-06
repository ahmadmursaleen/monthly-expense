import { useId, useState } from "react";
import { deleteTransaction } from "./api";
import { formatMoney } from "./format";
import type { Transaction } from "./types";
import { useModalDialog } from "./useModalDialog";
import "./DeleteDialog.css";

export interface DeleteDialogProps {
  /** The row to delete; null means the dialog is closed. */
  transaction: Transaction | null;
  onClose: () => void;
  /** Called after a successful delete; the dashboard closes the dialog and reloads. */
  onDeleted: () => void;
}

/** Delete confirmation dialog. Mounted only while a row is chosen, so each opening starts fresh. */
export default function DeleteDialog({ transaction, onClose, onDeleted }: DeleteDialogProps) {
  if (transaction === null) return null;
  return <DeleteConfirm key={transaction.id} transaction={transaction} onClose={onClose} onDeleted={onDeleted} />;
}

interface DeleteConfirmProps extends DeleteDialogProps {
  transaction: Transaction;
}

function DeleteConfirm({ transaction, onClose, onDeleted }: DeleteConfirmProps) {
  const ref = useModalDialog(onClose);
  const id = useId();
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleDelete() {
    if (deleting) return;
    setDeleting(true);
    setError(null);
    try {
      await deleteTransaction(transaction.id);
      onDeleted();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Deleting failed");
      setDeleting(false);
    }
  }

  return (
    <dialog ref={ref} className="delete-dialog" aria-labelledby={`${id}-title`} aria-describedby={`${id}-hint`}>
      <h2 className="delete-dialog__title" id={`${id}-title`}>
        Delete “{transaction.description}” ({formatMoney(transaction.amountCents)})?
      </h2>
      <p className="delete-dialog__hint" id={`${id}-hint`}>
        This can’t be undone.
      </p>

      {error !== null && (
        <p className="delete-dialog__alert" role="alert">
          {error}
        </p>
      )}

      <div className="delete-dialog__actions">
        <button type="button" className="btn" onClick={onClose} data-autofocus>
          Cancel
        </button>
        <button type="button" className="btn btn-danger" onClick={handleDelete} disabled={deleting}>
          {deleting ? "Deleting…" : "Delete"}
        </button>
      </div>
    </dialog>
  );
}
