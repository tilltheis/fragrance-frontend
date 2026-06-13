import { type BrowseState } from '../types';
import { type SearchStateActions } from '../useSearchState';

interface Props {
  state: BrowseState;
  actions: SearchStateActions;
  seasonThresholdLabel: (s: string) => string;
}

function countActiveFilterGroups(state: BrowseState): number {
  let count = 0;
  if (state.brands.length > 0) count++;
  if (state.types.length > 0) count++;
  if (state.notes.length > 0) count++;
  if (state.seasons.length > 0) count++;
  if (state.minRating !== null) count++;
  if (state.ownership !== 'all') count++;
  if (state.ratingState !== 'all') count++;
  return count;
}

export function countActiveFilters(state: BrowseState): number {
  return countActiveFilterGroups(state);
}

export function ActiveFilterChips({ state, actions, seasonThresholdLabel }: Props) {
  const chips: { key: string; label: string; onRemove: () => void }[] = [];

  for (const brand of state.brands) {
    chips.push({
      key: `brand-${brand}`,
      label: brand,
      onRemove: () => actions.toggleBrand(brand),
    });
  }
  for (const type of state.types) {
    chips.push({
      key: `type-${type}`,
      label: type,
      onRemove: () => actions.toggleType(type),
    });
  }
  for (const note of state.notes) {
    chips.push({
      key: `note-${note}`,
      label: note,
      onRemove: () => actions.toggleNote(note),
    });
  }
  for (const season of state.seasons) {
    const suffix = seasonThresholdLabel(state.seasonThreshold);
    chips.push({
      key: `season-${season}`,
      label: `${season} ${suffix}`,
      onRemove: () => actions.toggleSeason(season),
    });
  }
  if (state.minRating !== null) {
    const pct = Math.round(state.minRating * 10 * 10) / 10;
    chips.push({
      key: 'minRating',
      label: `Bewertung ≥${pct.toFixed(1).replace('.', ',')}`,
      onRemove: () => actions.setMinRating(null),
    });
  }
  if (state.ownership !== 'all') {
    chips.push({
      key: 'ownership',
      label: state.ownership === 'owned' ? 'Im Besitz' : 'Nicht im Besitz',
      onRemove: () => actions.setOwnership('all'),
    });
  }
  if (state.ratingState !== 'all') {
    chips.push({
      key: 'ratingState',
      label: state.ratingState === 'tested' ? 'Getestet' : 'Unbewertet',
      onRemove: () => actions.setRatingState('all'),
    });
  }

  if (chips.length === 0) return null;

  return (
    <div className="flex flex-wrap gap-2 items-center">
      {chips.map(({ key, label, onRemove }) => (
        <button
          key={key}
          onClick={onRemove}
          aria-label={`${label} entfernen`}
          onKeyDown={(e) => {
            if (e.key === 'Delete' || e.key === 'Backspace') onRemove();
          }}
          className="
            inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium
            bg-filter-pill-bg text-filter-pill-fg border border-filter-pill-border
            hover:opacity-80 focus:outline-none focus-visible:ring-2 focus-visible:ring-focus-ring
          "
        >
          {label}
          <span aria-hidden="true" className="ml-0.5">×</span>
        </button>
      ))}
      <button
        onClick={() => actions.clearAllFilters()}
        className="text-xs text-brand-primary hover:underline focus:outline-none focus-visible:ring-2 focus-visible:ring-focus-ring rounded"
      >
        Alle löschen
      </button>
    </div>
  );
}
