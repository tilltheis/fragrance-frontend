import { useState } from 'react';
import unparsedFragrances from './fragrances.json';
import { parseFragrance, type Fragrance } from './types';
import { AppearanceSelector } from './AppearanceSelector';
import { FragranceCard, type FragranceCardMode } from './FragranceCard';
import { FragranceCardModeSelector, getInitialFragranceCardMode } from './FragranceCardModeSelector';
import { FragranceDetailPanel } from './FragranceDetailPanel';

const DATA: Fragrance[] = unparsedFragrances.map(parseFragrance);

export default function App() {
  const [selectedFragrance, setSelectedFragrance] = useState<Fragrance | undefined>();
  const [cardMode, setCardMode] = useState<FragranceCardMode>(getInitialFragranceCardMode());

  const handleCardSelect = (fragrance: Fragrance) => {
    setSelectedFragrance(fragrance);
  };

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
          {DATA.map((fragrance) => (
            selectedFragrance?.id === fragrance.id ? (
              <FragranceDetailPanel key={`fragrance-detail-${selectedFragrance.id}`} fragrance={selectedFragrance} onClose={() => setSelectedFragrance(undefined)} />
            ) : <FragranceCard mode={cardMode} key={fragrance.id} fragrance={fragrance} onSelect={handleCardSelect} />
          ))}
        </div>
      </main>
    </div>
  );
}
