import { useMemo } from 'react';
import { type Fragrance, type BrowseState } from './types';
import { normalizeFragrances } from './normalizeFragrances';
import { buildTaxonomy, type Taxonomy } from './taxonomy';
import { filterFragrances } from './filterFragrances';
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
} {
  const fragranceList = useMemo(
    () => (fragrances ? Object.values(fragrances) : []),
    [fragrances],
  );

  const normalized = useMemo(() => normalizeFragrances(fragranceList), [fragranceList]);

  const taxonomy = useMemo(() => buildTaxonomy(normalized), [normalized]);

  const filtered = useMemo(() => {
    const filteredNorm = filterFragrances(normalized, state, taxonomy);
    const scores = computeScores(filteredNorm, state.query);
    return sortFragrances(filteredNorm, state.sortKey, state.rankByMatch, scores);
  }, [normalized, taxonomy, state]);

  return {
    filtered,
    totalCount: fragranceList.length,
    filteredCount: filtered.length,
    taxonomy,
  };
}
