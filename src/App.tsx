import React, { useMemo, useState, useRef, useEffect, useCallback } from 'react';
import unparsedFragrances from './fragrances.json';
import { parseFragrance, type Fragrance } from './types';
import { AppearanceSelector } from './AppearanceSelector';
import { FragranceCard, type FragranceCardMode } from './FragranceCard';
import { FragranceCardModeSelector, getInitialFragranceCardMode } from './FragranceCardModeSelector';
import { FragranceDetailPanel } from './FragranceDetailPanel';

const DATA: Fragrance[] = unparsedFragrances.map(parseFragrance);

const FRAGRANCE_GROUP_SIZE = 50;
const FRAGRANCE_GROUP_COUNT = 10;

const MemoizedFragranceDetailPanel = React.memo(FragranceDetailPanel);
const MemoizedFragranceCard = React.memo(FragranceCard);

type FragranceGroupProps = {
  fragranceGroup: Fragrance[];
  selectedFragranceId: number | undefined;
  cardMode: FragranceCardMode;
  onClose?: (closedFragrance: Fragrance) => void;
  onChange?: (changedFragrance: Fragrance) => void;
  onSelect?: (selectedFragrance: Fragrance) => void;
};

function FragranceGroup({ fragranceGroup, selectedFragranceId, cardMode, onClose, onChange, onSelect }: FragranceGroupProps) {
  return (
    <>
      {fragranceGroup.map((fragrance) => (
        selectedFragranceId === fragrance.id ? (
          <MemoizedFragranceDetailPanel
            key={fragrance.id}
            fragrance={fragrance}
            onClose={onClose}
            onChange={onChange}
          />
        ) : (
          <MemoizedFragranceCard
            mode={cardMode}
            key={fragrance.id}
            fragrance={fragrance}
            onSelect={onSelect}
          />
        )
      ))}
    </>
  );
}

const MemoizedFragranceGroup = React.memo(FragranceGroup, (prevProps, nextProps) => {
  if (
    prevProps.onClose !== nextProps.onClose ||
    prevProps.onChange !== nextProps.onChange ||
    prevProps.onSelect !== nextProps.onSelect ||
    prevProps.cardMode !== nextProps.cardMode ||
    prevProps.selectedFragranceId !== nextProps.selectedFragranceId ||
    prevProps.fragranceGroup.length !== nextProps.fragranceGroup.length
  ) return false;

  for (let i = 0; i < prevProps.fragranceGroup.length; i++) {
    if (prevProps.fragranceGroup[i] !== nextProps.fragranceGroup[i]) return false;
  }

  return true;
});

type FragranceGroupsProps = {
  fragranceGroups: Fragrance[][];
  selectedFragranceId?: number;
  cardMode: FragranceCardMode;
  onClose?: (closedFragrance: Fragrance) => void;
  onChange?: (changedFragrance: Fragrance) => void;
  onSelect?: (selectedFragrance: Fragrance) => void;
};

function FragranceGroups({ fragranceGroups, selectedFragranceId, cardMode, onClose, onChange, onSelect }: FragranceGroupsProps) {
  const prevSelectedFragranceId = useRef<number | undefined>(selectedFragranceId);

  useEffect(() => {
    prevSelectedFragranceId.current = selectedFragranceId;
  }, [selectedFragranceId]);

  const isSelectedIdForGroupIndex = (groupIndex: number) => {
    const id = selectedFragranceId ?? prevSelectedFragranceId.current;
    if (id === undefined) return false;
    const startId = groupIndex * FRAGRANCE_GROUP_SIZE + 1;
    const endId = startId + FRAGRANCE_GROUP_SIZE - 1;
    return id >= startId && id <= endId;
  }

  return (
    <>
      {fragranceGroups.map((group, index) => (
        <MemoizedFragranceGroup
          key={index}
          fragranceGroup={group}
          selectedFragranceId={isSelectedIdForGroupIndex(index) ? selectedFragranceId : undefined}
          cardMode={cardMode}
          onClose={onClose}
          onChange={onChange}
          onSelect={onSelect}
        />
      ))}
    </>
  );
}

const MemoizedFragranceGroups = React.memo(FragranceGroups);

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

  const fragranceGroups = useMemo(() => Object.values(fragrances).reduce((acc, fragrance) => {
    const groupIndex = Math.floor((fragrance.id - 1) / FRAGRANCE_GROUP_SIZE);
    acc[groupIndex].push(fragrance);
    return acc;
  }, Array.from({ length: FRAGRANCE_GROUP_COUNT }, () => []) as Fragrance[][]),
    [fragrances]);

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
          <MemoizedFragranceGroups
            fragranceGroups={fragranceGroups}
            selectedFragranceId={selectedFragranceId}
            cardMode={cardMode}
            onClose={handleClose}
            onChange={handleChange}
            onSelect={handleSelect}
          />
        </div>
      </main>
    </div>
  );
}
