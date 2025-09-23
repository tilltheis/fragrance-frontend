import styles from './CommunityRatings.module.css';
import { RatingBar } from "./RatingBar";
import type { Fragrance } from "./types";

interface CommunityRatingsProps {
  fragrance: Fragrance;
}

export function CommunityRatings({ fragrance, }: CommunityRatingsProps) {
  return (
    <div className="flex flex-row gap-2 w-full">
      <RatingBar label="👃" value={fragrance.scent?.median} className={styles.root} classNames={{ track: "bg-[var(--Duft-track)]", fill: "bg-[var(--Duft-fill)]" }} />
      <RatingBar label="⏳" value={fragrance.longevity?.median} className={styles.root} classNames={{ track: "bg-[var(--Haltbarkeit-track)]", fill: "bg-[var(--Haltbarkeit-fill)]" }} />
      <RatingBar label="🌬️" value={fragrance.sillage?.median} className={styles.root} classNames={{ track: "bg-[var(--Sillage-track)]", fill: "bg-[var(--Sillage-fill)]" }} />
    </div>
  );
};