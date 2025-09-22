import React from 'react';
import unparsedFragrances from './fragrances.json';
import { OCCASION_COLORS, OCCASIONS, parseFragrance, SEASON_COLORS, SEASONS, type Fragrance, type TypeKey, type TypeMap } from './types';
import { TypeChips } from './TypeChips';

const DATA: Fragrance[] = unparsedFragrances.map(parseFragrance);

interface CardProps {
  fragrance: Fragrance;
  isDark: boolean;
  onSelect: (id: number) => void;
}

function FragranceCard({ fragrance, isDark, onSelect }: CardProps) {
  // Quality dots
  const getQualityDots = (fragrance: Fragrance) => {
    return fragrance?.scent?.count ?? 0 >= 100 ? "•••" : fragrance?.scent?.count ?? 0 >= 50 ? "••" : "•";
  };

  // Stacked bar data with order
  const getStackedBarData = <T extends string>(
    map: Partial<Record<T, number>> | null,
    order: readonly T[]
  ) => {
    if (!map) return [];
    const total = Object.values(map).reduce((sum, count) => sum + count, 0);
    if (total === 0) return [];
    return order
      .map((key) => ({
        key,
        percentage: ((map[key] ?? 0) / total) * 100 
      }))
      .filter(({ percentage }) => percentage > 0);
  };

  const seasonData = getStackedBarData(fragrance.season, SEASONS);
  const occasionData = getStackedBarData(fragrance.occasion, OCCASIONS);

  return (
    <div
      className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-4 shadow-sm hover:shadow-md transition-shadow cursor-pointer"
      onClick={() => onSelect(fragrance.id)}
    >
      {/* Header */}
      <div className="mb-2">
        <h4 className="text-sm font-semibold text-gray-900 dark:text-gray-100 leading-tight">
          {fragrance.brand || fragrance.brandQuery}
        </h4>
        <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
          {fragrance.name || fragrance.nameQuery}
        </h3>
        {fragrance.concentration && (
          <p className="text-sm text-gray-600 dark:text-gray-400">
            {fragrance.concentration} {getQualityDots(fragrance)}
          </p>
        )}
      </div>

      {fragrance.type && <TypeChips typeMap={fragrance.type} />}

      {/* Season Bar */}
      {seasonData.length > 0 && (
        <div className="mb-2">
          <div className="text-xs text-gray-600 dark:text-gray-400 mb-1">Saison</div>
          <div className="flex h-5 rounded overflow-hidden bg-gray-200 dark:bg-gray-700">
            {seasonData.map(({ key, percentage }) => {
              const config = SEASON_COLORS[key as keyof typeof SEASON_COLORS];
              const color = isDark ? config.dark : config.light;
              return (
                <div
                  key={key}
                  style={{
                    width: `${percentage}%`,
                    backgroundColor: color
                  }}
                  title={`${config.emoji || ""} ${key}: ${Math.round(percentage)}%`}
                >
                  <span
                    className="flex items-center justify-center h-full text-[10px]"
                    style={{
                      textShadow: isDark
                        ? "0 1px 2px #000, 0 0px 2px #000"
                        : "0 1px 2px #fff, 0 0px 2px #fff"
                    }}
                  >
                    {config.emoji}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Occasion Bar */}
      {occasionData.length > 0 && (
        <div className="mb-3">
          <div className="text-xs text-gray-600 dark:text-gray-400 mb-1">Anlass</div>
          <div className="flex h-5 rounded overflow-hidden bg-gray-200 dark:bg-gray-700">
            {occasionData.map(({ key, percentage }) => {
              const config = OCCASION_COLORS[key as keyof typeof OCCASION_COLORS];
              const color = config ? (isDark ? config.dark : config.light) : "#6B7280";
              return (
                <div
                  key={key}
                  style={{
                    width: `${percentage}%`,
                    backgroundColor: color
                  }}
                  title={`${config?.emoji || ""} ${key}: ${Math.round(percentage)}%`}
                >
                  <span
                    className="flex items-center justify-center h-full text-[10px]"
                    style={{
                      textShadow: isDark
                        ? "0 1px 2px #000, 0 0px 2px #000"
                        : "0 1px 2px #fff, 0 0px 2px #fff"
                    }}
                  >
                    {config.emoji}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Stats */}
      <div className="flex justify-between items-center text-sm">
        <div className="flex gap-3">
          {fragrance.scent && (
            <span className="text-gray-600 dark:text-gray-400">
              👃 {fragrance.scent.median}%
            </span>
          )}
          {fragrance.longevity && (
            <span className="text-gray-600 dark:text-gray-400">
              ⏳ {fragrance.longevity.median}%
            </span>
          )}
          {fragrance.sillage && (
            <span className="text-gray-600 dark:text-gray-400">
              🌬️ {fragrance.sillage.median}%
            </span>
          )}
        </div>
      </div>


      <div className="flex justify-between items-center text-sm">
        <div className="flex gap-3">
          {fragrance.rating && (
            <span className="text-blue-600 dark:text-blue-400 font-medium">
              ⭐ {Math.round(fragrance.rating * 100)}%
            </span>
          )}
          {/* Owned Status */}
          <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${fragrance.owned
            ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
            : 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400'
            }`}>
            {fragrance.owned ? '✅ Besitze ich' : '— Nicht besessen'}
          </span>
        </div>
      </div>
    </div>
  );
}

export default function App() {
  const [isDark, setIsDark] = React.useState(false);
  const [selectedId, setSelectedId] = React.useState<number | null>(null);

  // Dark mode effect
  React.useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    setIsDark(mediaQuery.matches);

    const handler = (e: MediaQueryListEvent) => setIsDark(e.matches);
    mediaQuery.addEventListener('change', handler);
    return () => mediaQuery.removeEventListener('change', handler);
  }, []);

  // Toggle dark mode
  React.useEffect(() => {
    document.documentElement.classList.toggle('dark', isDark);
  }, [isDark]);

  const handleCardSelect = (id: number) => {
    setSelectedId(id);
    // TODO: Open detail view
    console.log('Selected fragrance:', id);
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 transition-colors">
      {/* Header */}
      <header className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex justify-between items-center">
            <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
              Duftsammlung
            </h1>
            <button
              onClick={() => setIsDark(!isDark)}
              className="px-3 py-2 rounded-md bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
            >
              {isDark ? '☀️' : '🌙'}
            </button>
          </div>
          <p className="text-gray-600 dark:text-gray-400 mt-1">
            {DATA.length} Düfte in der Sammlung
          </p>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 py-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {DATA.map((fragrance) => (
            <FragranceCard
              key={fragrance.id}
              fragrance={fragrance}
              isDark={isDark}
              onSelect={handleCardSelect}
            />
          ))}
        </div>
      </main>
    </div>
  );
}
