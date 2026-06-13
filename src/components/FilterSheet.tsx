import { useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { type BrowseState } from '../types';
import { type SearchStateActions } from '../useSearchState';
import { type Taxonomy } from '../taxonomy';
import { type FilterCounts } from '../filterCounts';
import { FilterContent } from './FilterContent';

interface Props {
  state: BrowseState;
  actions: SearchStateActions;
  taxonomy: Taxonomy;
  filterCounts: FilterCounts;
  filteredCount: number;
  onClose: () => void;
  openerRef: React.RefObject<HTMLElement | null>;
}

export function FilterSheet({ state, actions, taxonomy, filterCounts, filteredCount, onClose, openerRef }: Props) {
  const dialogRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const focusable = dialogRef.current?.querySelectorAll<HTMLElement>(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])',
    );
    focusable?.[0]?.focus();

    function onKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        onClose();
        openerRef.current?.focus();
      }
      if (e.key === 'Tab' && focusable && focusable.length > 0) {
        const first = focusable[0];
        const last = focusable[focusable.length - 1];
        if (e.shiftKey) {
          if (document.activeElement === first) {
            e.preventDefault();
            last.focus();
          }
        } else {
          if (document.activeElement === last) {
            e.preventDefault();
            first.focus();
          }
        }
      }
    }
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [onClose, openerRef]);

  return createPortal(
    <>
      <div className="global-scroll-lock" />
      <div
        className="fixed inset-0 z-40 bg-overlay-scrim md:hidden"
        aria-hidden="true"
        onClick={() => { onClose(); openerRef.current?.focus(); }}
      />
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-label="Filter"
        className="
          fixed bottom-0 left-0 right-0 z-50 md:hidden
          bg-card-bg border-t border-card-border rounded-t-2xl
          flex flex-col max-h-[100svh]
          motion-safe:animate-slide-up
        "
      >
        <div className="flex items-center justify-between px-4 py-3 border-b border-border-subtle flex-shrink-0">
          <h2 className="text-base font-semibold text-fg-base">Filter</h2>
          <button
            onClick={() => actions.clearAllFilters()}
            className="text-sm text-brand-primary hover:underline focus:outline-none focus-visible:ring-2 focus-visible:ring-focus-ring rounded"
          >
            Alle Filter zurücksetzen
          </button>
        </div>
        <div className="overflow-y-auto flex-1">
          <FilterContent state={state} actions={actions} taxonomy={taxonomy} filterCounts={filterCounts} />
        </div>
        <div className="px-4 py-3 border-t border-border-subtle flex-shrink-0">
          <button
            onClick={() => { onClose(); openerRef.current?.focus(); }}
            className="
              w-full bg-button-primary-fill hover:bg-button-primary-hover active:bg-button-primary-active
              text-button-primary-fg border border-button-primary-border rounded-lg font-bold py-3
              focus:outline-none focus-visible:ring-2 focus-visible:ring-focus-ring
            "
          >
            {filteredCount} Düft{filteredCount === 1 ? '' : 'e'} anzeigen
          </button>
        </div>
      </div>
    </>,
    document.body,
  );
}
