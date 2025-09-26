import { useState, useEffect } from "react";

type Appearance = 'light' | 'dark' | 'system';

const APPEARANCE_KEY = 'appearance-setting';

export function AppearanceSelector() {
  const getInitialAppearance = (): Appearance => {
    if (typeof window === 'undefined') return 'system';
    const stored = window.localStorage.getItem(APPEARANCE_KEY);
    if (stored === 'light' || stored === 'dark') return stored;
    return 'system';
  };

  const [appearance, setAppearance] = useState<Appearance>(getInitialAppearance());

  useEffect(() => {
    if (appearance === 'system') {
      window.localStorage.removeItem(APPEARANCE_KEY);
    } else {
      window.localStorage.setItem(APPEARANCE_KEY, appearance);
    }
    const isDark = appearance === 'dark' || (appearance === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches);
    document.documentElement.classList.toggle('dark', isDark);

    // Listen for system changes if system mode
    let mediaQuery: MediaQueryList | null = null;
    let handler: ((e: MediaQueryListEvent) => void) | null = null;
    if (appearance === 'system') {
      mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
      handler = (e: MediaQueryListEvent) => {
        document.documentElement.classList.toggle('dark', e.matches);
      };
      mediaQuery.addEventListener('change', handler);
    }
    return () => {
      if (mediaQuery && handler) {
        mediaQuery.removeEventListener('change', handler);
      }
    };
  }, [appearance]);

  const appearanceOptions =
    [['light', '☀️', 'Helles Design'],
    ['system', '🖥️', 'Systemeinstellung'],
    ['dark', '🌙', 'Dunkles Design']] as const;

  return (
    <div className="flex items-center justify-center rounded bg-input-bg bg-toggle-off border-input-border">
      {appearanceOptions.map(([mode, icon, label]) => (
        <button
          key={mode}
          className={`px-2 py-1 rounded text-md text-shadow-[0_0px_2px_#000,0_1px_2px_#000] ${appearance === mode ? 'bg-toggle-on' : ''}`}
          onClick={() => setAppearance(mode)}
          aria-label={label}
        >
          {icon}
        </button>
      ))}
    </div>
  );
}