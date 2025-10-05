import React, { useCallback, useState } from 'react';
import { FragranceCard, type FragranceCardMode } from './FragranceCard';
import { FragranceDetailPanel } from './FragranceDetailPanel';
import unparsedFragrances from './fragrances.json';
import { parseFragrance, type Fragrance } from './types';

const DATA: Fragrance[] = unparsedFragrances.map(parseFragrance);

const MemoizedFragranceDetailPanel = React.memo(FragranceDetailPanel);
const MemoizedFragranceCard = React.memo(FragranceCard);

type FragranceGridProps = {
  fragrances: Record<number, Fragrance>;
  cardMode: FragranceCardMode;
};

export function FragranceGrid({ fragrances, cardMode }: FragranceGridProps) {
  const [_fragrances, setFragrances] = useState<Record<number, Fragrance>>(
    () => DATA.reduce((acc, fragrance) => {
      acc[fragrance.id] = fragrance;
      return acc;
    }, {} as Record<number, Fragrance>)
  );

  const [selectedFragranceId, setSelectedFragranceId] = useState<number | undefined>();

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
  );
}
