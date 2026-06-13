import { type BrowseState } from '../types';
import { type SearchStateActions } from '../useSearchState';

interface Props {
  state: BrowseState;
  actions: SearchStateActions;
  ratingCounts: Map<number, number>;
}

const PRESETS: { value: number | null; label: string }[] = [
  { value: null, label: 'Beliebig' },
  { value: 0.5, label: '5,0+' },
  { value: 0.6, label: '6,0+' },
  { value: 0.7, label: '7,0+' },
  { value: 0.75, label: '7,5+' },
  { value: 0.8, label: '8,0+' },
  { value: 0.9, label: '9,0+' },
];

export function RatingFilter({ state, actions, ratingCounts }: Props) {
  return (
    <div>
      <p className="text-sm font-semibold text-fg-base mb-2">Meine Bewertung</p>
      <div className="flex flex-wrap gap-2" role="group" aria-label="Bewertung">
        {PRESETS.map(({ value, label }) => {
          const active = value === null ? state.minRating === null : state.minRating === value;
          const count = value !== null ? (ratingCounts.get(value) ?? 0) : null;
          return (
            <button
              key={label}
              aria-pressed={active}
              onClick={() => {
                if (active && value !== null) {
                  actions.setMinRating(null);
                } else {
                  actions.setMinRating(value);
                }
              }}
              className={`
                min-h-11 px-3 py-1 rounded-lg border text-sm font-medium transition-colors
                focus:outline-none focus-visible:ring-2 focus-visible:ring-focus-ring
                ${active
                  ? 'bg-state-selected border-brand-primary text-fg-base font-semibold'
                  : count === 0
                    ? 'bg-button-secondary-fill border-button-secondary-border text-button-secondary-fg opacity-40 hover:opacity-70'
                    : 'bg-button-secondary-fill border-button-secondary-border text-button-secondary-fg hover:bg-button-secondary-hover'
                }
              `}
            >
              {label}
              {count !== null && count > 0 && (
                <span className="ml-1 text-xs opacity-60">({count})</span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
