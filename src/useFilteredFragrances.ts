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

  const filterCounts = useMemo(
    () => computeFilterCounts(filteredNorm, state.seasonThreshold),
    [filteredNorm, state.seasonThreshold],
  );

  const filtered = useMemo(() => {
    const scores = computeScores(filteredNorm, state.query);
    return sortFragrances(filteredNorm, state.sortKey, state.rankByMatch, scores);
  }, [filteredNorm, state.query, state.sortKey, state.rankByMatch]);

  return {
    filtered,
    totalCount: fragranceList.length,
    filteredCount: filtered.length,
    taxonomy,
    filterCounts,
  };
}
