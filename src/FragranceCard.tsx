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
  const getQualityDots = (fragrance: Fragrance) => {
    return fragrance?.scent?.count ?? 0 >= 100 ? "•••" : fragrance?.scent?.count ?? 0 >= 50 ? "••" : "•";
  };

  return (
    <div
      className="bg-card-bg text-card-fg border border-card-border rounded-lg p-4 shadow-sm hover:shadow-md hover:bg-card-hover transition-colors cursor-pointer"
      onClick={() => onSelect(fragrance.id)}
    >
      {/* Header */}
      <div className="mb-2">
        <h4 className="text-sm font-semibold leading-tight text-card-fg">
          {fragrance.brand || fragrance.brandQuery}
        </h4>
        <h3 className="text-lg font-semibold text-card-fg">
          {fragrance.name || fragrance.nameQuery}
        </h3>
          <p className="text-sm text-fg-muted">
            {fragrance.concentration ?? ""} {getQualityDots(fragrance)}
          </p>
      </div>

      <TypeChips className="mb-2" typeMap={fragrance.type} />

      {(fragrance.season === null) && console.log("NULL")}
      <div className="mb-2">
        <div className="text-xs text-fg-muted mb-1">Saison</div>
        <SeasonBar map={fragrance.season} />
      </div>

      <div className="mb-2">
        <div className="text-xs text-fg-muted mb-1">Anlass</div>
        <OccasionBar map={fragrance.occasion} />
      </div>
      
      <div className="mb-2">
        <div className="text-xs text-fg-muted mb-1">Community-Wertung</div>
        <CommunityRatings fragrance={fragrance} />
      </div>

      <div className="mb-2">
        <div className="text-xs text-fg-muted mb-1">Persönliche Wertung</div>
        <RatingBar label="❤️️" value={fragrance.rating ? Math.round(fragrance.rating * 100) : undefined} classNames={{ track: "bg-meter-rating-track", fill: "bg-meter-rating-fill" }} />
      </div>
    </div>
  );
}