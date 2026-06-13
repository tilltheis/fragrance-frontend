import { type BrowseState, type SeasonKey } from './types';
import { normalize, type NormalizedFragrance } from './normalizeFragrances';
import { type Taxonomy } from './taxonomy';

export function filterFragrances(
  normalized: NormalizedFragrance[],
  state: BrowseState,
  _taxonomy: Taxonomy,
): NormalizedFragrance[] {
  const normalizedQuery = state.query ? normalize(state.query) : '';

  return normalized.filter((item) => {
    if (normalizedQuery) {
      const matchesBrand = item.normalizedBrand.includes(normalizedQuery);
      const matchesName = item.normalizedName.includes(normalizedQuery);
      if (!matchesBrand && !matchesName) return false;
    }

    if (state.ownership === 'owned' && !item.isOwned) return false;
    if (state.ownership === 'notOwned' && item.isOwned) return false;
    if (state.ratingState === 'tested' && !item.isTested) return false;
    if (state.ratingState === 'unrated' && item.isTested) return false;
    if (state.minRating !== null) {
      if (!item.isTested || (item.fragrance.rating ?? 0) < state.minRating) return false;
    }

    if (state.brands.length > 0) {
      if (!state.brands.includes(item.normalizedBrand)) return false;
    }

    if (state.types.length > 0) {
      for (const type of state.types) {
        const pct = item.typePercentages.get(type) ?? 0;
        if (pct < 20) return false;
      }
    }

    if (state.notes.length > 0) {
      for (const noteKey of state.notes) {
        if (!item.normalizedNoteKeys.has(noteKey)) return false;
      }
    }

    if (state.seasons.length > 0) {
      for (const season of state.seasons as SeasonKey[]) {
        const pct = item.seasonPercentages.get(season) ?? 0;
        if (state.seasonThreshold === '20' && pct < 20) return false;
        if (state.seasonThreshold === '40' && pct < 40) return false;
        if (state.seasonThreshold === 'top') {
          if (item.maxSeasonPct === 0 || pct !== item.maxSeasonPct) return false;
        }
      }
    }

    return true;
  });
}
