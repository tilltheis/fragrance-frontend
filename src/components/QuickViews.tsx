import { type BrowseState } from '../types';
import { type SearchStateActions } from '../useSearchState';

interface Props {
  state: BrowseState;
  actions: SearchStateActions;
}

const quickViews = [
  { key: 'all', shortLabel: 'Alle', fullLabel: 'Alle' },
  { key: 'bestRated', shortLabel: 'Top', fullLabel: 'Am besten bewertet' },
  { key: 'owned', shortLabel: 'Besitz', fullLabel: 'Im Besitz' },
  { key: 'tested', shortLabel: 'Getestet', fullLabel: 'Getestet' },
] as const;

function isAllActive(state: BrowseState): boolean {
  return state.ownership === 'all' && state.ratingState === 'all' && state.minRating === null;
}

function isQuickViewActive(key: string, state: BrowseState): boolean {
  if (key === 'all') return isAllActive(state);
  if (key === 'bestRated') return state.minRating === 0.75;
  if (key === 'owned') return state.ownership === 'owned';
  if (key === 'tested') return state.ratingState === 'tested';
  return false;
}

export function QuickViews({ state, actions }: Props) {
  function handleClick(key: string) {
    if (key === 'all') {
      actions.clearQuickViews();
      return;
    }
    if (key === 'bestRated') {
      if (state.minRating === 0.75) {
        actions.setMinRating(null);
      } else {
        actions.setMinRating(0.75);
      }
      return;
    }
    if (key === 'owned') {
      actions.setOwnership(state.ownership === 'owned' ? 'all' : 'owned');
      return;
    }
    if (key === 'tested') {
      actions.setRatingState(state.ratingState === 'tested' ? 'all' : 'tested');
      return;
    }
  }

  return (
    <div className="flex gap-1 flex-wrap" role="group" aria-label="Schnellfilter">
      {quickViews.map(({ key, shortLabel, fullLabel }) => {
        const active = isQuickViewActive(key, state);
        return (
          <button
            key={key}
            aria-pressed={active}
            onClick={() => handleClick(key)}
            className={`
              min-h-11 px-3 py-1 rounded-full text-sm font-medium border transition-colors
              focus:outline-none focus-visible:ring-2 focus-visible:ring-focus-ring
              ${active
                ? 'bg-state-selected border-brand-primary text-fg-base'
                : 'bg-button-secondary-fill border-button-secondary-border text-button-secondary-fg hover:bg-button-secondary-hover'
              }
            `}
          >
            <span className="sm:hidden">{shortLabel}</span>
            <span className="hidden sm:inline">{fullLabel}</span>
          </button>
        );
      })}
    </div>
  );
}
