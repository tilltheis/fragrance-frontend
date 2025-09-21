import unparsedFragrances from './fragrances.json';

const BUCKETS = [0, 10, 20, 30, 40, 50, 60, 70, 80, 90, 100] as const;
type BucketKey = typeof BUCKETS[number];
type BucketDistribution = Partial<Record<BucketKey, number>>;

interface DistributionStats {
  bucketDistribution: BucketDistribution;
  median: number;
  p25: number;
  p75: number;
  iqr: number;
}

const SEASONS = ["Frühling", "Sommer", "Herbst", "Winter"] as const;
type SeasonKey = typeof SEASONS[number];
type SeasonMap = Partial<Record<SeasonKey, number>>;

const OCCASIONS = ["Täglich", "Sport", "Freizeit", "Ausgehen", "Arbeit", "Abend"] as const;
type OccasionKey = typeof OCCASIONS[number];
type OccasionMap = Partial<Record<OccasionKey, number>>;

const TYPES = [
  "Animalisch", "Aquatisch", "Blumig", "Chypre", "Cremig", "Erdig", "Fougère", "Frisch",
  "Fruchtig", "Gourmand", "Grün", "Harzig", "Holzig", "Ledrig", "Orientalisch", "Pudrig",
  "Rauchig", "Synthetisch", "Süß", "Würzig", "Zitrus",
] as const;
type TypeKey = typeof TYPES[number];
type TypeMap = Partial<Record<TypeKey, number>>;

type Notes = PyramidNotes | LinearNotes;

interface PyramidNotes {
  kind: "pyramid";
  head: string[];
  heart: string[];
  base: string[];
}

interface LinearNotes {
  kind: "linear";
  notes: string[];
}

interface Fragrance {
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
  return { bucketDistribution, median, p25, p75, iqr };
}

function parseFragrance(item: any): Fragrance {
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

const DATA: Fragrance[] = unparsedFragrances.map(parseFragrance);


export default function App() {
  return (
    <pre style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
      {JSON.stringify(DATA, null, 2)}
    </pre>
  );
}
