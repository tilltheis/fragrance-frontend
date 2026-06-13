import { SEASONS, type SeasonKey, type SeasonThreshold, SEASON_COLORS } from '../types';
import { type BrowseState } from '../types';
import { type SearchStateActions } from '../useSearchState';

interface Props {
  state: BrowseState;
  actions: SearchStateActions;
  seasonCounts: Map<string, number>;
}

const THRESHOLDS: { key: SeasonThreshold; label: string }[] = [
  { key: '20', label: '20%+' },
  { key: '40', label: '40%+' },
  { key: 'top', label: 'Hauptsaison' },
];

export function SeasonFilter({ state, actions, seasonCounts }: Props) {
  return (
    <div>
      <p className="text-sm font-semibold text-fg-base mb-2">Jahreszeit</p>
      <div className="flex gap-2 flex-wrap mb-3" role="group" aria-label="Jahreszeit auswählen">
        {SEASONS.map((season) => {
          const active = state.seasons.includes(season);
          const colors = SEASON_COLORS[season];
          const count = seasonCounts.get(season) ?? 0;
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
                  : count === 0
                    ? 'bg-button-secondary-fill border-button-secondary-border text-button-secondary-fg opacity-40 hover:opacity-70'
                    : 'bg-button-secondary-fill border-button-secondary-border text-button-secondary-fg hover:bg-button-secondary-hover'
                }
              `}
            >
              {colors.emoji} {season}
              {count > 0 && <span className="ml-1 text-xs opacity-60">({count})</span>}
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
