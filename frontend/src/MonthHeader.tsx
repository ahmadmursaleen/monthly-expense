import { monthTitle } from "./format";
import "./MonthHeader.css";

export interface MonthHeaderProps {
  month: string;
  /** True when `month` is the current month (Today is then disabled). */
  isCurrent: boolean;
  onPrevious: () => void;
  onToday: () => void;
  onNext: () => void;
}

/** The month title and Previous / Today / Next navigation. */
export default function MonthHeader({ month, isCurrent, onPrevious, onToday, onNext }: MonthHeaderProps) {
  return (
    <header className="month-header">
      <h1 className="month-header__title">{monthTitle(month)}</h1>
      <nav className="month-header__nav" aria-label="Month">
        <button type="button" className="btn" onClick={onPrevious}>
          <span aria-hidden="true">‹</span> Previous month
        </button>
        {/* aria-disabled, not disabled: a disabled button drops keyboard focus right after it is pressed. */}
        <button
          type="button"
          className="btn"
          aria-disabled={isCurrent}
          onClick={() => {
            if (!isCurrent) onToday();
          }}
        >
          Today
        </button>
        <button type="button" className="btn" onClick={onNext}>
          Next month <span aria-hidden="true">›</span>
        </button>
      </nav>
    </header>
  );
}
