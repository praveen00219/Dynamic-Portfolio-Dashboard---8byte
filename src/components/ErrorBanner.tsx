interface Props {
  warnings?: string[]; // non-fatal issues (e.g. "Google Finance unavailable for 3 stocks") — data still shown
  error?: Error; // fatal — no data at all is available
  onRetry?: () => void;
}

export function ErrorBanner({ warnings, error, onRetry }: Props) {
  if (error) {
    return (
      <div className="hairline flex items-center justify-between gap-4 rounded-lg bg-loss/10 p-4 text-sm">
        <div>
          <p className="font-semibold text-loss">Couldn&apos;t load the portfolio</p>
          <p className="mt-0.5 text-ink-secondary">{error.message}</p>
        </div>
        {onRetry && (
          <button
            type="button"
            onClick={onRetry}
            className="hairline shrink-0 rounded-md bg-surface px-3 py-1.5 font-medium text-ink hover:bg-plane"
          >
            Retry
          </button>
        )}
      </div>
    );
  }

  if (!warnings?.length) return null;

  return (
    <div className="hairline rounded-lg bg-warn/10 p-3 text-sm text-ink-secondary">
      {warnings.map((w) => (
        <p key={w}>⚠ {w}</p>
      ))}
    </div>
  );
}
