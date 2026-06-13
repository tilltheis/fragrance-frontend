import { type SeasonThreshold } from './types';
import { type NormalizedFragrance } from './normalizeFragrances';

export interface FilterCounts {
  types: Map<string, number>;
  seasons: Map<string, number>;
  ratings: Map<number, number>;
}

const RATING_THRESHOLDS = [0.5, 0.6, 0.7, 0.75, 0.8, 0.9];

export function computeFilterCounts(
  items: NormalizedFragrance[],
  seasonThreshold: SeasonThreshold,
): FilterCounts {
  const types = new Map<string, number>();
  const seasons = new Map<string, number>();
  const ratingAccum = new Map<number, number>(RATING_THRESHOLDS.map((t) => [t, 0]));

  for (const item of items) {
    for (const [typeKey, pct] of item.typePercentages) {
      if (pct >= 20) {
        types.set(typeKey, (types.get(typeKey) ?? 0) + 1);
      }
    }

    for (const [seasonKey, pct] of item.seasonPercentages) {
      let passes = false;
      if (seasonThreshold === '20') passes = pct >= 20;
      else if (seasonThreshold === '40') passes = pct >= 40;
      else if (seasonThreshold === 'top') passes = item.maxSeasonPct > 0 && pct === item.maxSeasonPct;
      if (passes) {
        seasons.set(seasonKey, (seasons.get(seasonKey) ?? 0) + 1);
      }
    }

    if (item.isTested) {
      const rating = item.fragrance.rating ?? 0;
      for (const threshold of RATING_THRESHOLDS) {
        if (rating >= threshold) {
          ratingAccum.set(threshold, (ratingAccum.get(threshold) ?? 0) + 1);
        }
      }
    }
  }

  return { types, seasons, ratings: ratingAccum };
}
