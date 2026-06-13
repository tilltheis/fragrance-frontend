import { TYPES, type TypeKey } from '../types';
import { type BrowseState } from '../types';
import { type SearchStateActions } from '../useSearchState';

const TYPE_EMOJIS: Record<TypeKey, string> = {
  Animalisch: '🦁',
  Aquatisch: '🌊',
  Blumig: '🌸',
  Chypre: '🌿',
  Cremig: '🥛',
  Erdig: '🌱',
  Fougère: '🌾',
  Frisch: '💨',
  Fruchtig: '🍑',
  Gourmand: '🍫',
  Grün: '🍃',
  Harzig: '🪵',
  Holzig: '🌲',
  Ledrig: '🥾',
  Orientalisch: '🏺',
  Pudrig: '🧴',
  Rauchig: '☁️',
  Süß: '🍭',
  Synthetisch: '🧪',
  Würzig: '🔥',
  Zitrus: '☀️',
} as const;

const TYPE_TOKENS: Record<TypeKey, string> = {
  Animalisch: 'animalic',
  Aquatisch: 'aquatic',
  Blumig: 'floral',
  Chypre: 'chypre',
  Cremig: 'creamy',
  Erdig: 'earthy',
  Fougère: 'fougere',
  Frisch: 'fresh',
  Fruchtig: 'fruity',
  Gourmand: 'gourmand',
  Grün: 'green',
  Harzig: 'resinous',
  Holzig: 'woody',
  Ledrig: 'leathery',
  Orientalisch: 'amber',
  Pudrig: 'powdery',
  Rauchig: 'smoky',
  Süß: 'sweet',
  Synthetisch: 'synthetic',
  Würzig: 'spicy',
  Zitrus: 'citrus',
} as const;

// Dummy ref for tailwind JIT
// @ts-ignore
const _tailwindRef = [
  'bg-type-animalic-bg text-type-animalic-fg border-type-animalic-border ring-type-animalic-border',
  'bg-type-aquatic-bg text-type-aquatic-fg border-type-aquatic-border ring-type-aquatic-border',
  'bg-type-floral-bg text-type-floral-fg border-type-floral-border ring-type-floral-border',
  'bg-type-chypre-bg text-type-chypre-fg border-type-chypre-border ring-type-chypre-border',
  'bg-type-creamy-bg text-type-creamy-fg border-type-creamy-border ring-type-creamy-border',
  'bg-type-earthy-bg text-type-earthy-fg border-type-earthy-border ring-type-earthy-border',
  'bg-type-fougere-bg text-type-fougere-fg border-type-fougere-border ring-type-fougere-border',
  'bg-type-fresh-bg text-type-fresh-fg border-type-fresh-border ring-type-fresh-border',
  'bg-type-fruity-bg text-type-fruity-fg border-type-fruity-border ring-type-fruity-border',
  'bg-type-gourmand-bg text-type-gourmand-fg border-type-gourmand-border ring-type-gourmand-border',
  'bg-type-green-bg text-type-green-fg border-type-green-border ring-type-green-border',
  'bg-type-resinous-bg text-type-resinous-fg border-type-resinous-border ring-type-resinous-border',
  'bg-type-woody-bg text-type-woody-fg border-type-woody-border ring-type-woody-border',
  'bg-type-leathery-bg text-type-leathery-fg border-type-leathery-border ring-type-leathery-border',
  'bg-type-amber-bg text-type-amber-fg border-type-amber-border ring-type-amber-border',
  'bg-type-powdery-bg text-type-powdery-fg border-type-powdery-border ring-type-powdery-border',
  'bg-type-smoky-bg text-type-smoky-fg border-type-smoky-border ring-type-smoky-border',
  'bg-type-sweet-bg text-type-sweet-fg border-type-sweet-border ring-type-sweet-border',
  'bg-type-synthetic-bg text-type-synthetic-fg border-type-synthetic-border ring-type-synthetic-border',
  'bg-type-spicy-bg text-type-spicy-fg border-type-spicy-border ring-type-spicy-border',
  'bg-type-citrus-bg text-type-citrus-fg border-type-citrus-border ring-type-citrus-border',
];

interface Props {
  state: BrowseState;
  actions: SearchStateActions;
}

export function TypeFilterChips({ state, actions }: Props) {
  return (
    <div>
      <p className="text-sm font-semibold text-fg-base mb-2">Typ</p>
      <div className="flex flex-wrap gap-2" role="group" aria-label="Typ auswählen">
        {TYPES.map((type) => {
          const active = state.types.includes(type);
          const token = TYPE_TOKENS[type];
          return (
            <button
              key={type}
              aria-pressed={active}
              onClick={() => actions.toggleType(type)}
              className={`
                inline-flex items-center gap-1 px-2.5 py-1.5 rounded-full border text-xs font-medium
                transition-colors min-h-11
                focus:outline-none focus-visible:ring-2 focus-visible:ring-focus-ring
                bg-type-${token}-bg text-type-${token}-fg
                ${active
                  ? `border-type-${token}-border ring-2 ring-type-${token}-border font-semibold`
                  : `border-type-${token}-border opacity-60 hover:opacity-100`
                }
              `}
            >
              {TYPE_EMOJIS[type]} {type}
              {active && <span className="ml-1 font-bold">✓</span>}
            </button>
          );
        })}
      </div>
    </div>
  );
}
