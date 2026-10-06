import "./ErrorBanner.css";

export interface ErrorBannerProps {
  message: string;
  onRetry: () => void;
}

/** A failed load, with a Retry button. */
export default function ErrorBanner({ message, onRetry }: ErrorBannerProps) {
  return (
    <div className="error-banner" role="alert">
      <p className="error-banner__text">
        <strong>Couldn't load this month.</strong> {message}
      </p>
      <button type="button" className="btn" onClick={onRetry}>
        Retry
      </button>
    </div>
  );
}
