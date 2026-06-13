import { useEffect, useState } from 'react';
import { type BrowseState, type SeasonKey, type SeasonThreshold, type SortKey, type TypeKey, SEASONS, TYPES } from './types';
import { normalize } from './normalizeFragrances';

const DEFAULT_STATE: BrowseState = {
  query: '',
  rankByMatch: true,
  brands: [],
  types: [],
  notes: [],
  seasons: [],
  seasonThreshold: '20',
  minRating: null,
  ownership: 'all',
  ratingState: 'all',
  sortKey: 'newest',
};

function parseState(search: string): BrowseState {
  const params = new URLSearchParams(search);

  const query = params.get('q') ?? '';
  const rankByMatch = params.get('rank') !== '0';

  const brands = params.getAll('brand').map((b) => b.trim()).filter(Boolean);
  const types = params.getAll('type').filter((t): t is TypeKey => (TYPES as readonly string[]).includes(t));
  const notes = params.getAll('note').map((n) => n.trim()).filter(Boolean);
  const seasons = params.getAll('season').filter((s): s is SeasonKey => (SEASONS as readonly string[]).includes(s));

  const stRaw = params.get('st');
  const seasonThreshold: SeasonThreshold = stRaw === '40' ? '40' : stRaw === 'top' ? 'top' : '20';

  const mrRaw = params.get('mr');
  const mrNum = mrRaw !== null ? parseInt(mrRaw, 10) : null;
  const validRatings = [50, 60, 70, 75, 80, 90];
  const minRating = mrNum !== null && validRatings.includes(mrNum) ? mrNum / 100 : null;

  const ownRaw = params.get('own');
  const ownership = ownRaw === 'owned' ? 'owned' : ownRaw === 'notOwned' ? 'notOwned' : 'all';

  const rsRaw = params.get('rs');
  const ratingState = rsRaw === 'tested' ? 'tested' : rsRaw === 'unrated' ? 'unrated' : 'all';

  const sortRaw = params.get('sort');
  const validSortKeys: SortKey[] = ['newest', 'ratingDesc', 'testedDesc', 'editedDesc', 'brandAsc', 'nameAsc'];
  const sortKey: SortKey = validSortKeys.includes(sortRaw as SortKey) ? (sortRaw as SortKey) : 'newest';

  return { query, rankByMatch, brands, types, notes, seasons, seasonThreshold, minRating, ownership, ratingState, sortKey };
}

function serializeState(state: BrowseState): string {
  const params = new URLSearchParams();

  if (state.query) params.set('q', state.query);
  if (!state.rankByMatch) params.set('rank', '0');
  for (const b of state.brands) params.append('brand', b);
  for (const t of state.types) params.append('type', t);
  for (const n of state.notes) params.append('note', n);
  for (const s of state.seasons) params.append('season', s);
  if (state.seasonThreshold !== '20') params.set('st', state.seasonThreshold);
  if (state.minRating !== null) params.set('mr', String(Math.round(state.minRating * 100)));
  if (state.ownership !== 'all') params.set('own', state.ownership);
  if (state.ratingState !== 'all') params.set('rs', state.ratingState);
  if (state.sortKey !== 'newest') params.set('sort', state.sortKey);

  const str = params.toString();
  return str ? '?' + str : '';
}

export type SearchStateActions = {
  setQuery: (query: string) => void;
  setSortKey: (sortKey: SortKey) => void;
  toggleRankByMatch: () => void;
  toggleBrand: (brandKey: string) => void;
  toggleType: (type: TypeKey) => void;
  toggleNote: (noteKey: string) => void;
  toggleSeason: (season: SeasonKey) => void;
  setSeasonThreshold: (threshold: SeasonThreshold) => void;
  setMinRating: (rating: number | null) => void;
  setOwnership: (ownership: BrowseState['ownership']) => void;
  setRatingState: (ratingState: BrowseState['ratingState']) => void;
  setFilterState: (patch: Partial<BrowseState>) => void;
  clearAllFilters: () => void;
  clearQuickViews: () => void;
};

export function useSearchState(): [BrowseState, SearchStateActions] {
  const [, setTick] = useState(0);

  useEffect(() => {
    function onPopState() {
      setTick((t) => t + 1);
    }
    window.addEventListener('popstate', onPopState);
    return () => window.removeEventListener('popstate', onPopState);
  }, []);

  const state = parseState(window.location.search);

  function push(next: BrowseState) {
    const url = serializeState(next);
    history.pushState(null, '', url || window.location.pathname);
    setTick((t) => t + 1);
  }

  const actions: SearchStateActions = {
    setQuery(query) {
      push({ ...state, query });
    },
    setSortKey(sortKey) {
      push({ ...state, sortKey });
    },
    toggleRankByMatch() {
      push({ ...state, rankByMatch: !state.rankByMatch });
    },
    toggleBrand(brandKey) {
      const key = normalize(brandKey);
      const brands = state.brands.includes(key)
        ? state.brands.filter((b) => b !== key)
        : [...state.brands, key];
      push({ ...state, brands });
    },
    toggleType(type) {
      const types = state.types.includes(type)
        ? state.types.filter((t) => t !== type)
        : [...state.types, type];
      push({ ...state, types });
    },
    toggleNote(noteKey) {
      const notes = state.notes.includes(noteKey)
        ? state.notes.filter((n) => n !== noteKey)
        : [...state.notes, noteKey];
      push({ ...state, notes });
    },
    toggleSeason(season) {
      const seasons = state.seasons.includes(season)
        ? state.seasons.filter((s) => s !== season)
        : [...state.seasons, season];
      push({ ...state, seasons });
    },
    setSeasonThreshold(seasonThreshold) {
      push({ ...state, seasonThreshold });
    },
    setMinRating(minRating) {
      let next: BrowseState = { ...state, minRating };
      if (minRating !== null && state.ratingState === 'unrated') {
        next = { ...next, ratingState: 'all' };
      }
      push(next);
    },
    setOwnership(ownership) {
      push({ ...state, ownership });
    },
    setRatingState(ratingState) {
      let next: BrowseState = { ...state, ratingState };
      if (ratingState === 'unrated') {
        next = { ...next, minRating: null };
      }
      push(next);
    },
    setFilterState(patch) {
      push({ ...state, ...patch });
    },
    clearAllFilters() {
      push({
        ...DEFAULT_STATE,
        sortKey: state.sortKey,
        rankByMatch: state.rankByMatch,
      });
    },
    clearQuickViews() {
      push({ ...state, ownership: 'all', ratingState: 'all', minRating: null });
    },
  };

  return [state, actions];
}
