import styles from './FragranceCard.module.css';
import { TypeChips } from './TypeChips';
import { SeasonBar } from './SeasonBar';
import { OccasionBar } from './OccasionBar';
import type { Fragrance } from './types';
import { CommunityRatings } from './CommunityRatings';
import { RatingBar } from './RatingBar';

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

      <div className="mb-2">
        <div className="text-xs text-gray-600 dark:text-gray-400 mb-1">Persönliche Wertung</div>
        <RatingBar label="❤️️" value={fragrance.rating ? Math.round(fragrance.rating * 100) : undefined} className={styles.root} classNames={{ track: "bg-[var(--rating-track)]", fill: "bg-[var(--rating-fill)]" }} />
      </div>
    </div>
  );
}