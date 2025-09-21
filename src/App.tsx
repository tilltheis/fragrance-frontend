import React from 'react';
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
  count: number;
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
  const count = Object.values(bucketDistribution).reduce((a, b) => a + (b ?? 0), 0);
  return { bucketDistribution, median, p25, p75, iqr, count };
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

interface ViewState {
  displayMode: 'light' | 'dark' | 'system';
}

const DATA: Fragrance[] = unparsedFragrances.map(parseFragrance);

type EmojiColor = { light: string; dark: string; emoji: string };


// Color and icon mappings
const SEASON_COLORS: Record<SeasonKey, EmojiColor> = {
  "Frühling": { light: "#34D399", dark: "#6EE7B7", emoji: "🌱" },
  "Sommer": { light: "#FBBF24", dark: "#FACC15", emoji: "☀️" },
  "Herbst": { light: "#F97316", dark: "#FB923C", emoji: "🍂" },
  "Winter": { light: "#60A5FA", dark: "#93C5FD", emoji: "❄️" }
} as const;

const OCCASION_COLORS: Record<OccasionKey, EmojiColor> = {
  "Täglich": { light: "#9CA3AF", dark: "#D1D5DB", emoji: "📅" },
  "Sport": { light: "#10B981", dark: "#34D399", emoji: "🏃" },
  "Freizeit": { light: "#3B82F6", dark: "#60A5FA", emoji: "🎮" },
  "Ausgehen": { light: "#EC4899", dark: "#F472B6", emoji: "✨" },
  "Arbeit": { light: "#6366F1", dark: "#818CF8", emoji: "💼" },
  "Abend": { light: "#F59E0B", dark: "#FBBF24", emoji: "🌙" }
} as const;

const TYPE_COLORS: Record<TypeKey, EmojiColor> = {
  "Animalisch": { light: "#92400E", dark: "#B45309", emoji: "🦁" },
  "Aquatisch": { light: "#3B82F6", dark: "#60A5FA", emoji: "🌊" },
  "Blumig": { light: "#EC4899", dark: "#F472B6", emoji: "🌸" },
  "Chypre": { light: "#A3E635", dark: "#84CC16", emoji: "🌿" },
  "Cremig": { light: "#FDE68A", dark: "#FCD34D", emoji: "🥛" },
  "Erdig": { light: "#A16207", dark: "#CA8A04", emoji: "🌱" },
  "Fougère": { light: "#22C55E", dark: "#4ADE80", emoji: "🌾" },
  "Frisch": { light: "#06B6D4", dark: "#22D3EE", emoji: "💨" },
  "Fruchtig": { light: "#F59E0B", dark: "#FBBF24", emoji: "🍑" },
  "Gourmand": { light: "#F472B6", dark: "#F9A8D4", emoji: "🍫" },
  "Grün": { light: "#34D399", dark: "#6EE7B7", emoji: "🍃" },
  "Harzig": { light: "#F59E42", dark: "#FDBA74", emoji: "🪵" },
  "Holzig": { light: "#92400E", dark: "#B45309", emoji: "🌲" },
  "Ledrig": { light: "#B45309", dark: "#D97706", emoji: "🥾" },
  "Orientalisch": { light: "#7C2D12", dark: "#A16207", emoji: "🏺" },
  "Pudrig": { light: "#E0E7FF", dark: "#C7D2FE", emoji: "🧴" },
  "Rauchig": { light: "#6B7280", dark: "#9CA3AF", emoji: "☁️" },
  "Süß": { light: "#EC4899", dark: "#F472B6", emoji: "🍭" },
  "Synthetisch": { light: "#818CF8", dark: "#A5B4FC", emoji: "🧪" },
  "Würzig": { light: "#F97316", dark: "#FB923C", emoji: "🔥" },
  "Zitrus": { light: "#FCD34D", dark: "#FDE68A", emoji: "☀️" }
} as const;

interface CardProps {
  fragrance: Fragrance;
  isDark: boolean;
  onSelect: (id: number) => void;
}

function FragranceCard({ fragrance, isDark, onSelect }: CardProps) {
  // Quality dots
  const getQualityDots = (fragrance: Fragrance) => {
    return fragrance?.scent?.count ?? 0 >= 100 ? "•••" : fragrance?.scent?.count ?? 0 >= 50 ? "••" : "•";
  };

  // Type chips (≥5%)
  const getTypeChips = (typeMap: TypeMap | null) => {
    if (!typeMap) return [];
    const total = Object.values(typeMap).reduce((sum, count) => sum + count, 0);
    if (total === 0) return [];

    return Object.entries(typeMap)
      .map(([type, count]) => ({ type: type as TypeKey, percentage: (count / total) * 100 }))
      .filter(({ percentage }) => percentage >= 5)
      .sort((a, b) => b.percentage - a.percentage)
      .slice(0, 2); // Max 2 chips
  };

  // Stacked bar data with order
  const getStackedBarData = <T extends string>(
    map: Partial<Record<T, number>> | null,
    order: readonly T[]
  ) => {
    if (!map) return [];
    const total = Object.values(map).reduce((sum, count) => sum + count, 0);
    if (total === 0) return [];
    return order
      .map((key) => ({
        key,
        percentage: ((map[key] ?? 0) / total) * 100 
      }))
      .filter(({ percentage }) => percentage > 0);
  };

  const typeChips = getTypeChips(fragrance.type);
  const seasonData = getStackedBarData(fragrance.season, SEASONS);
  const occasionData = getStackedBarData(fragrance.occasion, OCCASIONS);

  return (
    <div
      className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-4 shadow-sm hover:shadow-md transition-shadow cursor-pointer"
      onClick={() => onSelect(fragrance.id)}
    >
      {/* Header */}
      <div className="mb-2">
        <h4 className="text-sm font-semibold text-gray-900 dark:text-gray-100 leading-tight">
          {fragrance.brand || fragrance.brandQuery}
        </h4>
        <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
          {fragrance.name || fragrance.nameQuery}
        </h3>
        {fragrance.concentration && (
          <p className="text-sm text-gray-600 dark:text-gray-400">
            {fragrance.concentration} {getQualityDots(fragrance)}
          </p>
        )}
      </div>

      {/* Type Chips */}
      {typeChips.length > 0 && (
        <div className="mb-3">
          <div className="flex flex-wrap gap-1">
            {typeChips.map(({ type, percentage }) => {
              const config = TYPE_COLORS[type];
              const color = isDark ? config.dark : config.light;
              const ticks = percentage >= 30 ? "▪▪▪" : percentage >= 20 ? "▪▪" : "▪";

              return (
                <span
                  key={type}
                  className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium"
                  style={{
                    backgroundColor: color + "20",
                    color: color,
                    border: `1px solid ${color}40`
                  }}
                  title={`${config.emoji} ${type}: ${Math.round(percentage)}%`}
                >
                  {config.emoji} {type} {ticks}
                </span>
              );
            })}
          </div>
        </div>
      )}

      {/* Season Bar */}
      {seasonData.length > 0 && (
        <div className="mb-2">
          <div className="text-xs text-gray-600 dark:text-gray-400 mb-1">Saison</div>
          <div className="flex h-5 rounded overflow-hidden bg-gray-200 dark:bg-gray-700">
            {seasonData.map(({ key, percentage }) => {
              const config = SEASON_COLORS[key as keyof typeof SEASON_COLORS];
              const color = isDark ? config.dark : config.light;
              return (
                <div
                  key={key}
                  style={{
                    width: `${percentage}%`,
                    backgroundColor: color
                  }}
                  title={`${config.emoji || ""} ${key}: ${Math.round(percentage)}%`}
                >
                  <span
                    className="flex items-center justify-center h-full text-[10px]"
                    style={{
                      textShadow: isDark
                        ? "0 1px 2px #000, 0 0px 2px #000"
                        : "0 1px 2px #fff, 0 0px 2px #fff"
                    }}
                  >
                    {config.emoji}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Occasion Bar */}
      {occasionData.length > 0 && (
        <div className="mb-3">
          <div className="text-xs text-gray-600 dark:text-gray-400 mb-1">Anlass</div>
          <div className="flex h-5 rounded overflow-hidden bg-gray-200 dark:bg-gray-700">
            {occasionData.map(({ key, percentage }) => {
              const config = OCCASION_COLORS[key as keyof typeof OCCASION_COLORS];
              const color = config ? (isDark ? config.dark : config.light) : "#6B7280";
              return (
                <div
                  key={key}
                  style={{
                    width: `${percentage}%`,
                    backgroundColor: color
                  }}
                  title={`${config?.emoji || ""} ${key}: ${Math.round(percentage)}%`}
                >
                  <span
                    className="flex items-center justify-center h-full text-[10px]"
                    style={{
                      textShadow: isDark
                        ? "0 1px 2px #000, 0 0px 2px #000"
                        : "0 1px 2px #fff, 0 0px 2px #fff"
                    }}
                  >
                    {config.emoji}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Stats */}
      <div className="flex justify-between items-center text-sm">
        <div className="flex gap-3">
          {fragrance.scent && (
            <span className="text-gray-600 dark:text-gray-400">
              👃 {fragrance.scent.median}%
            </span>
          )}
          {fragrance.longevity && (
            <span className="text-gray-600 dark:text-gray-400">
              ⏳ {fragrance.longevity.median}%
            </span>
          )}
          {fragrance.sillage && (
            <span className="text-gray-600 dark:text-gray-400">
              🌬️ {fragrance.sillage.median}%
            </span>
          )}
        </div>
      </div>


      <div className="flex justify-between items-center text-sm">
        <div className="flex gap-3">
          {fragrance.rating && (
            <span className="text-blue-600 dark:text-blue-400 font-medium">
              ⭐ {Math.round(fragrance.rating * 100)}%
            </span>
          )}
          {/* Owned Status */}
          <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${fragrance.owned
            ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
            : 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400'
            }`}>
            {fragrance.owned ? '✅ Besitze ich' : '— Nicht besessen'}
          </span>
        </div>
      </div>
    </div>
  );
}

export default function App() {
  const [isDark, setIsDark] = React.useState(false);
  const [selectedId, setSelectedId] = React.useState<number | null>(null);

  // Dark mode effect
  React.useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    setIsDark(mediaQuery.matches);

    const handler = (e: MediaQueryListEvent) => setIsDark(e.matches);
    mediaQuery.addEventListener('change', handler);
    return () => mediaQuery.removeEventListener('change', handler);
  }, []);

  // Toggle dark mode
  React.useEffect(() => {
    document.documentElement.classList.toggle('dark', isDark);
  }, [isDark]);

  const handleCardSelect = (id: number) => {
    setSelectedId(id);
    // TODO: Open detail view
    console.log('Selected fragrance:', id);
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 transition-colors">
      {/* Header */}
      <header className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex justify-between items-center">
            <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
              Duftsammlung
            </h1>
            <button
              onClick={() => setIsDark(!isDark)}
              className="px-3 py-2 rounded-md bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
            >
              {isDark ? '☀️' : '🌙'}
            </button>
          </div>
          <p className="text-gray-600 dark:text-gray-400 mt-1">
            {DATA.length} Düfte in der Sammlung
          </p>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 py-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {DATA.map((fragrance) => (
            <FragranceCard
              key={fragrance.id}
              fragrance={fragrance}
              isDark={isDark}
              onSelect={handleCardSelect}
            />
          ))}
        </div>
      </main>
    </div>
  );
}
