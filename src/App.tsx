import { useState } from 'react';
import unparsedFragrances from './fragrances.json';
import { parseFragrance, type Fragrance } from './types';
import { AppearanceSelector } from './AppearanceSelector';
import { FragranceCard } from './FragranceCard';

const DATA: Fragrance[] = unparsedFragrances.map(parseFragrance);

export default function App() {
  const [selectedId, setSelectedId] = useState<number | null>(null);

  const handleCardSelect = (id: number) => {
    setSelectedId(id);
    // TODO: Open detail view
    console.log('Selected fragrance:', id);
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
        <AppearanceSelector />
      </header>

      <main className="max-w-7xl mx-auto px-4 py-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {DATA.map((fragrance) => (
            <FragranceCard
              key={fragrance.id}
              fragrance={fragrance}
              onSelect={handleCardSelect}
            />
          ))}
        </div>
      </main>
    </div>
  );
}
