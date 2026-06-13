import React, { useCallback, useEffect, useRef, useState } from 'react';
import { AppearanceSelector } from './AppearanceSelector';
import { AuthForm } from './AuthForm';
import { useSession } from './AuthProvider';
import { type FragranceCardMode } from './FragranceCard';
import { FragranceCardModeSelector, getInitialFragranceCardMode } from './FragranceCardModeSelector';
import { FragranceGrid } from './FragranceGrid';
import { type DynamicFragranceData, type Fragrance } from './types';
import { useFragrances } from './useFragrance';
import { useSearchState } from './useSearchState';
import { useFilteredFragrances } from './useFilteredFragrances';
import { AddFragranceModal } from './components/AddFragranceModal';
import { CollectionHeader } from './components/CollectionHeader';
import { StickyHeader } from './components/StickyHeader';
import { FilterSheet } from './components/FilterSheet';
import { FilterDrawer } from './components/FilterDrawer';

function FragranceContent({
  isPending,
  error,
  fragrances,
  cardMode,
  onChange,
  onClearFilters,
}: {
  isPending: boolean;
  error: Error | null | undefined;
  fragrances: Fragrance[] | undefined;
  cardMode: FragranceCardMode;
  onChange?: (changedDynamicFragranceData: DynamicFragranceData) => void;
  onClearFilters?: () => void;
}) {
  if (isPending || !fragrances) {
    return <div className="text-fg-base">Lade Düfte...</div>;
  }
  if (error) {
    return (
      <div className="text-status-error-fg bg-status-error-bg border rounded p-2 border-status-error-border">
        Fehler beim Laden der Düfte: {error.message}
      </div>
    );
  }
  if (fragrances.length === 0) {
    return (
      <div className="text-center py-16">
        <p className="text-fg-muted mb-4">Keine Düfte gefunden.</p>
        {onClearFilters && (
          <button
            onClick={onClearFilters}
            className="
              bg-button-secondary-fill hover:bg-button-secondary-hover text-button-secondary-fg
              border border-button-secondary-border rounded-lg py-2 px-4 text-sm font-medium
              focus:outline-none focus-visible:ring-2 focus-visible:ring-focus-ring
            "
          >
            Alle Filter löschen
          </button>
        )}
      </div>
    );
  }
  return <FragranceGrid fragrances={fragrances} cardMode={cardMode} onChange={onChange} />;
}

const MemoizedFragranceContent = React.memo(FragranceContent);

export function LoggedInLayout() {
  const session = useSession();
  const {
    query: { fragrances, error, isPending },
    mutation: { saveDynamicFragranceData, saveDynamicFragranceDataNow },
  } = useFragrances(session);

  const [browseState, browseActions] = useSearchState();
  const { filtered, totalCount, filteredCount, taxonomy } = useFilteredFragrances(fragrances, browseState);

  const [cardMode, setCardMode] = useState<FragranceCardMode>(getInitialFragranceCardMode());
  const [modalOpen, setModalOpen] = useState(false);
  const [filterOpen, setFilterOpen] = useState(false);
  const [headerExpanded, setHeaderExpanded] = useState(true);

  const addButtonRef = useRef<HTMLButtonElement>(null);
  const filterButtonRef = useRef<HTMLButtonElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  const lastScrollY = useRef(0);
  const lastSignificantY = useRef(0);

  useEffect(() => {
    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    function onScroll() {
      requestAnimationFrame(() => {
        const y = window.scrollY;
        const delta = y - lastScrollY.current;
        lastScrollY.current = y;

        if (delta > 0) {
          if (y - lastSignificantY.current > 100) {
            setHeaderExpanded(false);
            lastSignificantY.current = y;
          }
        } else if (delta < 0) {
          if (lastSignificantY.current - y > 20) {
            setHeaderExpanded(true);
            lastSignificantY.current = y;
          }
        }
      });
    }

    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  const onChange = useCallback(
    (changedDynamicFragranceData: DynamicFragranceData) => {
      saveDynamicFragranceData(changedDynamicFragranceData);
    },
    [saveDynamicFragranceData],
  );

  function handleModalClose() {
    setModalOpen(false);
    addButtonRef.current?.focus();
  }

  function handleOpenFilter() {
    setFilterOpen(true);
  }

  function handleCloseFilter() {
    setFilterOpen(false);
  }

  function handleExpandSearch() {
    setHeaderExpanded(true);
    setTimeout(() => searchInputRef.current?.focus(), 50);
  }

  return (
    <div className="min-h-screen bg-nav-bg">
      <header className="max-w-7xl mx-auto px-4 py-4 md:flex md:justify-between md:items-center">
        <div>
          <h1 className="text-2xl font-bold text-nav-fg">Duftsammlung</h1>
          <p className="text-fg-muted mt-1 h-6">
            {fragrances && `${totalCount} Düfte in der Sammlung`}
          </p>
        </div>
        <div className="flex gap-2 items-center">
          <button
            ref={addButtonRef}
            onClick={() => setModalOpen(true)}
            className="
              bg-button-ghost-fill hover:bg-button-ghost-hover active:bg-button-ghost-active
              text-button-ghost-fg border border-transparent rounded py-2 px-3 text-sm font-medium
              focus:outline-none focus-visible:ring-2 focus-visible:ring-focus-ring
            "
          >
            + Duft hinzufügen
          </button>
          <AuthForm />
          <FragranceCardModeSelector value={cardMode} onChange={setCardMode} />
          <AppearanceSelector />
        </div>
      </header>

      <StickyHeader
        state={browseState}
        actions={browseActions}
        filteredCount={filteredCount}
        totalCount={totalCount}
        headerExpanded={headerExpanded}
        filterButtonRef={filterButtonRef}
        onExpandSearch={handleExpandSearch}
        onOpenFilter={handleOpenFilter}
      />

      {headerExpanded && (
        <CollectionHeader
          state={browseState}
          actions={browseActions}
          taxonomy={taxonomy}
          filteredCount={filteredCount}
          totalCount={totalCount}
          searchInputRef={searchInputRef}
          filterButtonRef={filterButtonRef}
          onOpenFilter={handleOpenFilter}
        />
      )}

      {modalOpen && (
        <AddFragranceModal
          fragrances={fragrances}
          onSubmit={saveDynamicFragranceDataNow}
          onClose={handleModalClose}
        />
      )}

      {filterOpen && (
        <FilterSheet
          state={browseState}
          actions={browseActions}
          taxonomy={taxonomy}
          filteredCount={filteredCount}
          onClose={handleCloseFilter}
          openerRef={filterButtonRef}
        />
      )}

      {filterOpen && (
        <FilterDrawer
          state={browseState}
          actions={browseActions}
          taxonomy={taxonomy}
          filteredCount={filteredCount}
          onClose={handleCloseFilter}
          openerRef={filterButtonRef}
        />
      )}

      <main className="max-w-7xl mx-auto px-4 py-6">
        <MemoizedFragranceContent
          isPending={isPending}
          error={error}
          fragrances={fragrances ? filtered : undefined}
          cardMode={cardMode}
          onChange={onChange}
          onClearFilters={browseActions.clearAllFilters}
        />
      </main>
    </div>
  );
}
