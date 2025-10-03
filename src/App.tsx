import React, { useMemo, useState, useRef, useEffect, useCallback } from 'react';
import unparsedFragrances from './fragrances.json';
import { parseFragrance, type Fragrance } from './types';
import { AppearanceSelector } from './AppearanceSelector';
import { FragranceCard, type FragranceCardMode } from './FragranceCard';
import { FragranceCardModeSelector, getInitialFragranceCardMode } from './FragranceCardModeSelector';
import { FragranceDetailPanel } from './FragranceDetailPanel';

const DATA: Fragrance[] = unparsedFragrances.map(parseFragrance);

const MemoizedFragranceDetailPanel = React.memo(FragranceDetailPanel);
const MemoizedFragranceCard = React.memo(FragranceCard);

export default function App() {
  const [selectedFragranceId, setSelectedFragranceId] = useState<number | undefined>();
  const [cardMode, setCardMode] = useState<FragranceCardMode>(getInitialFragranceCardMode());
  const [fragrances, setFragrances] = useState<Record<number, Fragrance>>(
    () => DATA.reduce((acc, fragrance) => {
      acc[fragrance.id] = fragrance;
      return acc;
    }, {} as Record<number, Fragrance>)
  );

  const handleClose = useCallback(() => setSelectedFragranceId(undefined), []);
  const handleChange = useCallback((changedFragrance: Fragrance) => {
    setFragrances(prev => ({
      ...prev,
      [changedFragrance.id]: changedFragrance
    }));
  }, []);
  const handleSelect = useCallback((selectedFragrance: Fragrance) => {
    setSelectedFragranceId(selectedFragrance.id);
  }, []);

  return (
    <div className="min-h-screen bg-nav-bg">
      <header className="max-w-7xl mx-auto px-4 py-4 flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-nav-fg">
            Duftsammlung
          </h1>
          <p className="text-fg-muted mt-1">
            {DATA.length} Düfte in der Sammlung
          </p>
        </div>
        <div className="flex flex-col gap-2">
          <FragranceCardModeSelector value={cardMode} onChange={setCardMode} />
          <AppearanceSelector />
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 grid-flow-row-dense">
          {Object.values(fragrances).map((fragrance) => (
            selectedFragranceId === fragrance.id ? (
              <MemoizedFragranceDetailPanel
                key={fragrance.id}
                fragrance={fragrance}
                onClose={handleClose}
                onChange={handleChange}
              />
            ) : (
              <MemoizedFragranceCard
                mode={cardMode}
                key={fragrance.id}
                fragrance={fragrance}
                onSelect={handleSelect}
              />
            )
          ))}
        </div>
      </main>
    </div>
  );
}
