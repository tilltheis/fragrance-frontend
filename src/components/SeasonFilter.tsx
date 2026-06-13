import { SEASONS, type SeasonKey, type SeasonThreshold, SEASON_COLORS } from '../types';
import { type BrowseState } from '../types';
import { type SearchStateActions } from '../useSearchState';

interface Props {
  state: BrowseState;
  actions: SearchStateActions;
}

const THRESHOLDS: { key: SeasonThreshold; label: string }[] = [
  { key: '20', label: '20%+' },
  { key: '40', label: '40%+' },
  { key: 'top', label: 'Hauptsaison' },
];

export function SeasonFilter({ state, actions }: Props) {
  return (
    <div>
      <p className="text-sm font-semibold text-fg-base mb-2">Jahreszeit</p>
      <div className="flex gap-2 flex-wrap mb-3" role="group" aria-label="Jahreszeit auswählen">
        {SEASONS.map((season) => {
          const active = state.seasons.includes(season);
          const colors = SEASON_COLORS[season];
          return (
            <button
              key={season}
              aria-pressed={active}
              onClick={() => actions.toggleSeason(season)}
              className={`
                min-h-11 px-3 py-1.5 rounded-lg border text-sm font-medium transition-colors
                focus:outline-none focus-visible:ring-2 focus-visible:ring-focus-ring
                ${active
                  ? 'bg-state-selected border-brand-primary text-fg-base font-semibold'
                  : 'bg-button-secondary-fill border-button-secondary-border text-button-secondary-fg hover:bg-button-secondary-hover'
                }
              `}
            >
              {colors.emoji} {season}
            </button>
          );
        })}
      </div>
      <div className="flex gap-2" role="group" aria-label="Schwellenwert">
        {THRESHOLDS.map(({ key, label }) => {
          const active = state.seasonThreshold === key;
          return (
            <button
              key={key}
              aria-pressed={active}
              onClick={() => actions.setSeasonThreshold(key)}
              className={`
                min-h-11 px-3 py-1 rounded-lg border text-xs font-medium transition-colors
                focus:outline-none focus-visible:ring-2 focus-visible:ring-focus-ring
                ${active
                  ? 'bg-state-selected border-brand-primary text-fg-base'
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
