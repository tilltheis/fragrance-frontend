import React, { useCallback, useState } from 'react';
import { FragranceCard, type FragranceCardMode } from './FragranceCard';
import { FragranceDetailPanel } from './FragranceDetailPanel';
import { type Fragrance } from './types';

const MemoizedFragranceDetailPanel = React.memo(FragranceDetailPanel);
const MemoizedFragranceCard = React.memo(FragranceCard);

type FragranceGridProps = {
  fragrances: Record<number, Fragrance>;
  cardMode: FragranceCardMode;
  onChange?: (changedDynamicData: Fragrance) => void;
};

export function FragranceGrid({ fragrances, cardMode, onChange }: FragranceGridProps) {
  const [selectedFragranceId, setSelectedFragranceId] = useState<number | undefined>();

  const handleClose = useCallback(() => setSelectedFragranceId(undefined), []);
  const handleSelect = useCallback((selectedFragrance: Fragrance) => {
    setSelectedFragranceId(selectedFragrance.id);
  }, []);

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 grid-flow-row-dense">
      {Object.values(fragrances).map((fragrance) => (
        selectedFragranceId === fragrance.id ? (
          <MemoizedFragranceDetailPanel
            key={fragrance.id}
            fragrance={fragrance}
            onClose={handleClose}
            onChange={e => onChange?.(e)}
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
  );
}
