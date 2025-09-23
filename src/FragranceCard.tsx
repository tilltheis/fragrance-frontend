import { TypeChips } from './TypeChips';
import { SeasonBar } from './SeasonBar';
import { OccasionBar } from './OccasionBar';
import type { Fragrance } from './types';
import { CommunityRatings } from './CommunityRatings';

interface CardProps {
  fragrance: Fragrance;
  onSelect: (id: number) => void;
}

export function FragranceCard({ fragrance, onSelect }: CardProps) {
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

      <div className="mb-2">
        <div className="text-xs text-gray-600 dark:text-gray-400 mb-1">Community-Wertung</div>
        <CommunityRatings fragrance={fragrance} />
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