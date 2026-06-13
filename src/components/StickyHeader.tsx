import React from 'react';
import { type BrowseState } from '../types';
import { type SearchStateActions } from '../useSearchState';
import { SortMenu } from './SortMenu';
import { ResultCount } from './ResultCount';
import { countActiveFilters } from './ActiveFilterChips';

interface Props {
  state: BrowseState;
  actions: SearchStateActions;
  filteredCount: number;
  totalCount: number;
  headerExpanded: boolean;
  filterButtonRef?: React.RefObject<HTMLButtonElement | null>;
  onExpandSearch: () => void;
  onOpenFilter: () => void;
}

export function StickyHeader({
  state,
  actions,
  filteredCount,
  totalCount,
  headerExpanded,
  filterButtonRef,
  onExpandSearch,
  onOpenFilter,
}: Props) {
  const activeFiltersCount = countActiveFilters(state);

  if (headerExpanded) return null;

  return (
    <div
      className="sticky top-0 z-10 bg-nav-bg border-b border-border-subtle"
    >
      <div className="max-w-7xl mx-auto px-4 py-2 flex items-center gap-3">
        <ResultCount filteredCount={filteredCount} totalCount={totalCount} compact />

        <div className="flex-1" />

        <button
          onClick={onExpandSearch}
          aria-label="Suche öffnen"
          className="
            min-h-11 min-w-11 px-2 rounded-lg border border-transparent
            hover:bg-button-ghost-hover text-button-ghost-fg text-sm
            focus:outline-none focus-visible:ring-2 focus-visible:ring-focus-ring
          "
        >
          🔍
        </button>

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
  );
}
