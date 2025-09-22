import { useState } from 'react';
import unparsedFragrances from './fragrances.json';
import { parseFragrance, type Fragrance } from './types';
import { TypeChips } from './TypeChips';
import { SeasonBar } from './SeasonBar';
import { OccasionBar } from './OccasionBar';
import { AppearanceSelector } from './AppearanceSelector';

const DATA: Fragrance[] = unparsedFragrances.map(parseFragrance);

interface CardProps {
  fragrance: Fragrance;
  onSelect: (id: number) => void;
}

function FragranceCard({ fragrance, onSelect }: CardProps) {
  // Quality dots
  const getQualityDots = (fragrance: Fragrance) => {
    return fragrance?.scent?.count ?? 0 >= 100 ? "•••" : fragrance?.scent?.count ?? 0 >= 50 ? "••" : "•";
  };

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

      {fragrance.season && (
        <div className="mb-2">
          <div className="text-xs text-gray-600 dark:text-gray-400 mb-1">Saison</div>
          <SeasonBar map={fragrance.season} />
        </div>
      )}

      {fragrance.occasion && (
        <div className="mb-2">
          <div className="text-xs text-gray-600 dark:text-gray-400 mb-1">Anlass</div>
          <OccasionBar map={fragrance.occasion} />
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
  const [selectedId, setSelectedId] = useState<number | null>(null);

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
            <AppearanceSelector />
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
              onSelect={handleCardSelect}
            />
          ))}
        </div>
      </main>
    </div>
  );
}
