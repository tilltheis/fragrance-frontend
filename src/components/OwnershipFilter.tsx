import { type BrowseState } from '../types';
import { type SearchStateActions } from '../useSearchState';

interface Props {
  state: BrowseState;
  actions: SearchStateActions;
}

const OPTIONS: { value: BrowseState['ownership']; label: string }[] = [
  { value: 'all', label: 'Alle' },
  { value: 'owned', label: 'Im Besitz' },
  { value: 'notOwned', label: 'Nicht im Besitz' },
];

export function OwnershipFilter({ state, actions }: Props) {
  return (
    <div>
      <p className="text-sm font-semibold text-fg-base mb-2">Besitz</p>
      <div className="flex gap-2 flex-wrap" role="group" aria-label="Besitzstatus">
        {OPTIONS.map(({ value, label }) => {
          const active = state.ownership === value;
          return (
            <button
              key={value}
              aria-pressed={active}
              onClick={() => actions.setOwnership(active && value !== 'all' ? 'all' : value)}
              className={`
                min-h-11 px-3 py-1 rounded-lg border text-sm font-medium transition-colors
                focus:outline-none focus-visible:ring-2 focus-visible:ring-focus-ring
                ${active
                  ? 'bg-state-selected border-brand-primary text-fg-base font-semibold'
                  : 'bg-button-secondary-fill border-button-secondary-border text-button-secondary-fg hover:bg-button-secondary-hover'
                }
              `}
            >
              {label}
            </button>
          );
        })}
      </div>
    </div>
  );
}
