import "./ReportButton.css";

export interface ReportButtonProps {
  month: string;
  onError: (message: string) => void;
}

/** Downloads the month's PDF report (owned by fe-filters-report). Stub: disabled button. */
export default function ReportButton(props: ReportButtonProps) {
  void props;
  return (
    <button type="button" className="btn report-button" disabled>
      Download PDF
    </button>
  );
}
