import { useState } from "react";
import { downloadReport } from "./api";
import "./ReportButton.css";

export interface ReportButtonProps {
  month: string;
  onError: (message: string) => void;
}

export const REPORT_ERROR_MESSAGE = "Couldn't generate the PDF report. Try again.";

/** Saves a blob via an object URL and a temporary link. */
function saveBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  // Revoke after the click has been handled so the download can start.
  setTimeout(() => URL.revokeObjectURL(url), 0);
}

/** Downloads the full month's PDF report. Filters never apply: the report is always the whole month. */
export default function ReportButton({ month, onError }: ReportButtonProps) {
  const [busy, setBusy] = useState(false);

  async function handleClick() {
    setBusy(true);
    try {
      const { blob } = await downloadReport(month);
      saveBlob(blob, `expenses-${month}.pdf`);
    } catch {
      onError(REPORT_ERROR_MESSAGE);
    } finally {
      setBusy(false);
    }
  }

  return (
    <button type="button" className="btn report-button" disabled={busy} aria-busy={busy} onClick={handleClick}>
      {busy ? "Generating…" : "Download PDF"}
    </button>
  );
}
