// Duftdaten – vollständige TypeScript-Modelle
// Stand: 21.09.2025
// Hinweise:
// - Laut Vorgabe können ALLE Felder außer id, "brand query", "name query" und owned fehlen.
// - test_date und last_edited sind in FragranceRecord enthalten (ISO-UTC-Strings oder null).
// - Keine Pagination im ViewState.
// - reason und comment sind im FilterState als eigenständige Top-Level-Query-Felder.
// - quality_level / quality_total_n sind abgeleitet und werden NICHT exportiert.

// ---------------------------------------------
// Grundtypen
// ---------------------------------------------
export type BucketKey = '0' | '10' | '20' | '30' | '40' | '50' | '60' | '70' | '80' | '90' | '100';
export type BucketDistribution = Partial<Record<BucketKey, number>>;

export type SeasonKey = 'Frühling' | 'Sommer' | 'Herbst' | 'Winter';
export type SeasonMap = Partial<Record<SeasonKey, number>>;

export type OccasionKey = 'Täglich' | 'Sport' | 'Freizeit' | 'Ausgehen' | 'Arbeit' | 'Abend';
export type OccasionMap = Partial<Record<OccasionKey, number>>;

export type TypeMap = Record<string, number>; // offenes Vokabular
export type Structure = 'pyramid' | 'linear';

export const SEASON_ORDER: SeasonKey[] = ['Frühling', 'Sommer', 'Herbst', 'Winter'];
export const OCCASION_ORDER: OccasionKey[] = ['Täglich', 'Sport', 'Freizeit', 'Arbeit', 'Ausgehen', 'Abend'];
export const BUCKETS: BucketKey[] = ['0', '10', '20', '30', '40', '50', '60', '70', '80', '90', '100'];

export function isBucketKey(k: string): k is BucketKey {
  return BUCKETS.includes(k as BucketKey);
}
export function isBucketDistribution(v: unknown): v is BucketDistribution {
  if (v && typeof v === 'object') return Object.keys(v as Record<string, unknown>).every(isBucketKey);
  return false;
}

// ---------------------------------------------
// Kerndaten – FragranceRecord (Rohdaten)
// ---------------------------------------------
export interface FragranceRecord {
  // Pflicht
  id: number;
  'brand query': string;
  'name query': string;
  owned: boolean;

  // Optional: Stammdaten
  brand?: string; // exakter Markenname
  name?: string; // exakter Duftname
  concentration?: string | null; // z. B. "Eau de Toilette"

  // Verteilungen
  scent?: BucketDistribution;
  longevity?: BucketDistribution;
  sillage?: BucketDistribution;
  pricing?: BucketDistribution | null;

  // Klassifizierungen
  season?: SeasonMap;
  occasion?: OccasionMap;
  type?: TypeMap;

  // Struktur & Noten
  structure?: Structure;
  head?: string[]; // bei pyramid
  heart?: string[]; // bei pyramid
  base?: string[]; // bei pyramid
  notes?: string[]; // bei linear

  // Persönlich
  rating?: number | null; // 0..1
  reason?: string | null;
  comment?: string | null;
  sellers?: string[];

  // Zeitstempel (ISO-UTC, Anzeige lokal)
  test_date?: string | null; // Zeitpunkt der ersten Bewertung
  last_edited?: string | null; // Zeitpunkt der letzten Änderung
}

export type FragranceData = FragranceRecord[];

// ---------------------------------------------
// Filter- & UI-State (keine Pagination)
// ---------------------------------------------
export type SortKey = 'brand' | 'name' | 'id' | 'test_date' | 'best_match';
export type SortDir = 'asc' | 'desc';

export interface FilterState {
  brand: string[]; // exact-match Tokens
  name: string[]; // exact-match Tokens
  types: string[]; // Dufttypen
  notes: string[]; // Duftnoten
  notesMode: 'AND' | 'OR';
  season: SeasonKey[]; // Treffer wenn ≥20 %
  occasion: OccasionKey[]; // Treffer wenn ≥20 %
  scent: [number, number]; // 0..100 (5%-Steps)
  longevity: [number, number]; // 0..100
  sillage: [number, number]; // 0..100
  rating: [number, number]; // 0..100 (pers. Rating * 100)
  owned: 'all' | 'yes' | 'no';
  sellers: string[];
  quality: ('Low' | 'Mid' | 'High')[];
  // Textsuche als Top-Level Felder
  reasonQuery?: string; // substring
  commentQuery?: string; // substring
  // Datumsspannen (ISO im State, Konvertierung bei Persistenz möglich)
  testDate?: { from?: string; to?: string };
  lastEdited?: { from?: string; to?: string };
}

export interface ViewState {
  view: 'table' | 'cards';
  sort: { key: SortKey; dir: SortDir };
  showTextAndSellers: boolean; // globaler Toggle (Reason/Comment/Sellers)
  showNotes: boolean; // Kopf/Herz/Basis einblenden
  darkMode: 'light' | 'dark' | 'system';
}

// ---------------------------------------------
// Scoring & Ableitungen
// ---------------------------------------------
export interface ScoringWeights {
  text: number;
  fach: number;
  quality: number;
  personal: number;
}
export interface MatchBreakdown {
  text: number;
  fach: number;
  quality: number;
  personal: number;
  total: number;
  tieBreak: { text: number; fach: number; quality: number; rating: number; testDate: number; id: number };
}

export type QualityLevel = 'Low' | 'Mid' | 'High';
export interface QualityIndicator {
  level: QualityLevel;
  n: number;
}

export interface DistributionStats {
  median: number;
  p25: number;
  p75: number;
  iqr: number;
}
export interface DerivedStats {
  scent?: DistributionStats;
  longevity?: DistributionStats;
  sillage?: DistributionStats;
  pricing?: DistributionStats;
}

// ---------------------------------------------
// Taxonomien & Suche
// ---------------------------------------------
export interface Taxonomy {
  notes: string[];
  types: string[];
  sellers: string[];
  brands: string[];
  namesByBrand: Record<string, string[]>;
}

export interface SearchIndex {
  brandTokens: string[];
  nameTokens: string[];
  typeTokens: string[];
  noteTokens: string[];
  sellerTokens: string[];
}

// ---------------------------------------------
// Persistenz (LocalStorage / Import-Export)
// ---------------------------------------------
export interface UserPreferences {
  darkMode: 'light' | 'dark' | 'system';
  lastView?: ViewState['view'];
  pageSize?: number; // optional nur für Tabellenzeilenhöhe/Rendering, keine Pagination
}

export interface PersistedState {
  filters: FilterState;
  view: ViewState;
  prefs: UserPreferences;
  datasetVersion?: string; // zur Migration
}

// Import/Export: identisch mit FragranceRecord (keine abgeleiteten Felder)
export type ImportExportLine = FragranceRecord;

// ---------------------------------------------
// Charts & UI-Modelle
// ---------------------------------------------
export interface StackedSegment {
  key: string;
  value: number;
}
export interface StackedBarData {
  total: number;
  segments: StackedSegment[];
}

export interface HistogramPoint {
  bucket: BucketKey;
  count: number;
}
export interface HistogramSeries {
  points: HistogramPoint[];
  median?: number;
  p25?: number;
  p75?: number;
}

export interface ChipModel {
  label: string;
  icon?: string;
  tint?: string;
  intensity?: number;
}

export interface FragranceViewModel {
  id: number;
  brand?: string; // getrennt
  name?: string; // getrennt
  concentration?: string | null;
  owned: boolean;
  qualityDot?: '•' | '••' | '•••';
  typeChips: ChipModel[];
  seasonBar: StackedBarData;
  occasionBar: StackedBarData;
  medians: { scent?: number; longevity?: number; sillage?: number };
  myRatingPct?: number | null; // 0..100
  showTextBlock?: boolean; // globaler Toggle anwendbar
}
