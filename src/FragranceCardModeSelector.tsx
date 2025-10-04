import { useEffect } from "react";
import type { FragranceCardMode } from "./FragranceCard";

const FRAGRANCE_VIEW_KEY = 'appearance-setting';

type FragranceCardModeSelectorProps = {
  value: FragranceCardMode;
  onChange?: (view: FragranceCardMode) => void;
  className?: string;
};

export const getInitialFragranceCardMode = (): FragranceCardMode => {
  if (typeof window === 'undefined') return 'communityStats';
  const stored = window.localStorage.getItem(FRAGRANCE_VIEW_KEY);
  if (stored === 'communityStats' || stored === 'scentNotes') return stored;
  return 'communityStats';
};

export function FragranceCardModeSelector({ value, onChange, className }: FragranceCardModeSelectorProps) {
  useEffect(() => {
    window.localStorage.setItem(FRAGRANCE_VIEW_KEY, value);
    onChange?.(value);
  }, [value, onChange]);

  const fragranceCardModeOptions =
    [['communityStats', '📊️', 'Community-Wertungen'],
    ['scentNotes', '️🌿', 'Duftnoten']] as const;

  const leftMap = {
    communityStats: 'left-0',
    scentNotes: 'left-15',
  };

  return (
    <div className={`w-30 flex items-center justify-center rounded bg-toggle-off border-input-border relative ${className ?? ''}`}>
      <div className={`w-15 h-8 rounded bg-toggle-on absolute top-0 transition-all ${leftMap[value]}`} />
      {fragranceCardModeOptions.map(([mode, icon, label]) => (
        <button
          key={mode}
          className="w-15 h-8 text-md text-shadow-[0_0px_2px_#000,0_1px_2px_#000] z-1"
          onClick={() => onChange?.(mode)}
          aria-label={label}
          title={label}
        >
          {icon}
        </button>
      ))}
    </div>
  );
}