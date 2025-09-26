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

  return (
    <div className="flex gap-2 items-center">
      <button
        className={`px-2 py-1 rounded ${appearance === 'light' ? 'bg-gray-200 dark:bg-gray-700 font-bold' : 'bg-gray-100 dark:bg-gray-800'}`}
        onClick={() => setAppearance('light')}
        aria-label="Helles Design"
      >
        ☀️
      </button>
      <button
        className={`px-2 py-1 rounded ${appearance === 'dark' ? 'bg-gray-700 text-white font-bold' : 'bg-gray-100 dark:bg-gray-800'}`}
        onClick={() => setAppearance('dark')}
        aria-label="Dunkles Design"
      >
        🌙
      </button>
      <button
        className={`px-2 py-1 rounded ${appearance === 'system' ? 'bg-blue-200 dark:bg-blue-900 font-bold' : 'bg-gray-100 dark:bg-gray-800'}`}
        onClick={() => setAppearance('system')}
        aria-label="Systemeinstellung"
      >
        🖥️
      </button>
    </div>
  );
}