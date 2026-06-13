import { type Fragrance, type SeasonKey, type TypeKey } from './types';

export interface NormalizedFragrance {
  fragrance: Fragrance;
  normalizedBrand: string;
  normalizedName: string;
  normalizedNoteKeys: Set<string>;
  displayNotes: { key: string; label: string }[];
  typePercentages: Map<TypeKey, number>;
  seasonPercentages: Map<SeasonKey, number>;
  maxSeasonPct: number;
  isTested: boolean;
  isOwned: boolean;
}

export function normalize(s: string): string {
  return s.trim().toLowerCase().normalize('NFD').replace(/\p{Mn}/gu, '');
}

function computePercentages<K extends string>(map: Partial<Record<K, number>>): Map<K, number> {
  const entries = Object.entries(map) as [K, number][];
  const total = entries.reduce((sum, [, v]) => sum + (v ?? 0), 0);
  const result = new Map<K, number>();
  if (total === 0) return result;
  for (const [k, v] of entries) {
    result.set(k, ((v ?? 0) / total) * 100);
  }
  return result;
}

function collectNotes(fragrance: Fragrance): { key: string; label: string }[] {
  const labels: string[] = [];
  if (fragrance.notes) {
    if (fragrance.notes.kind === 'pyramid') {
      labels.push(...fragrance.notes.head, ...fragrance.notes.heart, ...fragrance.notes.base);
    } else {
      labels.push(...fragrance.notes.notes);
    }
  }
  const seen = new Map<string, string>();
  for (const label of labels) {
    const key = normalize(label);
    if (!seen.has(key)) {
      seen.set(key, label);
    }
  }
  return Array.from(seen.entries()).map(([key, label]) => ({ key, label }));
}

export function normalizeFragrances(fragrances: Fragrance[]): NormalizedFragrance[] {
  return fragrances.map((fragrance) => {
    const brand = fragrance.brand ?? fragrance.brandQuery;
    const name = fragrance.name ?? fragrance.nameQuery;
    const normalizedBrand = normalize(brand);
    const normalizedName = normalize(name);

    const displayNotes = collectNotes(fragrance);
    const normalizedNoteKeys = new Set(displayNotes.map((n) => n.key));

    const typePercentages = fragrance.type
      ? computePercentages<TypeKey>(fragrance.type)
      : new Map<TypeKey, number>();

    const seasonPercentages = fragrance.season
      ? computePercentages<SeasonKey>(fragrance.season)
      : new Map<SeasonKey, number>();

    const maxSeasonPct = seasonPercentages.size > 0 ? Math.max(...seasonPercentages.values()) : 0;

    const isTested = fragrance.rating !== undefined;
    const isOwned = fragrance.owned === true;

    return {
      fragrance,
      normalizedBrand,
      normalizedName,
      normalizedNoteKeys,
      displayNotes,
      typePercentages,
      seasonPercentages,
      maxSeasonPct,
      isTested,
      isOwned,
    };
  });
}
