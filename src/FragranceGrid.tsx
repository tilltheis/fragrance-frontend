import React from 'react';
import { FragranceCard, type FragranceCardMode } from './FragranceCard';
import { FragranceDetailPanel } from './FragranceDetailPanel';
import { type DynamicFragranceData, type Fragrance } from './types';

const MemoizedFragranceDetailPanel = React.memo(FragranceDetailPanel);
const MemoizedFragranceCard = React.memo(FragranceCard);

type FragranceGridProps = {
  fragrances: Fragrance[];
  cardMode: FragranceCardMode;
  selectedFragranceId?: number;
  onSelect?: (selectedFragrance: Fragrance) => void;
  onClose?: (closedFragrance: Fragrance) => void;
  onChange?: (changedDynamicFragranceData: DynamicFragranceData) => void;
  onOwnershipChange?: (changedDynamicFragranceData: DynamicFragranceData) => void;
};

export function FragranceGrid({
  fragrances,
  cardMode,
  selectedFragranceId,
  onSelect,
  onClose,
  onChange,
  onOwnershipChange,
}: FragranceGridProps) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 grid-flow-row-dense">
      {fragrances.map((fragrance) =>
        selectedFragranceId === fragrance.id ? (
          <MemoizedFragranceDetailPanel
            key={fragrance.id}
            fragrance={fragrance}
            onClose={onClose}
            onChange={onChange}
            onOwnershipChange={onOwnershipChange}
          />
        ) : (
          <MemoizedFragranceCard mode={cardMode} key={fragrance.id} fragrance={fragrance} onSelect={onSelect} />
        )
      )}
    </div>
  );
}
