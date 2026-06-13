import React from 'react';
import { type BrowseState } from '../types';
import { type SearchStateActions } from '../useSearchState';
import { type Taxonomy } from '../taxonomy';
import { SearchBar } from './SearchBar';
import { QuickViews } from './QuickViews';
import { SortMenu } from './SortMenu';
import { ResultCount } from './ResultCount';
import { ActiveFilterChips, countActiveFilters } from './ActiveFilterChips';

interface Props {
  state: BrowseState;
  actions: SearchStateActions;
  taxonomy: Taxonomy;
  filteredCount: number;
  totalCount: number;
  searchInputRef?: React.RefObject<HTMLInputElement | null>;
  filterButtonRef?: React.RefObject<HTMLButtonElement | null>;
  onOpenFilter: () => void;
}

function seasonThresholdLabel(threshold: string): string {
  if (threshold === '40') return '≥40%';
  if (threshold === 'top') return 'Haupt.';
  return '≥20%';
}

export function CollectionHeader({
  state,
  actions,
  taxonomy: _taxonomy,
  filteredCount,
  totalCount,
  searchInputRef,
  filterButtonRef,
  onOpenFilter,
}: Props) {
  const activeFiltersCount = countActiveFilters(state);

  return (
    <div className="max-w-7xl mx-auto px-4 pb-4 space-y-3">
      <SearchBar query={state.query} onChange={actions.setQuery} inputRef={searchInputRef} />

      <QuickViews state={state} actions={actions} />

      <div className="flex items-center justify-between gap-3 flex-wrap">
        <ResultCount filteredCount={filteredCount} totalCount={totalCount} />
        <div className="flex items-center gap-2">
          <SortMenu state={state} actions={actions} />
          <button
            ref={filterButtonRef}
            onClick={onOpenFilter}
            aria-label={activeFiltersCount > 0 ? `Filter, ${activeFiltersCount} aktiv` : 'Filter'}
            className="
              relative min-h-11 px-3 py-1.5 rounded-lg border border-button-secondary-border
              bg-button-secondary-fill hover:bg-button-secondary-hover text-button-secondary-fg text-sm font-medium
              focus:outline-none focus-visible:ring-2 focus-visible:ring-focus-ring
            "
          >
            ⚙ Filter
            {activeFiltersCount > 0 && (
              <span
                aria-hidden="true"
                className="ml-1.5 inline-flex items-center justify-center w-5 h-5 rounded-full text-xs bg-brand-primary text-button-primary-fg"
              >
                {activeFiltersCount}
              </span>
            )}
          </button>
        </div>
      </div>

      <ActiveFilterChips
        state={state}
        actions={actions}
        seasonThresholdLabel={seasonThresholdLabel}
      />
    </div>
  );
}
