// Central types and color/icon mappings for the perfume app

export const BUCKETS = [0, 10, 20, 30, 40, 50, 60, 70, 80, 90, 100] as const;
export type BucketKey = (typeof BUCKETS)[number];
export type BucketDistribution = Partial<Record<BucketKey, number>>;

export interface DistributionStats {
  bucketDistribution: BucketDistribution;
  median: number;
  p25: number;
  p75: number;
  iqr: number;
  count: number;
}

export const SEASONS = ['Frühling', 'Sommer', 'Herbst', 'Winter'] as const;
export type SeasonKey = (typeof SEASONS)[number];
export type SeasonMap = Partial<Record<SeasonKey, number>>;

export const OCCASIONS = ['Täglich', 'Sport', 'Freizeit', 'Ausgehen', 'Arbeit', 'Abend'] as const;
export type OccasionKey = (typeof OCCASIONS)[number];
export type OccasionMap = Partial<Record<OccasionKey, number>>;

export const TYPES = [
  'Animalisch',
  'Aquatisch',
  'Blumig',
  'Chypre',
  'Cremig',
  'Erdig',
  'Fougère',
  'Frisch',
  'Fruchtig',
  'Gourmand',
  'Grün',
  'Harzig',
  'Holzig',
  'Ledrig',
  'Orientalisch',
  'Pudrig',
  'Rauchig',
  'Synthetisch',
  'Süß',
  'Würzig',
  'Zitrus',
] as const;
export type TypeKey = (typeof TYPES)[number];
export type TypeMap = Partial<Record<TypeKey, number>>;

export type Notes = PyramidNotes | LinearNotes;

export interface PyramidNotes {
  kind: 'pyramid';
  head: string[];
  heart: string[];
  base: string[];
}

export interface LinearNotes {
  kind: 'linear';
  notes: string[];
}

export interface Fragrance {
  // mandatory
  id: number;
  brandQuery: string;
  nameQuery: string;

  // master data
  brand?: string;
  name?: string;
  concentration?: string; // eg "Eau de Toilette"

  // distributions
  scent?: DistributionStats;
  longevity?: DistributionStats;
  sillage?: DistributionStats;
  pricing?: DistributionStats;

  // classifications
  season?: SeasonMap;
  occasion?: OccasionMap;
  type?: TypeMap;

  // structure & notes
  notes?: Notes;

  // user data
  rating?: number; // 0..1
  reason?: string;
  comment?: string;
  sellers?: Set<string>;
  owned?: boolean;

  // timestamps
  createdAt?: Date;
  firstTestedAt?: Date;
  updatedAt?: Date;
}

export type StaticFragranceData = Pick<
  Fragrance,
  | 'id'
  | 'brand'
  | 'name'
  | 'concentration'
  | 'scent'
  | 'longevity'
  | 'sillage'
  | 'pricing'
  | 'season'
  | 'occasion'
  | 'type'
  | 'notes'
  | 'createdAt'
>;
export type DynamicFragranceData = Pick<
  Fragrance,
  | 'id'
  | 'brandQuery'
  | 'nameQuery'
  | 'rating'
  | 'reason'
  | 'comment'
  | 'sellers'
  | 'owned'
  | 'firstTestedAt'
  | 'updatedAt'
>;

export function toStaticFragranceData(x: Fragrance): StaticFragranceData {
  const {
    id,
    brand,
    name,
    concentration,
    scent,
    longevity,
    sillage,
    pricing,
    season,
    occasion,
    type,
    notes,
    createdAt,
  } = x;
  return {
    id,
    brand,
    name,
    concentration,
    scent,
    longevity,
    sillage,
    pricing,
    season,
    occasion,
    type,
    notes,
    createdAt,
  };
}

export function toDynamicFragranceData(x: Fragrance): DynamicFragranceData {
  const { id, brandQuery, nameQuery, rating, reason, comment, sellers, owned, firstTestedAt, updatedAt } = x;
  return { id, brandQuery, nameQuery, rating, reason, comment, sellers, owned, firstTestedAt, updatedAt };
}

// --- DistributionStats helpers ---
function parseBucketDistribution(dist: any): BucketDistribution | undefined {
  if (!dist || typeof dist !== 'object') return undefined;
  const out: BucketDistribution = {};
  for (const k of Object.keys(dist)) {
    if (!BUCKETS.includes(Number(k) as BucketKey)) return undefined;
    const v = dist[k];
    if (typeof v !== 'number' || !isFinite(v)) return undefined;
    out[Number(k) as BucketKey] = v;
  }
  return out;
}

function getPercentileFromBuckets(d: BucketDistribution, pct: number): number {
  const total = Object.values(d).reduce((a, b) => a + (b ?? 0), 0);
  if (!total) return 0;
  const ordered = Object.entries(d)
    .map(([k, v]) => ({ bucket: Number(k), count: v ?? 0 }))
    .sort((a, b) => a.bucket - b.bucket);
  let acc = 0;
  const target = (pct / 100) * total;
  for (const o of ordered) {
    acc += o.count;
    if (acc >= target) return o.bucket;
  }
  return ordered[ordered.length - 1]?.bucket ?? 0;
}

function toDistributionStats(dist: any): DistributionStats | undefined {
  const bucketDistribution = parseBucketDistribution(dist);
  if (!bucketDistribution) return undefined;
  const median = getPercentileFromBuckets(bucketDistribution, 50);
  const p25 = getPercentileFromBuckets(bucketDistribution, 25);
  const p75 = getPercentileFromBuckets(bucketDistribution, 75);
  const iqr = p75 - p25;
  const count = Object.values(bucketDistribution).reduce((a, b) => a + (b ?? 0), 0);
  return { bucketDistribution, median, p25, p75, iqr, count };
}

export function parseStaticFragranceData(item: any): StaticFragranceData {
  return {
    id: item.id,
    brand: item.brand || undefined,
    name: item.name || undefined,
    concentration: item.concentration || undefined,
    scent: toDistributionStats(item.scent),
    longevity: toDistributionStats(item.longevity),
    sillage: toDistributionStats(item.sillage),
    pricing: toDistributionStats(item.pricing),
    season: item.season || undefined,
    occasion: item.occasion || undefined,
    type: item.type || undefined,
    notes:
      item.structure === 'pyramid'
        ? (item.head || item.heart || item.base) && {
            kind: 'pyramid',
            head: item.head ?? [],
            heart: item.heart ?? [],
            base: item.base ?? [],
          }
        : item.structure === 'linear' && item.notes && { kind: 'linear', notes: item.notes },
    createdAt: item.createdAt ? new Date(item.createdAt) : new Date(),
  };
}

export function parseDynamicFragranceData(item: any): DynamicFragranceData {
  return {
    id: item.id,
    brandQuery: item.brandQuery,
    nameQuery: item.nameQuery,
    owned: item.owned || undefined,
    rating: item.rating === null ? undefined : item.rating,
    reason: item.reason || undefined,
    comment: item.comment || undefined,
    sellers: item.sellers ? new Set(item.sellers) : undefined,
    firstTestedAt: item.firstTestedAt ? new Date(item.firstTestedAt) : undefined,
    updatedAt: item.updatedAt ? new Date(item.updatedAt) : undefined,
  };
}

export type QuickViewKey = 'bestRated' | 'owned' | 'tested';

export type SeasonThreshold = '20' | '40' | 'top';

export type SortKey =
  | 'newest'
  | 'ratingDesc'
  | 'testedDesc'
  | 'editedDesc'
  | 'brandAsc'
  | 'nameAsc';

export interface BrowseState {
  query: string;
  rankByMatch: boolean;
  brands: string[];
  types: TypeKey[];
  notes: string[];
  seasons: SeasonKey[];
  seasonThreshold: SeasonThreshold;
  minRating: number | null;
  ownership: 'all' | 'owned' | 'notOwned';
  ratingState: 'all' | 'tested' | 'unrated';
  sortKey: SortKey;
}

export interface ViewState {
  displayMode: 'light' | 'dark' | 'system';
}

export type EmojiColor = { light: string; dark: string; emoji: string };

// Color and icon mappings
export const SEASON_COLORS: Record<SeasonKey, EmojiColor> = {
  Frühling: { light: '#34D399', dark: '#6EE7B7', emoji: '🌱' },
  Sommer: { light: '#FBBF24', dark: '#FACC15', emoji: '☀️' },
  Herbst: { light: '#F97316', dark: '#FB923C', emoji: '🍂' },
  Winter: { light: '#60A5FA', dark: '#93C5FD', emoji: '❄️' },
} as const;

export const OCCASION_COLORS: Record<OccasionKey, EmojiColor> = {
  Täglich: { light: '#9CA3AF', dark: '#D1D5DB', emoji: '📅' },
  Sport: { light: '#10B981', dark: '#34D399', emoji: '🏃' },
  Freizeit: { light: '#3B82F6', dark: '#60A5FA', emoji: '🎮' },
  Ausgehen: { light: '#EC4899', dark: '#F472B6', emoji: '✨' },
  Arbeit: { light: '#6366F1', dark: '#818CF8', emoji: '💼' },
  Abend: { light: '#F59E0B', dark: '#FBBF24', emoji: '🌙' },
} as const;
