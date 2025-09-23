import { RatingBar } from "./RatingBar";
import type { Fragrance } from "./types";

interface CommunityRatingsProps {
  fragrance: Fragrance;
}

export function CommunityRatings({ fragrance, }: CommunityRatingsProps) {
  return (
    <div className="flex flex-row gap-2 w-full">
      <RatingBar label="👃" value={fragrance.scent?.median} classNames={{ track: "bg-meter-scent-track", fill: "bg-meter-scent-fill" }} />
      <RatingBar label="⏳" value={fragrance.longevity?.median} classNames={{ track: "bg-meter-longevity-track", fill: "bg-meter-longevity-fill" }} />
      <RatingBar label="🌬️" value={fragrance.sillage?.median} classNames={{ track: "bg-meter-sillage-track", fill: "bg-meter-sillage-fill" }} />
    </div>
  );
};