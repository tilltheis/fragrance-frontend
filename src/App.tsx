import React, { createContext, useCallback, useEffect, useMemo, useState } from 'react';
import type {
  FragranceData,
  FragranceRecord,
  FilterState,
  ViewState,
  BucketDistribution,
  MatchBreakdown,
  ScoringWeights
} from './models';

// --------------------------------------------------
// Annahmen / TODO:
// - Quality-Level Ableitung vorerst Dummy (Random / Platzhalter)
// - Persistenz (LocalStorage) folgt in späterem Schritt
// - Import realer Daten (JSONL) später; aktuell Sample
// - Styling: Tailwind Utility Basis; spätere Extraktion in Komponenten
// --------------------------------------------------

// Threshold Konstanten laut Spezifikation
const TYPE_MIN_PERCENT = 5; // Anzeige + Filter
const SEASON_OCCASION_FILTER_THRESHOLD = 20; // Filter Trefferlogik >=20%

// Scoring Gewichte laut Spezifikation
const SCORING_WEIGHTS: ScoringWeights = { text: 0.45, fach: 0.30, quality: 0.15, personal: 0.10 };

// --------------------------------------------------
// Helper Funktionen
// --------------------------------------------------
function sumDistribution(d: BucketDistribution | undefined): number {
  if (!d) return 0;
  return Object.values(d).reduce((a, b) => a + (b ?? 0), 0);
}

function percentileFromBuckets(d: BucketDistribution | undefined, pct: number): number | undefined {
  if (!d) return undefined;
  const total = sumDistribution(d);
  if (!total) return undefined;
  const ordered: { bucket: number; count: number }[] = Object.entries(d)
    .filter(([k]) => k !== undefined)
    .map(([k, v]) => ({ bucket: Number(k), count: v ?? 0 }))
    .sort((a, b) => a.bucket - b.bucket);
  let acc = 0;
  const target = (pct / 100) * total;
  for (const o of ordered) {
    acc += o.count;
    if (acc >= target) return o.bucket;
  }
  return ordered[ordered.length - 1]?.bucket;
}

function medianBucket(d: BucketDistribution | undefined): number | undefined {
  return percentileFromBuckets(d, 50);
}

function quartiles(d: BucketDistribution | undefined): { p25?: number; p50?: number; p75?: number; iqr?: number } {
  if (!d) return {};
  const p25 = percentileFromBuckets(d, 25);
  const p50 = percentileFromBuckets(d, 50);
  const p75 = percentileFromBuckets(d, 75);
  const iqr = p25 != null && p75 != null ? p75 - p25 : undefined;
  return { p25, p50, p75, iqr };
}

function withinRange(valuePct: number | undefined, range: [number, number]): boolean {
  if (valuePct == null) return false; // wenn keine Daten -> fällt raus
  return valuePct >= range[0] && valuePct <= range[1];
}

// ratio Helper derzeit ungenutzt – wird evtl. später für Tooltips gebraucht

function anyKeyAtLeast(map: Record<string, number> | undefined, keys: string[], threshold: number): boolean {
  if (!map || !keys.length) return true; // kein Filter -> passt
  const total = Object.values(map).reduce((a, b) => a + b, 0) || 1;
  return keys.some(k => ((map[k] ?? 0) / total) * 100 >= threshold);
}

function allNotesPresent(record: FragranceRecord, notes: string[]): boolean {
  const set = new Set<string>([
    ...(record.head ?? []),
    ...(record.heart ?? []),
    ...(record.base ?? []),
    ...(record.notes ?? [])
  ].map(n => n.toLowerCase()));
  return notes.every(n => set.has(n.toLowerCase()));
}

function anyNotesPresent(record: FragranceRecord, notes: string[]): boolean {
  const set = new Set<string>([
    ...(record.head ?? []),
    ...(record.heart ?? []),
    ...(record.base ?? []),
    ...(record.notes ?? [])
  ].map(n => n.toLowerCase()));
  return notes.some(n => set.has(n.toLowerCase()));
}

// Dummy Quality Ableitung (Platzhalter) -> könnte später aus externen Aggregaten kommen
function deriveQuality(record: FragranceRecord): { level: 'Low' | 'Mid' | 'High'; n: number } {
  // Heuristik: median longevity bestimmt Level
  const med = medianBucket(record.longevity) ?? 0;
  if (med >= 70) return { level: 'High', n: 0 };
  if (med >= 40) return { level: 'Mid', n: 0 };
  return { level: 'Low', n: 0 };
}

// TODO: Qualität n später aus aggregierten Originaldaten befüllen.

function clampRange(range: [number, number]): [number, number] {
  return [Math.max(0, range[0]), Math.min(100, range[1])];
}

// Best Match Scoring (vereinfachtes erstes Mapping, detailgenauer Ausbau folgt)
function computeMatch(record: FragranceRecord, filters: FilterState): MatchBreakdown {
  // Text Score Elemente
  let textScore = 0;
  let textParts = 0;
  // Brand/Name exact token
  if (filters.brand.length) {
    const exact = filters.brand.some(b => b === (record.brand ?? record['brand query']));
    textScore += exact ? 1 : 0;
    textParts++;
  }
  if (filters.name.length) {
    const exactName = filters.name.some(n => n === (record.name ?? record['name query']));
    textScore += exactName ? 1 : 0;
    textParts++;
  }
  // Reason/Comment substring (gewicht 0.5 -> hier normalisieren wir separat)
  let rcScoreAcc = 0;
  let rcParts = 0;
  if (filters.reasonQuery) {
    rcParts++;
    rcScoreAcc += (record.reason ?? '').toLowerCase().includes(filters.reasonQuery.toLowerCase()) ? 1 : 0;
  }
  if (filters.commentQuery) {
    rcParts++;
    rcScoreAcc += (record.comment ?? '').toLowerCase().includes(filters.commentQuery.toLowerCase()) ? 1 : 0;
  }
  if (rcParts) {
    textScore += 0.5 * (rcScoreAcc / rcParts);
    textParts++;
  }
  const textNorm = textParts ? textScore / textParts : 0;

  // Fach Score: vereinfachte Aggregation (Saison + Occasion Mittel)
  let fachScore = 0;
  let fachParts = 0;
  if (filters.season.length) {
    fachParts++;
    fachScore += anyKeyAtLeast(record.season as Record<string, number>, filters.season, SEASON_OCCASION_FILTER_THRESHOLD) ? 1 : 0;
  }
  if (filters.occasion.length) {
    fachParts++;
    fachScore += anyKeyAtLeast(record.occasion as Record<string, number>, filters.occasion, SEASON_OCCASION_FILTER_THRESHOLD) ? 1 : 0;
  }
  const fachNorm = fachParts ? fachScore / fachParts : 0;

  // Quality Score (Mapping)
  const q = deriveQuality(record);
  const qualityScore = q.level === 'High' ? 1 : q.level === 'Mid' ? 0.5 : 0;

  // Personal Score: Rating + Owned (+0.1) (Rating 0..1)
  const personalScore = (record.rating ?? 0) + (record.owned ? 0.1 : 0);
  // TODO: Owned Bonus deckeln? Spezifikation: +0.1 additiv (bereits umgesetzt)

  const total = SCORING_WEIGHTS.text * textNorm +
    SCORING_WEIGHTS.fach * fachNorm +
    SCORING_WEIGHTS.quality * qualityScore +
    SCORING_WEIGHTS.personal * personalScore;

  return {
    text: textNorm,
    fach: fachNorm,
    quality: qualityScore,
    personal: personalScore,
    total,
    tieBreak: {
      text: textNorm,
      fach: fachNorm,
      quality: qualityScore,
      rating: record.rating ?? 0,
      testDate: record.test_date ? Date.parse(record.test_date) : 0,
      id: record.id
    }
  };
}

// --------------------------------------------------
// Sample Data (Minimal)
// --------------------------------------------------
import sampleData from './perfumes.json';
const SAMPLE_DATA: FragranceData = sampleData as FragranceData;

// --------------------------------------------------
// Initial States
// --------------------------------------------------
const initialFilters: FilterState = {
  brand: [],
  name: [],
  types: [],
  notes: [],
  notesMode: 'OR',
  season: [],
  occasion: [],
  scent: [0, 100],
  longevity: [0, 100],
  sillage: [0, 100],
  rating: [0, 100],
  owned: 'all',
  sellers: [],
  quality: [],
  reasonQuery: undefined,
  commentQuery: undefined,
  testDate: undefined,
  lastEdited: undefined
};

const initialView: ViewState = {
  view: 'cards',
  sort: { key: 'id', dir: 'desc' },
  showTextAndSellers: false,
  showNotes: false,
  darkMode: 'light'
};

// --------------------------------------------------
// Context Definition
// --------------------------------------------------
interface AppContextValue {
  data: FragranceData;
  setData: React.Dispatch<React.SetStateAction<FragranceData>>;
  filters: FilterState;
  setFilters: (patch: Partial<FilterState>) => void;
  view: ViewState;
  setView: (patch: Partial<ViewState>) => void;
  filtered: FragranceRecord[];
  updateRecord: (id: number, patch: Partial<FragranceRecord>) => void;
}

const AppContext = createContext<AppContextValue | undefined>(undefined);

// useAppCtx Hook könnte exportiert werden wenn externe Komponenten ausgelagert werden.

// --------------------------------------------------
// Filter Logik (vollständig implementieren in späterem Schritt; hier Grundlogik)
// --------------------------------------------------
function applyFilters(data: FragranceData, filters: FilterState): FragranceRecord[] {
  return data.filter(r => {
    // brand exact tokens
    if (filters.brand.length && !filters.brand.includes(r.brand ?? r['brand query'])) return false;
    if (filters.name.length && !filters.name.includes(r.name ?? r['name query'])) return false;
    if (filters.owned === 'yes' && !r.owned) return false;
    if (filters.owned === 'no' && r.owned) return false;
    // rating range
    if (r.rating != null) {
      const pct = Math.round(r.rating * 100);
      if (!withinRange(pct, clampRange(filters.rating))) return false;
    } else {
      // Kein Rating -> nur zulassen wenn Range ab 0 beginnt
      if (filters.rating[0] > 0) return false;
    }
    // Median-basierte Ranges scent / longevity / sillage
    const medLon = medianBucket(r.longevity);
    if (medLon != null) {
      if (!withinRange(medLon, clampRange(filters.longevity))) return false;
    } else if (filters.longevity[0] > 0 || filters.longevity[1] < 100) return false;

    const medSil = medianBucket(r.sillage);
    if (medSil != null) {
      if (!withinRange(medSil, clampRange(filters.sillage))) return false;
    } else if (filters.sillage[0] > 0 || filters.sillage[1] < 100) return false;

    const medScent = medianBucket(r.scent);
    if (medScent != null) {
      if (!withinRange(medScent, clampRange(filters.scent))) return false;
    } else if (filters.scent[0] > 0 || filters.scent[1] < 100) return false;
    // reason/comment substring
    if (filters.reasonQuery && !(r.reason ?? '').toLowerCase().includes(filters.reasonQuery.toLowerCase())) return false;
    if (filters.commentQuery && !(r.comment ?? '').toLowerCase().includes(filters.commentQuery.toLowerCase())) return false;
    // season filter (≥20%)
    if (filters.season.length && !anyKeyAtLeast(r.season as Record<string, number>, filters.season, SEASON_OCCASION_FILTER_THRESHOLD)) return false;
    if (filters.occasion.length && !anyKeyAtLeast(r.occasion as Record<string, number>, filters.occasion, SEASON_OCCASION_FILTER_THRESHOLD)) return false;
    // types filter (≥5%)
    if (filters.types.length) {
      const totalType = Object.values(r.type ?? {}).reduce((a, b) => a + b, 0) || 1;
      const ok = filters.types.some(t => ((r.type?.[t] ?? 0) / totalType) * 100 >= TYPE_MIN_PERCENT);
      if (!ok) return false;
    }
    // notes filter
    if (filters.notes.length) {
      if (filters.notesMode === 'AND') {
        if (!allNotesPresent(r, filters.notes)) return false;
      } else {
        if (!anyNotesPresent(r, filters.notes)) return false;
      }
    }
    // sellers filter (OR innerhalb Kategorie)
    if (filters.sellers.length) {
      const recSellers = r.sellers ?? [];
      if (!recSellers.some(s => filters.sellers.includes(s))) return false;
    }
    // quality filter (abgeleitet)
    if (filters.quality.length) {
      const q = deriveQuality(r).level;
      if (!filters.quality.includes(q)) return false;
    }
    // date ranges
    if (filters.testDate?.from) {
      const td = r.test_date ? Date.parse(r.test_date) : 0;
      if (td < Date.parse(filters.testDate.from)) return false;
    }
    if (filters.testDate?.to) {
      const td = r.test_date ? Date.parse(r.test_date) : 0;
      if (td > Date.parse(filters.testDate.to)) return false;
    }
    if (filters.lastEdited?.from) {
      const le = r.last_edited ? Date.parse(r.last_edited) : 0;
      if (le < Date.parse(filters.lastEdited.from)) return false;
    }
    if (filters.lastEdited?.to) {
      const le = r.last_edited ? Date.parse(r.last_edited) : 0;
      if (le > Date.parse(filters.lastEdited.to)) return false;
    }
    return true;
  });
}

// --------------------------------------------------
// Sortierung inkl. best_match (Platzhalter Detailtiefe folgt)
// --------------------------------------------------
function sortData(records: FragranceRecord[], view: ViewState, filters: FilterState): FragranceRecord[] {
  if (view.sort.key === 'best_match') {
    return [...records]
      .map(r => ({ r, score: computeMatch(r, filters) }))
      .sort((a, b) => {
        if (b.score.total !== a.score.total) return b.score.total - a.score.total;
        // Tie-Breaker Reihenfolge: Text > Fach > Qualität > Rating > Testdatum > ID
        if (b.score.text !== a.score.text) return b.score.text - a.score.text;
        if (b.score.fach !== a.score.fach) return b.score.fach - a.score.fach;
        if (b.score.quality !== a.score.quality) return b.score.quality - a.score.quality;
        if (b.score.personal !== a.score.personal) return b.score.personal - a.score.personal;
        const tdA = a.r.test_date ? Date.parse(a.r.test_date) : 0;
        const tdB = b.r.test_date ? Date.parse(b.r.test_date) : 0;
        if (tdB !== tdA) return tdB - tdA;
        return b.r.id - a.r.id;
      })
      .map(x => x.r);
  }
  const dirMul = view.sort.dir === 'asc' ? 1 : -1;
  return [...records].sort((a, b) => {
    switch (view.sort.key) {
      case 'brand':
        return dirMul * (a.brand ?? a['brand query']).localeCompare(b.brand ?? b['brand query']);
      case 'name':
        return dirMul * (a.name ?? a['name query']).localeCompare(b.name ?? b['name query']);
      case 'test_date': {
        const ta = a.test_date ? Date.parse(a.test_date) : 0;
        const tb = b.test_date ? Date.parse(b.test_date) : 0;
        return dirMul * (ta - tb);
      }
      case 'id':
      default:
        return dirMul * (a.id - b.id);
    }
  });
}

// --------------------------------------------------
// UI Komponenten (Inline für erste Iteration)
// --------------------------------------------------
const Card: React.FC<{ rec: FragranceRecord; showTexts: boolean; showNotes: boolean; onSelect: () => void }>= ({ rec, showTexts, showNotes, onSelect }) => {
  const quality = deriveQuality(rec).level;
  const dots = quality === 'High' ? '•••' : quality === 'Mid' ? '••' : '•';
  const medLongevity = medianBucket(rec.longevity);
  const medSillage = medianBucket(rec.sillage);
  const medScent = medianBucket(rec.scent);
  // Type Chips ≥5%
  const typeChips = (() => {
    const t = rec.type ?? {};
    const total = Object.values(t).reduce((a, b) => a + b, 0) || 1;
    return Object.entries(t)
      .filter(([_, v]) => (v / total) * 100 >= TYPE_MIN_PERCENT)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 6)
      .map(([k]) => k);
  })();
  function bar(from?: Record<string, number>, palette?: Record<string, string>) {
    if (!from) return null;
    const total = Object.values(from).reduce((a, b) => a + b, 0) || 1;
    const entries = Object.entries(from).filter(([_, v]) => v > 0);
    return (
      <div className="flex h-3 w-full overflow-hidden rounded bg-slate-200/60 dark:bg-slate-700/60">
        {entries.map(([k, v]) => {
          const pct = (v / total) * 100;
          const color = palette?.[k] || 'var(--tw-prose-body)';
          return <div key={k} style={{ width: pct + '%', backgroundColor: color }} title={k + ' ' + Math.round(pct) + '%'} />;
        })}
      </div>
    );
  }
  const seasonColors: Record<string, string> = { 'Frühling': '#34D399', 'Sommer': '#FBBF24', 'Herbst': '#F97316', 'Winter': '#60A5FA' };
  const occasionColors: Record<string, string> = { 'Täglich': '#9CA3AF', 'Sport': '#10B981', 'Freizeit': '#3B82F6', 'Arbeit': '#6366F1', 'Ausgehen': '#EC4899', 'Abend': '#F59E0B' };
  return (
    <div className="border rounded p-3 bg-white dark:bg-slate-800 dark:border-slate-600 shadow-sm flex flex-col gap-2 text-sm" onClick={onSelect}>
      <div className="font-semibold text-slate-900 dark:text-slate-100 flex flex-wrap items-center gap-1">
        <span>{rec.brand ?? rec['brand query']}</span>
        <span>•</span>
        <span>{rec.name ?? rec['name query']}</span>
        {rec.concentration && <span className="opacity-70">{rec.concentration}</span>}
        <span>{dots}</span>
        <span className={rec.owned ? 'text-emerald-600 dark:text-emerald-400' : 'opacity-50'}>{rec.owned ? '✅' : '—'}</span>
      </div>
      {!!typeChips.length && (
        <div className="flex flex-wrap gap-1">
          {typeChips.map(t => <span key={t} className="px-2 py-0.5 rounded-full bg-indigo-50 dark:bg-indigo-900/40 text-indigo-700 dark:text-indigo-300 text-[10px]">{t}</span>)}
        </div>
      )}
      {rec.season && bar(rec.season as Record<string, number>, seasonColors)}
      {rec.occasion && bar(rec.occasion as Record<string, number>, occasionColors)}
      <div className="flex gap-3 text-xs text-slate-600 dark:text-slate-300">
        {medLongevity !== undefined && <span>⏳ {medLongevity}%</span>}
        {medSillage !== undefined && <span>🌬️ {medSillage}%</span>}
        {medScent !== undefined && <span>👃 {medScent}%</span>}
        {typeof rec.rating === 'number' && <span>⭐ {Math.round(rec.rating * 100)}%</span>}
      </div>
      {showNotes && (
        <div className="flex flex-wrap gap-1">
          {[...(rec.head ?? []), ...(rec.heart ?? []), ...(rec.base ?? []), ...(rec.notes ?? [])].slice(0, 12).map(n => (
            <span key={n} className="px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-700 text-xs">{n}</span>
          ))}
        </div>
      )}
      {showTexts && (
        <div className="space-y-1 text-slate-700 dark:text-slate-200">
          {rec.reason && <p className="text-xs"><strong>Reason:</strong> {rec.reason}</p>}
          {rec.comment && <p className="text-xs"><strong>Comment:</strong> {rec.comment}</p>}
          {!!rec.sellers?.length && <p className="text-xs"><strong>Sellers:</strong> {rec.sellers.join(', ')}</p>}
        </div>
      )}
    </div>
  );
};

const Detail: React.FC<{ rec: FragranceRecord; onClose: () => void; update: (p: Partial<FragranceRecord>) => void; }> = ({ rec, onClose, update }) => {
  const quality = deriveQuality(rec);
  const localDate = (iso?: string | null) => (iso ? new Date(iso).toLocaleString() : '—');
  const qLon = quartiles(rec.longevity);
  const qSil = quartiles(rec.sillage);
  const qSc = quartiles(rec.scent);
  return (
    <div className="fixed inset-0 bg-black/40 flex items-start justify-center overflow-auto p-6 z-20">
      <div className="bg-white dark:bg-slate-900 dark:text-slate-100 rounded-lg shadow-xl max-w-3xl w-full p-6 flex flex-col gap-4 text-sm">
        <div className="flex justify-between items-start gap-4">
          <h2 className="font-semibold text-lg">{rec.brand ?? rec['brand query']} • {rec.name ?? rec['name query']} {rec.concentration && <span className="text-sm font-normal">({rec.concentration})</span>} <span className="ml-1">{quality.level === 'High' ? '•••' : quality.level === 'Mid' ? '••' : '•'}</span></h2>
          <button onClick={onClose} className="text-slate-500 hover:text-slate-700 dark:hover:text-slate-200">✕</button>
        </div>
        <div className="text-xs opacity-70">Erstbewertung: {localDate(rec.test_date)} · Letzte Änderung: {localDate(rec.last_edited)}</div>
        <div className="grid md:grid-cols-2 gap-4">
          <div className="space-y-3">
            <div>
              <label className="block text-xs font-medium mb-1">Mein Rating: {typeof rec.rating === 'number' ? Math.round(rec.rating * 100) + '%' : '—'}</label>
              <input type="range" min={0} max={100} step={5} value={Math.round((rec.rating ?? 0) * 100)} onChange={e => {
                const val = parseInt(e.target.value, 10) / 100;
                update({ rating: val, test_date: rec.test_date ?? new Date().toISOString(), last_edited: new Date().toISOString() });
              }} className="w-full" />
            </div>
            <div className="flex items-center gap-2">
              <label className="text-xs font-medium">Owned</label>
              <input type="checkbox" checked={rec.owned} onChange={e => update({ owned: e.target.checked, last_edited: new Date().toISOString() })} />
            </div>
            <div>
              <label className="block text-xs font-medium mb-1">Reason</label>
              <textarea className="w-full rounded border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 p-2" rows={3} value={rec.reason ?? ''} onChange={e => update({ reason: e.target.value })} />
            </div>
            <div>
              <label className="block text-xs font-medium mb-1">Comment</label>
              <textarea className="w-full rounded border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 p-2" rows={3} value={rec.comment ?? ''} onChange={e => update({ comment: e.target.value })} />
            </div>
            <div>
              <label className="block text-xs font-medium mb-1">Sellers (kommagetrennt)</label>
              <input className="w-full rounded border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 p-2" value={(rec.sellers ?? []).join(', ')} onChange={e => update({ sellers: e.target.value.split(',').map(s => s.trim()).filter(Boolean) })} />
            </div>
          </div>
          <div className="space-y-4">
            <div>
              <div className="font-medium mb-1">Noten</div>
              <div className="flex flex-wrap gap-1">
                {[...(rec.head ?? []), ...(rec.heart ?? []), ...(rec.base ?? []), ...(rec.notes ?? [])].map(n => (
                  <span key={n} className="px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-700 text-xs">{n}</span>
                ))}
              </div>
            </div>
            <div>
              <div className="font-medium mb-1">Statistik (Medians)</div>
              <ul className="text-xs space-y-0.5">
                <li>Haltbarkeit: {medianBucket(rec.longevity) ?? '—'}%</li>
                <li>Sillage: {medianBucket(rec.sillage) ?? '—'}%</li>
                <li>Scent: {medianBucket(rec.scent) ?? '—'}%</li>
                <li className="opacity-70">IQR Longevity: {qLon.iqr != null ? qLon.iqr + '%' : '—'}</li>
                <li className="opacity-70">IQR Sillage: {qSil.iqr != null ? qSil.iqr + '%' : '—'}</li>
                <li className="opacity-70">IQR Scent: {qSc.iqr != null ? qSc.iqr + '%' : '—'}</li>
              </ul>
            </div>
          </div>
        </div>
        <div className="flex justify-between items-center pt-2">
          <button onClick={() => {
            if (confirm('Bewertung wirklich zurücksetzen?')) {
              update({ rating: null, test_date: null, last_edited: new Date().toISOString() });
            }
          }} className="text-xs px-3 py-1 rounded bg-red-100 text-red-700 hover:bg-red-200 dark:bg-red-900 dark:text-red-300 dark:hover:bg-red-800">Bewertung zurücksetzen</button>
          <div className="text-[10px] opacity-60">Qualität n: {quality.n}</div>
        </div>
      </div>
    </div>
  );
};

// Hauptkomponente
export default function App() {
  const [data, setData] = useState<FragranceData>(SAMPLE_DATA);
  const [filters, setFiltersState] = useState<FilterState>(initialFilters);
  const [view, setViewState] = useState<ViewState>(initialView);
  const [selectedId, setSelectedId] = useState<number | null>(null);

  const setFilters = useCallback((patch: Partial<FilterState>) => {
    setFiltersState(prev => ({ ...prev, ...patch }));
  }, []);

  const setView = useCallback((patch: Partial<ViewState>) => {
    setViewState(prev => ({ ...prev, ...patch }));
  }, []);

  const filtered = useMemo(() => {
    const base = applyFilters(data, filters);
    return sortData(base, view, filters);
  }, [data, filters, view]);

  const updateRecord = useCallback((id: number, patch: Partial<FragranceRecord>) => {
    setData(prev => prev.map(r => (r.id === id ? { ...r, ...patch, last_edited: patch.last_edited ?? new Date().toISOString() } : r)));
  }, []);

  const ctxValue: AppContextValue = {
    data,
    setData,
    filters,
    setFilters,
    view,
    setView,
    filtered,
    updateRecord
  } as AppContextValue & { updateRecord: (id: number, patch: Partial<FragranceRecord>) => void; };

  // Dark mode class toggling
  useEffect(() => {
    const root = document.documentElement;
    const dark = view.darkMode === 'dark' || (view.darkMode === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches);
    root.classList.toggle('dark', dark);
  }, [view.darkMode]);

  // Load persisted state once
  useEffect(() => {
    try {
      const raw = localStorage.getItem('duftdaten_state_v1');
      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed.filters) setFiltersState({ ...initialFilters, ...parsed.filters });
        if (parsed.view) setViewState({ ...initialView, ...parsed.view });
      }
    } catch (e) {
      // ignore
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Persist on change (debounced minimal)
  useEffect(() => {
    const toPersist = { filters, view };
    try {
      localStorage.setItem('duftdaten_state_v1', JSON.stringify(toPersist));
    } catch {}
  }, [filters, view]);

  return (
    <AppContext.Provider value={ctxValue}>
      <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-50 transition-colors">
        <header className="border-b dark:border-slate-700 px-4 py-3 flex flex-wrap gap-2 items-center justify-between bg-white/70 dark:bg-slate-900/70 backdrop-blur">
          <div className="font-semibold">Duftdaten</div>
          <div className="flex gap-2 text-xs">
            <button className="px-2 py-1 rounded border dark:border-slate-600" onClick={() => setView({ view: view.view === 'cards' ? 'table' : 'cards' })}>{view.view === 'cards' ? 'Tabelle' : 'Karten'}</button>
            <button className="px-2 py-1 rounded border dark:border-slate-600" onClick={() => setView({ showTextAndSellers: !view.showTextAndSellers })}>{view.showTextAndSellers ? 'Texte aus' : 'Texte an'}</button>
            <button className="px-2 py-1 rounded border dark:border-slate-600" onClick={() => setView({ showNotes: !view.showNotes })}>{view.showNotes ? 'Noten aus' : 'Noten an'}</button>
            <button className="px-2 py-1 rounded border dark:border-slate-600" onClick={() => setView({ darkMode: view.darkMode === 'dark' ? 'light' : 'dark' })}>{view.darkMode === 'dark' ? 'Light' : 'Dark'}</button>
            <select className="px-2 py-1 rounded border dark:border-slate-600 bg-white dark:bg-slate-800" value={view.sort.key} onChange={e => setView({ sort: { ...view.sort, key: e.target.value as any } })}>
              <option value="id">Zuletzt hinzugefügt (ID)</option>
              <option value="test_date">Zuletzt bewertet</option>
              <option value="brand">Marke</option>
              <option value="name">Name</option>
              <option value="best_match">Best Match</option>
            </select>
            <button className="px-2 py-1 rounded border dark:border-slate-600" onClick={() => setView({ sort: { ...view.sort, dir: view.sort.dir === 'asc' ? 'desc' : 'asc' } })}>{view.sort.dir === 'asc' ? 'Asc' : 'Desc'}</button>
          </div>
        </header>
        <main className="p-4 flex flex-col gap-4">
          {/* Filter Minimal UI */}
          <div className="grid md:grid-cols-6 gap-3 text-xs">
            <div className="flex flex-col gap-1">
              <label className="font-medium">Brand</label>
              <input className="rounded border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 px-2 py-1" value={filters.brand[0] ?? ''} onChange={e => setFilters({ brand: e.target.value ? [e.target.value] : [] })} placeholder="Exact" />
            </div>
            <div className="flex flex-col gap-1">
              <label className="font-medium">Name</label>
              <input className="rounded border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 px-2 py-1" value={filters.name[0] ?? ''} onChange={e => setFilters({ name: e.target.value ? [e.target.value] : [] })} placeholder="Exact" />
            </div>
            <div className="flex flex-col gap-1">
              <label className="font-medium">Reason contains</label>
              <input className="rounded border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 px-2 py-1" value={filters.reasonQuery ?? ''} onChange={e => setFilters({ reasonQuery: e.target.value || undefined })} />
            </div>
            <div className="flex flex-col gap-1">
              <label className="font-medium">Owned</label>
              <select className="rounded border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 px-2 py-1" value={filters.owned} onChange={e => setFilters({ owned: e.target.value as FilterState['owned'] })}>
                <option value="all">Alle</option>
                <option value="yes">Ja</option>
                <option value="no">Nein</option>
              </select>
            </div>
            <div className="flex flex-col gap-1">
              <label className="font-medium">Sellers (OR)</label>
              <input className="rounded border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 px-2 py-1" placeholder="shop1, shop2" value={filters.sellers.join(', ')} onChange={e => setFilters({ sellers: e.target.value.split(',').map(s => s.trim()).filter(Boolean) })} />
            </div>
            <div className="flex flex-col gap-1">
              <label className="font-medium">Quality</label>
              <div className="flex gap-2 flex-wrap">
                {(['Low','Mid','High'] as const).map(q => {
                  const active = filters.quality.includes(q);
                  return (
                    <button key={q} type="button" onClick={() => {
                      setFilters({ quality: active ? filters.quality.filter(x => x !== q) : [...filters.quality, q] });
                    }} className={"px-2 py-0.5 rounded border text-[10px] " + (active ? 'bg-indigo-600 border-indigo-600 text-white' : 'border-slate-300 dark:border-slate-600')}>{q}</button>
                  );
                })}
              </div>
            </div>
            <div className="flex flex-col gap-1 col-span-full">
              <label className="font-medium">Rating Range {filters.rating[0]}–{filters.rating[1]}%</label>
              <div className="flex gap-2 items-center">
                <input type="number" min={0} max={100} step={5} className="w-16 px-2 py-1 rounded border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800" value={filters.rating[0]} onChange={e => setFilters({ rating: [Number(e.target.value), filters.rating[1]] })} />
                <input type="range" min={0} max={100} step={5} value={filters.rating[0]} onChange={e => setFilters({ rating: [Number(e.target.value), filters.rating[1]] })} />
                <input type="range" min={0} max={100} step={5} value={filters.rating[1]} onChange={e => setFilters({ rating: [filters.rating[0], Number(e.target.value)] })} />
                <input type="number" min={0} max={100} step={5} className="w-16 px-2 py-1 rounded border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800" value={filters.rating[1]} onChange={e => setFilters({ rating: [filters.rating[0], Number(e.target.value)] })} />
              </div>
            </div>
            <div className="flex flex-col gap-1 col-span-full">
              <label className="font-medium">Longevity {filters.longevity[0]}–{filters.longevity[1]}%</label>
              <div className="flex gap-2 items-center">
                <input type="number" min={0} max={100} step={5} className="w-16 px-2 py-1 rounded border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800" value={filters.longevity[0]} onChange={e => setFilters({ longevity: [Number(e.target.value), filters.longevity[1]] })} />
                <input type="range" min={0} max={100} step={5} value={filters.longevity[0]} onChange={e => setFilters({ longevity: [Number(e.target.value), filters.longevity[1]] })} />
                <input type="range" min={0} max={100} step={5} value={filters.longevity[1]} onChange={e => setFilters({ longevity: [filters.longevity[0], Number(e.target.value)] })} />
                <input type="number" min={0} max={100} step={5} className="w-16 px-2 py-1 rounded border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800" value={filters.longevity[1]} onChange={e => setFilters({ longevity: [filters.longevity[0], Number(e.target.value)] })} />
              </div>
            </div>
            <div className="flex flex-col gap-1 col-span-full">
              <label className="font-medium">Sillage {filters.sillage[0]}–{filters.sillage[1]}%</label>
              <div className="flex gap-2 items-center">
                <input type="number" min={0} max={100} step={5} className="w-16 px-2 py-1 rounded border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800" value={filters.sillage[0]} onChange={e => setFilters({ sillage: [Number(e.target.value), filters.sillage[1]] })} />
                <input type="range" min={0} max={100} step={5} value={filters.sillage[0]} onChange={e => setFilters({ sillage: [Number(e.target.value), filters.sillage[1]] })} />
                <input type="range" min={0} max={100} step={5} value={filters.sillage[1]} onChange={e => setFilters({ sillage: [filters.sillage[0], Number(e.target.value)] })} />
                <input type="number" min={0} max={100} step={5} className="w-16 px-2 py-1 rounded border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800" value={filters.sillage[1]} onChange={e => setFilters({ sillage: [filters.sillage[0], Number(e.target.value)] })} />
              </div>
            </div>
            <div className="flex flex-col gap-1 col-span-full">
              <label className="font-medium">Scent {filters.scent[0]}–{filters.scent[1]}%</label>
              <div className="flex gap-2 items-center">
                <input type="number" min={0} max={100} step={5} className="w-16 px-2 py-1 rounded border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800" value={filters.scent[0]} onChange={e => setFilters({ scent: [Number(e.target.value), filters.scent[1]] })} />
                <input type="range" min={0} max={100} step={5} value={filters.scent[0]} onChange={e => setFilters({ scent: [Number(e.target.value), filters.scent[1]] })} />
                <input type="range" min={0} max={100} step={5} value={filters.scent[1]} onChange={e => setFilters({ scent: [filters.scent[0], Number(e.target.value)] })} />
                <input type="number" min={0} max={100} step={5} className="w-16 px-2 py-1 rounded border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800" value={filters.scent[1]} onChange={e => setFilters({ scent: [filters.scent[0], Number(e.target.value)] })} />
              </div>
            </div>
          </div>
          {/* Ergebnisliste */}
          {view.view === 'cards' ? (
            <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {filtered.map(r => (
                <Card key={r.id} rec={r} showTexts={view.showTextAndSellers} showNotes={view.showNotes} onSelect={() => setSelectedId(r.id)} />
              ))}
              {!filtered.length && <div className="text-sm opacity-60">Keine Einträge</div>}
            </div>
          ) : (
            <div className="overflow-auto border rounded dark:border-slate-700">
              <table className="min-w-full text-xs">
                <thead className="bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                  <tr>
                    <th className="text-left px-2 py-1">Brand</th>
                    <th className="text-left px-2 py-1">Name</th>
                    <th className="text-left px-2 py-1">Owned</th>
                    <th className="text-left px-2 py-1">Rating</th>
                    <th className="text-left px-2 py-1">Longevity</th>
                    <th className="text-left px-2 py-1">Sillage</th>
                    <th className="text-left px-2 py-1">Scent</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map(r => (
                    <tr key={r.id} className="odd:bg-white even:bg-slate-50 dark:odd:bg-slate-900 dark:even:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 cursor-pointer" onClick={() => setSelectedId(r.id)}>
                      <td className="px-2 py-1 whitespace-nowrap">{r.brand ?? r['brand query']}</td>
                      <td className="px-2 py-1 whitespace-nowrap">{r.name ?? r['name query']}</td>
                      <td className="px-2 py-1">{r.owned ? '✅' : '—'}</td>
                      <td className="px-2 py-1">{typeof r.rating === 'number' ? Math.round(r.rating * 100) + '%' : '—'}</td>
                      <td className="px-2 py-1">{medianBucket(r.longevity) ?? '—'}%</td>
                      <td className="px-2 py-1">{medianBucket(r.sillage) ?? '—'}%</td>
                      <td className="px-2 py-1">{medianBucket(r.scent) ?? '—'}%</td>
                    </tr>
                  ))}
                  {!filtered.length && (
                    <tr>
                      <td colSpan={7} className="text-center py-4 opacity-60">Keine Einträge</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}
        </main>
        {selectedId != null && (
          <Detail
            rec={data.find(d => d.id === selectedId)!}
            onClose={() => setSelectedId(null)}
            update={(patch) => updateRecord(selectedId, patch)}
          />
        )}
      </div>
    </AppContext.Provider>
  );
}
