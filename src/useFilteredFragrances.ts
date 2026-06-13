import { useMemo } from 'react';
import { type Fragrance, type BrowseState } from './types';
import { normalizeFragrances } from './normalizeFragrances';
import { buildTaxonomy, type Taxonomy } from './taxonomy';
import { filterFragrances } from './filterFragrances';
import { computeFilterCounts, type FilterCounts } from './filterCounts';
import { computeScores } from './searchFragrances';
import { sortFragrances } from './sortFragrances';

export function useFilteredFragrances(
  fragrances: Record<number, Fragrance> | undefined,
  state: BrowseState,
  retainedOwnershipFragranceId?: number,
): {
  filtered: Fragrance[];
  totalCount: number;
  filteredCount: number;
  taxonomy: Taxonomy;
  filterCounts: FilterCounts;
} {
  const fragranceList = useMemo(
    () => (fragrances ? Object.values(fragrances) : []),
    [fragrances],
  );

  const normalized = useMemo(() => normalizeFragrances(fragranceList), [fragranceList]);

  const taxonomy = useMemo(() => buildTaxonomy(normalized), [normalized]);

  const filteredNorm = useMemo(
    () => filterFragrances(normalized, state, taxonomy),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [normalized, taxonomy, state.query, state.ownership, state.ratingState, state.minRating,
     state.brands, state.types, state.notes, state.seasons, state.seasonThreshold],
  );

  const reconciledFilteredNorm = useMemo(() => {
    if (retainedOwnershipFragranceId === undefined || state.ownership === 'all') {
      return filteredNorm;
    }

    if (filteredNorm.some((item) => item.fragrance.id === retainedOwnershipFragranceId)) {
      return filteredNorm;
    }

    const retainedItem = normalized.find((item) => item.fragrance.id === retainedOwnershipFragranceId);
    if (!retainedItem) {
      return filteredNorm;
    }

    const matchesWithoutOwnership = filterFragrances(
      [retainedItem],
      { ...state, ownership: 'all' },
      taxonomy,
    ).length === 1;

    if (!matchesWithoutOwnership) {
      return filteredNorm;
    }

    return [...filteredNorm, retainedItem];
  }, [filteredNorm, normalized, retainedOwnershipFragranceId, state, taxonomy]);

  const filterCounts = useMemo(
    () => computeFilterCounts(reconciledFilteredNorm, state.seasonThreshold),
    [reconciledFilteredNorm, state.seasonThreshold],
  );

  const filtered = useMemo(() => {
    const scores = computeScores(reconciledFilteredNorm, state.query);
    return sortFragrances(reconciledFilteredNorm, state.sortKey, state.rankByMatch, scores);
  }, [reconciledFilteredNorm, state.query, state.sortKey, state.rankByMatch]);

  return {
    filtered,
    totalCount: fragranceList.length,
    filteredCount: filtered.length,
    taxonomy,
    filterCounts,
  };
}
