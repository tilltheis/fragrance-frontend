// Central types and color/icon mappings for the perfume app

export const BUCKETS = [0, 10, 20, 30, 40, 50, 60, 70, 80, 90, 100] as const;
export type BucketKey = typeof BUCKETS[number];
export type BucketDistribution = Partial<Record<BucketKey, number>>;

export interface DistributionStats {
  bucketDistribution: BucketDistribution;
  median: number;
  p25: number;
  p75: number;
  iqr: number;
  count: number;
}

export const SEASONS = ["Frühling", "Sommer", "Herbst", "Winter"] as const;
export type SeasonKey = typeof SEASONS[number];
export type SeasonMap = Partial<Record<SeasonKey, number>>;

export const OCCASIONS = ["Täglich", "Sport", "Freizeit", "Ausgehen", "Arbeit", "Abend"] as const;
export type OccasionKey = typeof OCCASIONS[number];
export type OccasionMap = Partial<Record<OccasionKey, number>>;

export const TYPES = [
  "Animalisch", "Aquatisch", "Blumig", "Chypre", "Cremig", "Erdig", "Fougère", "Frisch",
  "Fruchtig", "Gourmand", "Grün", "Harzig", "Holzig", "Ledrig", "Orientalisch", "Pudrig",
  "Rauchig", "Synthetisch", "Süß", "Würzig", "Zitrus",
] as const;
export type TypeKey = typeof TYPES[number];
export type TypeMap = Partial<Record<TypeKey, number>>;

export type Notes = PyramidNotes | LinearNotes;

export interface PyramidNotes {
  kind: "pyramid";
  head: string[];
  heart: string[];
  base: string[];
}

export interface LinearNotes {
  kind: "linear";
  notes: string[];
}

export interface Fragrance {
  // mandatory
  id: number;
  brandQuery: string;
  nameQuery: string;
  owned: boolean;

  // master data
  brand: string | null;
  name: string | null;
  concentration: string | null; // eg "Eau de Toilette"

  // distributions
  scent: DistributionStats | null;
  longevity: DistributionStats | null;
  sillage: DistributionStats | null;
  pricing: DistributionStats | null;

  // classifications
  season: SeasonMap | null;
  occasion: OccasionMap | null;
  type: TypeMap | null;

  // structure & notes
  notes: Notes | null;

  // user data
  rating: number | null; // 0..1
  reason: string | null;
  comment: string | null;
  sellers: string[] | null;

  // timestamps
  createdAt: Date;
  firstTestedAt: Date | null;
  updatedAt: Date | null;
}

// --- DistributionStats helpers ---
function parseBucketDistribution(dist: any): BucketDistribution | null {
  if (!dist || typeof dist !== 'object') return null;
  const out: BucketDistribution = {};
  for (const k of Object.keys(dist)) {
    if (!BUCKETS.includes(Number(k) as BucketKey)) return null;
    const v = dist[k];
    if (typeof v !== 'number' || !isFinite(v)) return null;
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

function toDistributionStats(dist: any): DistributionStats | null {
  const bucketDistribution = parseBucketDistribution(dist);
  if (!bucketDistribution) return null;
  const median = getPercentileFromBuckets(bucketDistribution, 50);
  const p25 = getPercentileFromBuckets(bucketDistribution, 25);
  const p75 = getPercentileFromBuckets(bucketDistribution, 75);
  const iqr = p75 - p25;
  const count = Object.values(bucketDistribution).reduce((a, b) => a + (b ?? 0), 0);
  return { bucketDistribution, median, p25, p75, iqr, count };
}

export function parseFragrance(item: any): Fragrance {
  return {
    id: item.id,
    brandQuery: item.brandQuery,
    nameQuery: item.nameQuery,
    owned: item.owned,
    brand: item.brand ?? null,
    name: item.name ?? null,
    concentration: item.concentration ?? null,
    scent: toDistributionStats(item.scent),
    longevity: toDistributionStats(item.longevity),
    sillage: toDistributionStats(item.sillage),
    pricing: toDistributionStats(item.pricing),
    season: item.season ?? null,
    occasion: item.occasion ?? null,
    type: item.type ?? null,
    notes: item.structure === "pyramid"
      ? item.head || item.heart || item.base
        ? { kind: "pyramid", head: item.head ?? [], heart: item.heart ?? [], base: item.base ?? [] }
        : null
      : item.structure === "linear"
        ? item.notes
          ? { kind: "linear", notes: item.notes }
          : null
        : null,
    rating: item.rating ?? null,
    reason: item.reason ?? null,
    comment: item.comment ?? null,
    sellers: item.sellers ?? null,
    createdAt: item.createdAt ? new Date(item.createdAt) : new Date(),
    firstTestedAt: item.firstTestedAt ? new Date(item.firstTestedAt) : null,
    updatedAt: item.updatedAt ? new Date(item.updatedAt) : null,
  };
}

export interface ViewState {
  displayMode: 'light' | 'dark' | 'system';
}

export type EmojiColor = { light: string; dark: string; emoji: string };


// Color and icon mappings
export const SEASON_COLORS: Record<SeasonKey, EmojiColor> = {
  "Frühling": { light: "#34D399", dark: "#6EE7B7", emoji: "🌱" },
  "Sommer": { light: "#FBBF24", dark: "#FACC15", emoji: "☀️" },
  "Herbst": { light: "#F97316", dark: "#FB923C", emoji: "🍂" },
  "Winter": { light: "#60A5FA", dark: "#93C5FD", emoji: "❄️" }
} as const;

export const OCCASION_COLORS: Record<OccasionKey, EmojiColor> = {
  "Täglich": { light: "#9CA3AF", dark: "#D1D5DB", emoji: "📅" },
  "Sport": { light: "#10B981", dark: "#34D399", emoji: "🏃" },
  "Freizeit": { light: "#3B82F6", dark: "#60A5FA", emoji: "🎮" },
  "Ausgehen": { light: "#EC4899", dark: "#F472B6", emoji: "✨" },
  "Arbeit": { light: "#6366F1", dark: "#818CF8", emoji: "💼" },
  "Abend": { light: "#F59E0B", dark: "#FBBF24", emoji: "🌙" }
} as const;
