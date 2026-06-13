import { type Fragrance, type SortKey } from './types';
import { type NormalizedFragrance } from './normalizeFragrances';

function compareByKey(
  a: NormalizedFragrance,
  b: NormalizedFragrance,
  sortKey: SortKey,
): number {
  switch (sortKey) {
    case 'newest':
      return b.fragrance.id - a.fragrance.id;
    case 'ratingDesc': {
      const ra = a.fragrance.rating;
      const rb = b.fragrance.rating;
      if (ra === undefined && rb === undefined) return 0;
      if (ra === undefined) return 1;
      if (rb === undefined) return -1;
      return rb - ra;
    }
    case 'testedDesc': {
      const ta = a.fragrance.firstTestedAt?.getTime();
      const tb = b.fragrance.firstTestedAt?.getTime();
      if (ta === undefined && tb === undefined) return 0;
      if (ta === undefined) return 1;
      if (tb === undefined) return -1;
      return tb - ta;
    }
    case 'editedDesc': {
      const ua = a.fragrance.updatedAt?.getTime();
      const ub = b.fragrance.updatedAt?.getTime();
      if (ua === undefined && ub === undefined) return 0;
      if (ua === undefined) return 1;
      if (ub === undefined) return -1;
      return ub - ua;
    }
    case 'brandAsc': {
      const cmp = a.normalizedBrand.localeCompare(b.normalizedBrand, 'de');
      if (cmp !== 0) return cmp;
      return a.normalizedName.localeCompare(b.normalizedName, 'de');
    }
    case 'nameAsc': {
      const cmp = a.normalizedName.localeCompare(b.normalizedName, 'de');
      if (cmp !== 0) return cmp;
      return a.normalizedBrand.localeCompare(b.normalizedBrand, 'de');
    }
  }
}

export function sortFragrances(
  items: NormalizedFragrance[],
  sortKey: SortKey,
  rankByMatch: boolean,
  scores: Map<number, number>,
): Fragrance[] {
  const useRank = rankByMatch && scores.size > 0;

  return [...items]
    .sort((a, b) => {
      if (useRank) {
        const sa = scores.get(a.fragrance.id) ?? 0;
        const sb = scores.get(b.fragrance.id) ?? 0;
        if (sb !== sa) return sb - sa;
      }
      const keyCmp = compareByKey(a, b, sortKey);
      if (keyCmp !== 0) return keyCmp;
      return b.fragrance.id - a.fragrance.id;
    })
    .map((item) => item.fragrance);
}
