import { useId, useState, type FormEvent } from "react";
import { ApiError, createTransaction, updateTransaction } from "./api";
import { defaultDateFor, parseAmount } from "./format";
import type { Category, Transaction, TransactionInput } from "./types";
import { useModalDialog } from "./useModalDialog";
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

type Field = "description" | "amount" | "category" | "date";
type FieldErrors = Partial<Record<Field, string>>;

interface Values {
  description: string;
  amount: string;
  category: string;
  date: string;
}

/** Same rules and messages as the server (SPEC §6). */
export const MESSAGES: Record<Field, string> = {
  description: "Description is required",
  amount: "Amount must be greater than zero",
  category: "Choose a category",
  date: "Enter a valid date",
};

const MAX_DESCRIPTION = 200;
const MAX_AMOUNT_CENTS = 100_000_000;

/** Server field names → form fields. */
const SERVER_FIELDS: Record<string, Field> = {
  description: "description",
  amountCents: "amount",
  category: "category",
  date: "date",
};

/** 4250 → "42,50" (no grouping, so `parseAmount` reads it back unchanged). */
export function centsToInput(cents: number): string {
  return (cents / 100).toFixed(2).replace(".", ",");
}

function isRealDate(date: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return false;
  const [y, m, d] = date.split("-").map(Number);
  const parsed = new Date(Date.UTC(y, m - 1, d));
  return parsed.getUTCFullYear() === y && parsed.getUTCMonth() === m - 1 && parsed.getUTCDate() === d;
}

function validate(values: Values, categories: Category[]): { errors: FieldErrors; input?: TransactionInput } {
  const errors: FieldErrors = {};
  const description = values.description.trim();
  if (description === "" || description.length > MAX_DESCRIPTION) errors.description = MESSAGES.description;
  const amountCents = parseAmount(values.amount);
  if (amountCents === null || amountCents > MAX_AMOUNT_CENTS) errors.amount = MESSAGES.amount;
  const category = categories.find((c) => c.id === values.category)?.id;
  if (category === undefined) errors.category = MESSAGES.category;
  if (!isRealDate(values.date)) errors.date = MESSAGES.date;
  if (Object.keys(errors).length > 0 || amountCents === null || category === undefined) return { errors };
  return { errors, input: { description, amountCents, category, date: values.date } };
}

function mapServerFields(fields: Record<string, string>): FieldErrors {
  const errors: FieldErrors = {};
  for (const [key, message] of Object.entries(fields)) {
    const field = SERVER_FIELDS[key];
    if (field) errors[field] = message;
  }
  return errors;
}

/** Add/edit form in a modal dialog. Mounted only while `open`, so each opening starts fresh. */
export default function ExpenseDialog(props: ExpenseDialogProps) {
  if (!props.open) return null;
  return <ExpenseForm key={props.transaction?.id ?? "new"} {...props} />;
}

function ExpenseForm({ month, transaction, categories, onClose, onSaved }: ExpenseDialogProps) {
  const ref = useModalDialog(onClose);
  const id = useId();
  const [values, setValues] = useState<Values>(() =>
    transaction
      ? {
          description: transaction.description,
          amount: centsToInput(transaction.amountCents),
          category: transaction.category,
          date: transaction.date,
        }
      : { description: "", amount: "", category: "", date: defaultDateFor(month, new Date()) },
  );
  const [errors, setErrors] = useState<FieldErrors>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const title = transaction ? "Edit expense" : "Add expense";
  const fieldId = (field: Field) => `${id}-${field}`;
  const errorId = (field: Field) => `${id}-${field}-error`;

  function update(field: Field, value: string) {
    setValues((v) => ({ ...v, [field]: value }));
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (saving) return;
    const result = validate(values, categories);
    setErrors(result.errors);
    setFormError(null);
    if (!result.input) {
      focusFirstError(result.errors);
      return;
    }
    setSaving(true);
    try {
      const saved = transaction
        ? await updateTransaction(transaction.id, result.input)
        : await createTransaction(result.input);
      onSaved(saved);
    } catch (err) {
      const serverErrors = err instanceof ApiError && err.fields ? mapServerFields(err.fields) : {};
      if (Object.keys(serverErrors).length > 0) {
        setErrors(serverErrors);
        focusFirstError(serverErrors);
      } else {
        setFormError(err instanceof Error ? err.message : "Saving failed");
      }
      setSaving(false);
    }
  }

  function focusFirstError(found: FieldErrors) {
    const field = (["description", "amount", "category", "date"] as const).find((f) => found[f]);
    if (field) document.getElementById(fieldId(field))?.focus();
  }

  function fieldProps(field: Field) {
    const error = errors[field];
    return {
      id: fieldId(field),
      name: field,
      value: values[field],
      "aria-invalid": error ? true : undefined,
      "aria-describedby": error ? errorId(field) : undefined,
    };
  }

  function errorText(field: Field) {
    const error = errors[field];
    return error ? (
      <p className="field__error" id={errorId(field)}>
        {error}
      </p>
    ) : null;
  }

  return (
    <dialog ref={ref} className="expense-dialog" aria-labelledby={`${id}-title`}>
      <form className="expense-dialog__form" onSubmit={handleSubmit} noValidate>
        <h2 className="expense-dialog__title" id={`${id}-title`}>
          {title}
        </h2>

        {formError !== null && (
          <p className="expense-dialog__alert" role="alert">
            {formError}
          </p>
        )}

        <div className="field">
          <label htmlFor={fieldId("description")}>Description</label>
          <input
            {...fieldProps("description")}
            type="text"
            maxLength={MAX_DESCRIPTION}
            autoComplete="off"
            data-autofocus
            onChange={(e) => update("description", e.target.value)}
          />
          {errorText("description")}
        </div>

        <div className="expense-dialog__row">
          <div className="field">
            <label htmlFor={fieldId("amount")}>Amount</label>
            <div className="field__amount">
              <input
                {...fieldProps("amount")}
                type="text"
                inputMode="decimal"
                autoComplete="off"
                placeholder="0,00"
                onChange={(e) => update("amount", e.target.value)}
              />
              <span className="field__suffix" aria-hidden="true">
                €
              </span>
            </div>
            {errorText("amount")}
          </div>

          <div className="field">
            <label htmlFor={fieldId("date")}>Date</label>
            <input {...fieldProps("date")} type="date" onChange={(e) => update("date", e.target.value)} />
            {errorText("date")}
          </div>
        </div>

        <div className="field">
          <label htmlFor={fieldId("category")}>Category</label>
          <select {...fieldProps("category")} onChange={(e) => update("category", e.target.value)}>
            <option value="">Choose a category</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.label}
              </option>
            ))}
          </select>
          {errorText("category")}
        </div>

        <div className="expense-dialog__actions">
          <button type="button" className="btn" onClick={onClose}>
            Cancel
          </button>
          <button type="submit" className="btn btn-primary" disabled={saving}>
            {saving ? "Saving…" : transaction ? "Save changes" : "Add expense"}
          </button>
        </div>
      </form>
    </dialog>
  );
}
