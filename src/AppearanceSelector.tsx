import { useEffect, useState } from "react";

type Appearance = 'light' | 'dark' | 'system';

export function AppearanceSelector() {
  const [appearance, setAppearance] = useState<Appearance>('system');
  const [isDark, setIsDark] = useState(false);

  // Listen to system dark mode changes
  useEffect(() => {
    if (appearance === 'system') {
      const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
      setIsDark(mediaQuery.matches);
      const handler = (e: MediaQueryListEvent) => setIsDark(e.matches);
      mediaQuery.addEventListener('change', handler);
      return () => mediaQuery.removeEventListener('change', handler);
    }
  }, [appearance]);

  // Set dark mode based on appearance
  useEffect(() => {
    if (appearance === 'system') {
      const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
      setIsDark(mediaQuery.matches);
    } else {
      setIsDark(appearance === 'dark');
    }
    document.documentElement.classList.toggle('dark', appearance === 'dark' || (appearance === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches));
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