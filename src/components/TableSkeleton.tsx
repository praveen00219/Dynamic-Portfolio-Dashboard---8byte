export function TableSkeleton() {
  return (
    <div className="hairline animate-pulse space-y-3 rounded-lg bg-surface p-4 shadow-sm">
      {Array.from({ length: 8 }).map((_, i) => (
        <div key={i} className="h-6 rounded bg-plane" style={{ width: `${85 - i * 4}%` }} />
      ))}
    </div>
  );
}
