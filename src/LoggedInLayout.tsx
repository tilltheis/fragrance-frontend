import React, { useCallback, useMemo, useState } from 'react';
import { AppearanceSelector } from './AppearanceSelector';
import { AuthForm } from './AuthForm';
import { useSession } from './AuthProvider';
import { type FragranceCardMode } from './FragranceCard';
import { FragranceCardModeSelector, getInitialFragranceCardMode } from './FragranceCardModeSelector';
import { FragranceGrid } from './FragranceGrid';
import { type DynamicFragranceData, type Fragrance } from './types';
import { useFragrances } from './useFragrance';

function FragranceContent({
  isPending,
  error,
  fragrances,
  cardMode,
  onChange,
}: {
  isPending: boolean;
  error: Error | null | undefined;
  fragrances: Fragrance[] | undefined;
  cardMode: FragranceCardMode;
  onChange?: (changedDynamicFragranceData: DynamicFragranceData) => void;
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
    return <div className="text-fg-base">Keine Düfte gefunden.</div>;
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
  const sortedFragrances = useMemo(() => {
    if (!fragrances) return fragrances;
    return Object.values(fragrances).sort((a, b) => b.id - a.id);
  }, [fragrances]);

  const [cardMode, setCardMode] = useState<FragranceCardMode>(getInitialFragranceCardMode());

  const onChange = useCallback(
    (changedDynamicFragranceData: DynamicFragranceData) => {
      saveDynamicFragranceData(changedDynamicFragranceData);
    },
    [saveDynamicFragranceData]
  );

  const [newBrandQuery, setNewBrandQuery] = useState('');
  const [newNameQuery, setNewNameQuery] = useState('');

  function handleCreateNewFragrance(event: React.MouseEvent<HTMLButtonElement, MouseEvent>): void {
    event.preventDefault();
    const brandQuery = newBrandQuery.trim();
    const nameQuery = newNameQuery.trim();
    if (!brandQuery || !nameQuery) return;

    // Find next available id from merged fragrances
    const allIds = fragrances ? Object.keys(fragrances).map(Number) : [];
    const nextId = allIds.length > 0 ? Math.max(...allIds) + 1 : 1;

    const newDynamicFragrance: DynamicFragranceData = {
      id: nextId,
      brandQuery,
      nameQuery,
    };

    saveDynamicFragranceDataNow(newDynamicFragrance);

    setNewBrandQuery('');
    setNewNameQuery('');
  }

  return (
    <div className="min-h-screen bg-nav-bg">
      <header className="max-w-7xl mx-auto px-4 py-4 md:flex md:justify-between md:items-center">
        <div>
          <h1 className="text-2xl font-bold text-nav-fg">Duftsammlung</h1>
          <p className="text-fg-muted mt-1 h-6">
            {fragrances && `${Object.keys(fragrances).length} Düfte in der Sammlung`}
          </p>
        </div>
        <div className="flex gap-2">
          <AuthForm />
          <FragranceCardModeSelector value={cardMode} onChange={setCardMode} />
          <AppearanceSelector />
        </div>
      </header>

      <form className="bg-card-bg p-6 rounded-lg shadow-lg w-80 border border-card-border text-card-fg">
        <div className="mb-6">
          <label className="block text-fg-base text-sm font-bold mb-2" htmlFor="newBrandQuery">
            Marke
          </label>
          <input
            className={`
              text-input-fg
              bg-input-bg
              border
              rounded
              border-input-border
              hover:border-input-hover-border
              w-full
              py-2
              px-3
              text-fg-base
              leading-tight
              focus:border-input-focus-border
              focus:outline-focus-ring
              focus-visible:ring-2
              focus-visible:ring-focus-ring
              focus-visible:ring-offset-1
              `}
            id="newBrandQuery"
            type="text"
            value={newBrandQuery}
            onChange={(e) => setNewBrandQuery(e.target.value)}
          />
        </div>
        <div className="mb-6">
          <label className="block text-fg-base text-sm font-bold mb-2" htmlFor="newNameQuery">
            Name
          </label>
          <input
            className={`
              text-input-fg
              bg-input-bg
              border
              rounded
              border-input-border
              hover:border-input-hover-border
              w-full
              py-2
              px-3
              text-fg-base
              leading-tight
              focus:border-input-focus-border
              focus:outline-focus-ring
              focus-visible:ring-2
              focus-visible:ring-focus-ring
              focus-visible:ring-offset-1
              `}
            id="newNameQuery"
            type="text"
            value={newNameQuery}
            onChange={(e) => setNewNameQuery(e.target.value)}
          />
        </div>
        <div className="flex items-center justify-between">
          <button
            className="
              bg-button-primary-fill
              hover:bg-button-primary-hover
              active:bg-button-primary-active
              text-button-primary-fg
              border
              border-button-primary-border
              rounded
              font-bold
              py-2
              px-4
              rounded
              focus:outline-none
              focus:shadow-outline
              focus:outline-none
              focus-visible:ring-2 focus-visible:ring-focus-ring
              focus-visible:ring-offset-2
              ring-offset-card-bg
              "
            type="button"
            onClick={handleCreateNewFragrance}
          >
            Duft Hinzufügen
          </button>
        </div>
      </form>

      <main className="max-w-7xl mx-auto px-4 py-6">
        <MemoizedFragranceContent
          isPending={isPending}
          error={error}
          fragrances={sortedFragrances}
          cardMode={cardMode}
          onChange={onChange}
        />
      </main>
    </div>
  );
}
