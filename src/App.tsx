import React, { useMemo, useState, useEffect } from "react";

/**
 * Duftdaten-App – Interaktiver Prototyp (Single-File)
 * - Tailwind für Styles (shadcn/ui optional; hier bewusst ohne externe Imports)
 * - Daten: eingebettetes JSONL aus der Nutzer-Nachricht
 * - Enthält: Übersichtskarten, Filter-Sidebar, Sortierung inkl. Best-Match, Detail-Drawer
 * - Alle Slider in 5%-Schritten; Autosave-ähnliches Verhalten lokal (LocalStorage)
 */

// ---------- Hilfsfunktionen ----------
function sum(obj) {
  if (!obj) return 0;
  return Object.values(obj).reduce((a, b) => a + (Number(b) || 0), 0);
}

function percentMap(obj) {
  const s = sum(obj);
  if (!s) return {};
  const out = {};
  for (const [k, v] of Object.entries(obj)) out[k] = (v / s) * 100;
  return out;
}

// Weighted median for histogram buckets {"0":count, ..., "100":count}
function bucketMedian(obj) {
  if (!obj) return null;
  const entries = Object.entries(obj)
    .map(([k, v]) => [Number(k), Number(v)])
    .sort((a, b) => a[0] - b[0]);
  const total = entries.reduce((a, [, v]) => a + v, 0);
  if (total === 0) return null;
  let acc = 0;
  for (const [bucket, cnt] of entries) {
    acc += cnt;
    if (acc >= total / 2) return bucket;
  }
  return entries.at(-1)[0];
}

function clamp01(x) {
  return Math.min(1, Math.max(0, x));
}

function debounced(fn, delay = 200) {
  let t;
  return (...args) => {
    clearTimeout(t);
    t = setTimeout(() => fn(...args), delay);
  };
}

// Quality tier heuristic based on total votes across major maps
function inferQualityTier(item) {
  const n =
    sum(item.scent) +
    sum(item.longevity) +
    sum(item.sillage) +
    sum(item.season) +
    sum(item.occasion);
  if (n >= 2000) return { tier: "High", tierScore: 1.0, n };
  if (n >= 600) return { tier: "Mid", tierScore: 0.5, n };
  return { tier: "Low", tierScore: 0, n };
}

function pct(n) {
  if (n == null) return "–";
  return `${Math.round(n)}%`;
}

function unique(values) {
  return Array.from(new Set(values.filter(Boolean)));
}

const BASE_NOTES_ICONS = {
  Zitrus: "☀️",
  Grün: "🌿",
  Holzig: "🌲",
  Aquatisch: "🌊",
  Würzig: "🌶️",
  Rauchig: "💨",
  Leder: "🧥",
  Süß: "🍬",
  Frisch: "💧",
  Synthetisch: "🧪",
  Fruchtig: "🍊",
  Blumig: "🌸",
  Fougère: "🌿",
  Orientalisch: "✨",
  Harzig: "🪵",
  Gourmand: "🍮",
  Pudrig: "🫧",
  Cremig: "🥛",
};

// ---------- UI Controls ----------
function Range({ label, min = 0, max = 100, step = 5, value, onChange }) {
  const [minVal, maxVal] = value;
  return (
    <div className="mb-4">
      <div className="flex justify-between text-sm font-semibold mb-1">
        <span>{label}</span>
        <span>
          {minVal}–{maxVal}%
        </span>
      </div>
      <div className="flex items-center gap-2">
        <input
          type="range"
          min={min}
          max={max}
          step={step}
          value={minVal}
          onChange={(e) => onChange([Number(e.target.value), maxVal])}
          className="w-full"
        />
        <input
          type="range"
          min={min}
          max={max}
          step={step}
          value={maxVal}
          onChange={(e) => onChange([minVal, Number(e.target.value)])}
          className="w-full"
        />
      </div>
    </div>
  );
}

function Chip({ children, active = false, onClick }) {
  return (
    <button
      onClick={onClick}
      className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs border transition ${
        active
          ? "bg-blue-600 text-white border-blue-600"
          : "bg-gray-50 dark:bg-gray-800 text-gray-700 dark:text-gray-200 border-gray-200 dark:border-gray-700"
      }`}
    >
      {children}
    </button>
  );
}

function Badge({ children, tone = "default" }) {
  const tones = {
    default: "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-100",
    success: "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300",
    neutral: "bg-gray-200 text-gray-800 dark:bg-gray-700 dark:text-gray-100",
  };
  return (
    <span className={`inline-flex items-center rounded px-2 text-xs h-5 ${tones[tone]}`}>
      {children}
    </span>
  );
}

function StackedBar({ data, palette }) {
  const total = Object.values(data || {}).reduce((a, b) => a + b, 0);
  const entries = Object.entries(data || {});
  return (
    <div className="w-full h-4 bg-gray-200 dark:bg-gray-700 rounded overflow-hidden flex">
      {entries.map(([k, v]) => {
        const w = total ? (v / total) * 100 : 0;
        return (
          <div
            key={k}
            className="h-full"
            title={`${k}: ${pct((v / (total || 1)) * 100)}`}
            style={{ width: `${w}%`, backgroundColor: palette[k] || "#bbb" }}
          />
        );
      })}
    </div>
  );
}

function Dots({ count = 3 }) {
  return (
    <span className="inline-flex gap-0.5 align-middle ml-1">
      {Array.from({ length: count }).map((_, i) => (
        <span key={i} className="w-1.5 h-1.5 rounded-full bg-gray-500 inline-block" />
      ))}
    </span>
  );
}

// ---------- Best-Match Scoring ----------
function bestMatchScore(item, filters) {
  // Text-Score
  let text = 0;
  const exactBrandHit =
    filters.brands.length > 0 && filters.brands.includes(item.brand);
  const exactNameHit = filters.names.length > 0 && filters.names.includes(item.name);
  if (exactBrandHit) text += 0.5; // beide Tokens können 1.0 ergeben
  if (exactNameHit) text += 0.5;

  // Types
  if (filters.types.length) {
    const totalTypeVotes = sum(item.type);
    const typePct = filters.types.reduce((acc, t) => acc + ((item.type?.[t] || 0) / (totalTypeVotes || 1)), 0);
    text += clamp01(typePct); // grob normiert
  }

  // Notes (AND/OR)
  if (filters.notes.length) {
    const allNotes = item.structure === "pyramid" ? [...(item.head||[]), ...(item.heart||[]), ...(item.base||[])] : (item.notes||[]);
    const has = (n) => allNotes.some((x) => `${x}`.toLowerCase() === `${n}`.toLowerCase());
    if (filters.notesMode === "AND") {
      text += filters.notes.every(has) ? 1 : 0;
    } else {
      const hits = filters.notes.filter(has).length;
      text += hits / filters.notes.length;
    }
  }

  // Reason/Comment substring
  const rcNeedle = (filters.reason + " " + filters.comment).trim().toLowerCase();
  if (rcNeedle) {
    const hay = `${item.reason||""} ${item.comment||""}`.toLowerCase();
    text += hay.includes(rcNeedle) ? 0.5 : 0;
  }
  text = clamp01(text);

  // Fach-Score (Season/Occasion thresholds & type strength)
  let fach = 0;
  if (filters.seasons.length) {
    const pm = percentMap(item.season);
    const ok = filters.seasons.some((s) => (pm[s] || 0) >= 20);
    fach += ok ? 0.5 : 0;
  }
  if (filters.occasions.length) {
    const pm = percentMap(item.occasion);
    const ok = filters.occasions.some((s) => (pm[s] || 0) >= 20);
    fach += ok ? 0.5 : 0;
  }
  // type-strength proxy
  if (sum(item.type) > 0) {
    const maxPct = Math.max(...Object.values(percentMap(item.type)));
    fach += maxPct / 100; // bis 1.0
  }
  fach = clamp01(fach);

  // Qualität
  const { tierScore } = inferQualityTier(item);
  const qual = tierScore; // 0 / 0.5 / 1.0

  // Persönlich
  const personal = clamp01((item.rating ?? 0) + (item.owned ? 0.1 : 0));

  const score = 0.45 * text + 0.3 * fach + 0.15 * qual + 0.1 * personal;
  return score;
}

import foobar from "./perfumes.json";

// ---------- Hauptkomponente ----------
export default function App() {
  const initial = useMemo(() => foobar, []);
  const [data, setData] = useState(initial);
  const [showText, setShowText] = useState(false);
  const [detail, setDetail] = useState(null);

  // Filter-State
  const [filters, setFilters] = useState(() => {
    const saved = localStorage.getItem("duftapp_filters");
    return (
      saved ? JSON.parse(saved) : {
        brands: [],
        names: [],
        types: [],
        notes: [],
        notesMode: "OR",
        reason: "",
        comment: "",
        seasons: [],
        occasions: [],
        scent: [0, 100],
        longevity: [0, 100],
        sillage: [0, 100],
        rating: [0, 100],
        owned: "all", // all | yes | no
        sellers: [],
        quality: [], // Low Mid High
        testDate: null,
        lastEdited: null,
        sort: "best", // best | brand | name | id_new | id_old | test_new | test_old
      }
    );
  });

  // Persist filters
  useEffect(() => {
    const save = debounced((v) => localStorage.setItem("duftapp_filters", JSON.stringify(v)), 300);
    save(filters);
  }, [filters]);

  const brands = useMemo(() => unique(data.map((d) => d.brand)), [data]);
  const names = useMemo(() => unique(data.map((d) => d.name)), [data]);
  const allTypes = useMemo(() => unique(data.flatMap((d) => Object.keys(d.type || {}))), [data]);
  const allNotes = useMemo(() => unique(data.flatMap((d) => (d.structure === "pyramid" ? [...(d.head||[]), ...(d.heart||[]), ...(d.base||[])] : (d.notes||[])))), [data]);
  const allSellers = useMemo(() => unique(data.flatMap((d) => d.sellers || [])), [data]);

  // --------- Filterlogik ---------
  const filtered = useMemo(() => {
    return data.filter((item) => {
      // Brand/Name exact
      if (filters.brands.length && !filters.brands.includes(item.brand)) return false;
      if (filters.names.length && !filters.names.includes(item.name)) return false;

      // Types: Treffer wenn Typ >= 5%
      if (filters.types.length) {
        const pm = percentMap(item.type);
        const ok = filters.types.some((t) => (pm[t] || 0) >= 5);
        if (!ok) return false;
      }

      // Notes AND/OR
      if (filters.notes.length) {
        const allNotes = item.structure === "pyramid" ? [...(item.head||[]), ...(item.heart||[]), ...(item.base||[])] : (item.notes||[]);
        const has = (n) => allNotes.some((x) => `${x}`.toLowerCase() === `${n}`.toLowerCase());
        if (filters.notesMode === "AND") {
          if (!filters.notes.every(has)) return false;
        } else {
          if (!filters.notes.some(has)) return false;
        }
      }

      // Reason/Comment substring (separat)
      if (filters.reason?.trim()) {
        const needle = filters.reason.trim().toLowerCase();
        const hay = `${item.reason || ""}`.toLowerCase();
        if (!hay.includes(needle)) return false;
      }
      if (filters.comment?.trim()) {
        const needle = filters.comment.trim().toLowerCase();
        const hay = `${item.comment || ""}`.toLowerCase();
        if (!hay.includes(needle)) return false;
      }

      // Saison & Anlass ≥20%
      if (filters.seasons.length) {
        const pm = percentMap(item.season);
        if (!filters.seasons.some((s) => (pm[s] || 0) >= 20)) return false;
      }
      if (filters.occasions.length) {
        const pm = percentMap(item.occasion);
        if (!filters.occasions.some((s) => (pm[s] || 0) >= 20)) return false;
      }

      // Range-Slider (Median)
      const medScent = bucketMedian(item.scent) ?? 0;
      const medLong = bucketMedian(item.longevity) ?? 0;
      const medSil = bucketMedian(item.sillage) ?? 0;
      const myRating = (item.rating ?? 0) * 100;
      const inRange = (v, [a, b]) => v >= a && v <= b;
      if (!inRange(medScent, filters.scent)) return false;
      if (!inRange(medLong, filters.longevity)) return false;
      if (!inRange(medSil, filters.sillage)) return false;
      if (!inRange(myRating, filters.rating)) return false;

      // Owned
      if (filters.owned === "yes" && !item.owned) return false;
      if (filters.owned === "no" && item.owned) return false;

      // Sellers (subset)
      if (filters.sellers.length) {
        const set = new Set(item.sellers || []);
        if (!filters.sellers.some((s) => set.has(s))) return false;
      }

      // Qualität tiers
      if (filters.quality.length) {
        const { tier } = inferQualityTier(item);
        if (!filters.quality.includes(tier)) return false;
      }

      return true;
    });
  }, [data, filters]);

  // --------- Sortierung ---------
  const sorted = useMemo(() => {
    const arr = [...filtered];
    switch (filters.sort) {
      case "brand":
        arr.sort((a, b) => a.brand.localeCompare(b.brand) || a.name.localeCompare(b.name));
        break;
      case "name":
        arr.sort((a, b) => a.name.localeCompare(b.name) || a.brand.localeCompare(b.brand));
        break;
      case "id_new":
        arr.sort((a, b) => b.id - a.id);
        break;
      case "id_old":
        arr.sort((a, b) => a.id - b.id);
        break;
      case "test_new":
        // keine echten timestamps im Sample -> Proxy: höhere id = neuer
        arr.sort((a, b) => b.id - a.id);
        break;
      case "test_old":
        arr.sort((a, b) => a.id - b.id);
        break;
      case "best":
      default:
        arr.sort((a, b) => bestMatchScore(b, filters) - bestMatchScore(a, filters));
    }
    return arr;
  }, [filtered, filters]);

  // ---------- UI ----------
  return (
    <div className="min-h-screen bg-white dark:bg-gray-950 text-gray-900 dark:text-gray-100">
      <div className="mx-auto max-w-7xl px-4 py-6 grid grid-cols-1 md:grid-cols-[320px_1fr] gap-6">
        {/* Sidebar */}
        <aside className="md:sticky md:top-4 max-h-screen overflow-auto border border-gray-200 dark:border-gray-800 rounded-2xl p-4 bg-gray-50 dark:bg-gray-900">
          <h2 className="text-lg font-semibold mb-3">Filter</h2>

          {/* Brand */}
          <div className="mb-3">
            <label className="text-sm font-semibold">Brand (Exact)</label>
            <SelectMulti
              options={brands}
              values={filters.brands}
              onChange={(v) => setFilters({ ...filters, brands: v })}
            />
          </div>

          {/* Name */}
          <div className="mb-3">
            <label className="text-sm font-semibold">Name (Exact)</label>
            <SelectMulti
              options={names}
              values={filters.names}
              onChange={(v) => setFilters({ ...filters, names: v })}
            />
          </div>

          {/* Types */}
          <div className="mb-3">
            <label className="text-sm font-semibold">Dufttypen (≥5 %)</label>
            <SelectMulti
              options={allTypes}
              values={filters.types}
              onChange={(v) => setFilters({ ...filters, types: v })}
            />
          </div>

          {/* Notes */}
          <div className="mb-3">
            <div className="flex items-center justify-between">
              <label className="text-sm font-semibold">Duftnoten</label>
              <div className="text-xs flex items-center gap-2">
                <span className={filters.notesMode === "OR" ? "font-semibold" : "opacity-70"}>OR</span>
                <button
                  className="relative inline-flex h-5 w-9 items-center rounded-full bg-gray-300 dark:bg-gray-700"
                  title="AND/OR"
                  onClick={() =>
                    setFilters({ ...filters, notesMode: filters.notesMode === "OR" ? "AND" : "OR" })
                  }
                >
                  <span
                    className={`inline-block h-4 w-4 transform rounded-full bg-white dark:bg-gray-200 transition ${
                      filters.notesMode === "AND" ? "translate-x-5" : "translate-x-0.5"
                    }`}
                  />
                </button>
                <span className={filters.notesMode === "AND" ? "font-semibold" : "opacity-70"}>AND</span>
              </div>
            </div>
            <SelectMulti
              options={allNotes}
              values={filters.notes}
              onChange={(v) => setFilters({ ...filters, notes: v })}
            />
          </div>

          {/* Reason/Comment */}
          <div className="mb-3 grid grid-cols-1 gap-2">
            <div>
              <label className="text-sm font-semibold">Reason (Substring)</label>
              <input
                className="w-full mt-1 px-2 py-1 rounded border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-950"
                value={filters.reason}
                onChange={(e) => setFilters({ ...filters, reason: e.target.value })}
                placeholder="Text…"
              />
            </div>
            <div>
              <label className="text-sm font-semibold">Comment (Substring)</label>
              <input
                className="w-full mt-1 px-2 py-1 rounded border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-950"
                value={filters.comment}
                onChange={(e) => setFilters({ ...filters, comment: e.target.value })}
                placeholder="Text…"
              />
            </div>
          </div>

          {/* Season/Occasion */}
          <CheckboxGroup
            label="Saison (≥20 %)"
            options={["Frühling", "Sommer", "Herbst", "Winter"]}
            values={filters.seasons}
            onChange={(v) => setFilters({ ...filters, seasons: v })}
          />
          <CheckboxGroup
            label="Anlass (≥20 %)"
            options={["Täglich", "Sport", "Freizeit", "Arbeit", "Abend", "Ausgehen"]}
            values={filters.occasions}
            onChange={(v) => setFilters({ ...filters, occasions: v })}
          />

          {/* Ranges */}
          <Range
            label="Scent (Median)"
            value={filters.scent}
            onChange={(v) => setFilters({ ...filters, scent: v })}
          />
          <Range
            label="Haltbarkeit (Median)"
            value={filters.longevity}
            onChange={(v) => setFilters({ ...filters, longevity: v })}
          />
          <Range
            label="Sillage (Median)"
            value={filters.sillage}
            onChange={(v) => setFilters({ ...filters, sillage: v })}
          />
          <Range
            label="Mein Rating"
            value={filters.rating}
            onChange={(v) => setFilters({ ...filters, rating: v })}
          />

          {/* Owned */}
          <div className="mb-3">
            <label className="text-sm font-semibold">Besitze ich?</label>
            <div className="mt-1 flex gap-3 text-sm">
              {[
                ["all", "Alle"],
                ["yes", "Ja"],
                ["no", "Nein"],
              ].map(([val, label]) => (
                <label key={val} className="inline-flex items-center gap-1 cursor-pointer">
                  <input
                    type="radio"
                    name="owned"
                    checked={filters.owned === val}
                    onChange={() => setFilters({ ...filters, owned: val })}
                  />
                  {label}
                </label>
              ))}
            </div>
          </div>

          {/* Sellers */}
          <div className="mb-3">
            <label className="text-sm font-semibold">Sellers</label>
            <SelectMulti
              options={allSellers}
              values={filters.sellers}
              onChange={(v) => setFilters({ ...filters, sellers: v })}
            />
          </div>

          {/* Qualität */}
          <CheckboxGroup
            label="Qualität"
            options={["Low", "Mid", "High"]}
            values={filters.quality}
            onChange={(v) => setFilters({ ...filters, quality: v })}
          />

          <div className="mt-4 flex items-center justify-between gap-2">
            <div className="text-sm font-semibold">Sortierung</div>
            <select
              className="px-2 py-1 rounded border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-950 text-sm"
              value={filters.sort}
              onChange={(e) => setFilters({ ...filters, sort: e.target.value })}
            >
              <option value="best">Best Match</option>
              <option value="brand">Marke</option>
              <option value="name">Name</option>
              <option value="id_new">Zuletzt hinzugefügt ↓</option>
              <option value="id_old">Zuletzt hinzugefügt ↑</option>
              <option value="test_new">Zuletzt bewertet ↓</option>
              <option value="test_old">Zuletzt bewertet ↑</option>
            </select>
          </div>

          <div className="mt-4 flex gap-2">
            <button
              className="flex-1 rounded-lg border border-gray-300 dark:border-gray-700 px-3 py-2 text-sm"
              onClick={() => setFilters({
                ...filters,
                brands: [],
                names: [],
                types: [],
                notes: [],
                reason: "",
                comment: "",
                seasons: [],
                occasions: [],
                scent: [0, 100],
                longevity: [0, 100],
                sillage: [0, 100],
                rating: [0, 100],
                owned: "all",
                sellers: [],
                quality: [],
              })}
            >
              Reset Filter
            </button>
          </div>
        </aside>

        {/* Hauptliste */}
        <main>
          <div className="flex items-center justify-between mb-3">
            <h1 className="text-xl font-semibold">Übersicht ({sorted.length})</h1>
            <label className="text-sm flex items-center gap-2">
              <input type="checkbox" checked={showText} onChange={(e) => setShowText(e.target.checked)} />
              Texte & Händler anzeigen
            </label>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {sorted.map((item) => (
              <Card key={item.id} item={item} showText={showText} onOpen={() => setDetail(item)} />
            ))}
          </div>
        </main>
      </div>

      {/* Detail Drawer */}
      {detail && (
        <div className="fixed inset-0 bg-black/40 flex items-end md:items-center justify-center z-50" onClick={() => setDetail(null)}>
          <div className="bg-white dark:bg-gray-950 w-full md:max-w-3xl max-h-[90vh] overflow-auto rounded-t-2xl md:rounded-2xl p-4" onClick={(e) => e.stopPropagation()}>
            <Detail item={detail} onClose={() => setDetail(null)} />
          </div>
        </div>
      )}
    </div>
  );
}

function Card({ item, showText, onOpen }) {
  const medScent = bucketMedian(item.scent);
  const medLong = bucketMedian(item.longevity);
  const medSil = bucketMedian(item.sillage);
  const { tier, n } = inferQualityTier(item);
  const dots = tier === "High" ? 3 : tier === "Mid" ? 2 : 1;

  const typesSorted = Object.entries(item.type || {})
    .sort((a, b) => b[1] - a[1])
    .filter(([_, v]) => v > 0)
    .slice(0, 6);

  return (
    <div className="border border-gray-200 dark:border-gray-800 rounded-2xl p-4 bg-white dark:bg-gray-900 shadow-sm">
      <div className="flex items-start justify-between gap-2">
        <div>
          <div className="text-base font-semibold">
            {item.brand} • {item.name}
            {item.concentration ? <span className="text-sm font-normal text-gray-500"> ◦ {item.concentration}</span> : null}
            <Dots count={dots} />
          </div>
          <div className="mt-1 flex flex-wrap gap-1">
            {typesSorted.map(([t, v]) => (
              <Badge key={t}>
                <span className="mr-1">{BASE_NOTES_ICONS[t] || "•"}</span>
                {t}
              </Badge>
            ))}
            <Badge tone={item.owned ? "success" : "neutral"}>{item.owned ? "✅ Owned" : "–"}</Badge>
          </div>
        </div>
        <button onClick={onOpen} className="text-sm px-3 py-1 rounded-lg border border-gray-300 dark:border-gray-700">Details</button>
      </div>

      <div className="mt-3 space-y-2">
        <div>
          <div className="text-xs text-gray-500 mb-1">Saison</div>
          <StackedBar
            data={item.season}
            palette={{ Frühling: "#34D399", Sommer: "#FBBF24", Herbst: "#F97316", Winter: "#60A5FA" }}
          />
        </div>
        <div>
          <div className="text-xs text-gray-500 mb-1">Anlass</div>
          <StackedBar
            data={item.occasion}
            palette={{ Täglich: "#9CA3AF", Freizeit: "#3B82F6", Arbeit: "#6366F1", Abend: "#F59E0B", Ausgehen: "#EC4899", Sport: "#10B981" }}
          />
        </div>
      </div>

      <div className="mt-3 flex items-center gap-2 flex-wrap text-sm">
        <Badge>⏳ {pct(medLong)}</Badge>
        <Badge>🌬️ {pct(medSil)}</Badge>
        <Badge>👃 {pct(medScent)}</Badge>
        <Badge>⭐ {item.rating != null ? pct(item.rating * 100) : "–"}</Badge>
      </div>

      {showText && (
        <div className="mt-3 text-sm space-y-1">
          {item.reason && (
            <div><span className="font-medium">Reason:</span> {item.reason}</div>
          )}
          {item.comment && (
            <div><span className="font-medium">Comment:</span> {item.comment}</div>
          )}
          {item.sellers?.length > 0 && (
            <div className="text-xs text-gray-500">Sellers: {item.sellers.join(", ")}</div>
          )}
        </div>
      )}
    </div>
  );
}

function Detail({ item, onClose }) {
  const medScent = bucketMedian(item.scent);
  const medLong = bucketMedian(item.longevity);
  const medSil = bucketMedian(item.sillage);
  const { tier, n } = inferQualityTier(item);
  const dots = tier === "High" ? 3 : tier === "Mid" ? 2 : 1;

  return (
    <div>
      <div className="flex items-start justify-between">
        <div>
          <div className="text-lg font-semibold">
            {item.brand} • {item.name}
            {item.concentration ? <span className="text-sm font-normal text-gray-500"> ◦ {item.concentration}</span> : null}
            <Dots count={dots} />
          </div>
          <div className="text-xs text-gray-500">Qualität: {tier} • Gesamt-n: {n}</div>
        </div>
        <button onClick={onClose} className="text-sm px-3 py-1 rounded-lg border border-gray-300 dark:border-gray-700">Schließen</button>
      </div>

      {/* Duftstruktur */}
      <section className="mt-4 space-y-2">
        <div className="flex flex-wrap gap-1">
          {Object.entries(item.type || {})
            .sort((a, b) => b[1] - a[1])
            .map(([t, v]) => (
              <Badge key={t}>
                <span className="mr-1">{BASE_NOTES_ICONS[t] || "•"}</span>
                {t}
              </Badge>
            ))}
        </div>
        {item.structure === "pyramid" ? (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
            <NoteCol title="Kopf" notes={item.head} />
            <NoteCol title="Herz" notes={item.heart} />
            <NoteCol title="Basis" notes={item.base} />
          </div>
        ) : (
          <div>
            <NoteCol title="Noten" notes={item.notes} />
          </div>
        )}
      </section>

      {/* Statistiken */}
      <section className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-3">
        <div>
          <div className="text-sm font-semibold mb-1">Saison</div>
          <StackedBar
            data={item.season}
            palette={{ Frühling: "#34D399", Sommer: "#FBBF24", Herbst: "#F97316", Winter: "#60A5FA" }}
          />
        </div>
        <div>
          <div className="text-sm font-semibold mb-1">Anlass</div>
          <StackedBar
            data={item.occasion}
            palette={{ Täglich: "#9CA3AF", Freizeit: "#3B82F6", Arbeit: "#6366F1", Abend: "#F59E0B", Ausgehen: "#EC4899", Sport: "#10B981" }}
          />
        </div>
        <Metric title="Haltbarkeit (Median)" value={medLong} />
        <Metric title="Sillage (Median)" value={medSil} />
        <Metric title="Scent (Median)" value={medScent} />
        {item.pricing && <Metric title="Preis/Leistung (Median)" value={bucketMedian(item.pricing)} />}
      </section>

      {/* Meine Angaben */}
      <section className="mt-4 space-y-3">
        <div className="text-sm font-semibold">Meine Angaben</div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 items-center">
          <div className="flex items-center gap-3">
            <span className="text-sm">⭐ Mein Rating</span>
            <input
              type="range"
              min={0}
              max={100}
              step={5}
              value={Math.round((item.rating ?? 0) * 100)}
              onChange={(e) => (item.rating = Number(e.target.value) / 100) || 0}
              className="flex-1"
            />
            <span className="text-sm w-12 text-right">{pct((item.rating ?? 0) * 100)}</span>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-sm">Besitze ich?</span>
            <button
              className={`px-3 py-1 rounded-lg border text-sm ${item.owned ? "bg-emerald-600 text-white border-emerald-600" : "border-gray-300 dark:border-gray-700"}`}
              onClick={() => (item.owned = !item.owned)}
            >
              {item.owned ? "Ja" : "Nein"}
            </button>
          </div>
          <div className="md:col-span-2">
            <label className="text-sm font-medium">Reason</label>
            <textarea
              className="mt-1 w-full min-h-[80px] rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-950 p-2"
              defaultValue={item.reason || ""}
              onChange={(e) => (item.reason = e.target.value)}
            />
          </div>
          <div className="md:col-span-2">
            <label className="text-sm font-medium">Comment</label>
            <textarea
              className="mt-1 w-full min-h-[80px] rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-950 p-2"
              defaultValue={item.comment || ""}
              onChange={(e) => (item.comment = e.target.value)}
            />
          </div>
          <div>
            <label className="text-sm font-medium">Sellers</label>
            <input
              className="w-full mt-1 px-2 py-1 rounded border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-950"
              defaultValue={(item.sellers || []).join(", ")}
              onChange={(e) => (item.sellers = e.target.value.split(",").map((s) => s.trim()).filter(Boolean))}
              placeholder="Kommagetrennt"
            />
          </div>
          <div className="flex items-center gap-2">
            <button
              className="px-3 py-1 rounded-lg border border-red-500 text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30 text-sm"
              onClick={() => {
                if (confirm("Bewertung wirklich zurücksetzen?")) {
                  item.rating = null;
                }
              }}
            >
              Bewertung zurücksetzen
            </button>
          </div>
        </div>
      </section>
    </div>
  );
}

function Metric({ title, value }) {
  return (
    <div className="border border-gray-200 dark:border-gray-800 rounded-xl p-3 bg-gray-50 dark:bg-gray-900">
      <div className="text-sm text-gray-500">{title}</div>
      <div className="text-lg font-semibold">{pct(value)}</div>
    </div>
  );
}

function NoteCol({ title, notes }) {
  if (!notes?.length) return null;
  return (
    <div>
      <div className="text-sm font-semibold mb-1">{title}</div>
      <div className="flex flex-wrap gap-1">
        {notes.map((n) => (
          <Badge key={n}>{n}</Badge>
        ))}
      </div>
    </div>
  );
}

function SelectMulti({ options, values, onChange }) {
  const [input, setInput] = useState("");
  const filtered = useMemo(() => {
    const q = input.toLowerCase();
    const arr =  options
      .values()
      .filter((o) => !values.includes(o))
      .filter((o) => (!q ? true : o.toLowerCase().includes(q)))
      .toArray();
    arr.sort();
    return arr;
  }, [options, values, input]);

  return (
    <div className="mt-1">
      <div className="flex flex-wrap gap-1 mb-1">
        {values.map((v) => (
          <Chip key={v} active onClick={() => onChange(values.filter((x) => x !== v))}>
            {v} ✕
          </Chip>
        ))}
      </div>
      <input
        className="w-full px-2 py-1 rounded border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-950"
        value={input}
        onChange={(e) => setInput(e.target.value)}
        placeholder="Suchen & auswählen…"
      />
      {filtered.length > 0 && (
        <div className="mt-1 border border-gray-200 dark:border-gray-800 rounded-lg max-h-36 overflow-auto bg-white dark:bg-gray-950">
          {filtered.map((o) => (
            <button
              key={o}
              onClick={() => {
                onChange([...values, o]);
                setInput("");
              }}
              className="w-full text-left px-2 py-1 text-sm hover:bg-gray-50 dark:hover:bg-gray-900"
            >
              {o}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function CheckboxGroup({ label, options, values, onChange }) {
  return (
    <div className="mb-3">
      <div className="text-sm font-semibold mb-1">{label}</div>
      <div className="flex flex-wrap gap-3 text-sm">
        {options.map((o) => (
          <label key={o} className="inline-flex items-center gap-1 cursor-pointer">
            <input
              type="checkbox"
              checked={values.includes(o)}
              onChange={(e) =>
                e.target.checked
                  ? onChange([...values, o])
                  : onChange(values.filter((x) => x !== o))
              }
            />
            {o}
          </label>
        ))}
      </div>
    </div>
  );
}
