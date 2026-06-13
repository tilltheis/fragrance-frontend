import { useEffect, useRef, useState } from 'react';

interface Props {
  filteredCount: number;
  totalCount: number;
  compact?: boolean;
}

export function ResultCount({ filteredCount, totalCount, compact = false }: Props) {
  const [announced, setAnnounced] = useState(filteredCount);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => setAnnounced(filteredCount), 200);
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [filteredCount]);

  return (
    <>
      <span data-testid="result-count" className="text-sm text-fg-muted">
        {compact
          ? `${filteredCount}\u202f/\u202f${totalCount}`
          : `${filteredCount} von ${totalCount} Düften`}
      </span>
      <span className="sr-only" aria-live="polite" aria-atomic="true">
        {compact
          ? `${announced} von ${totalCount} Düften`
          : `${announced} von ${totalCount} Düften`}
      </span>
    </>
  );
}
