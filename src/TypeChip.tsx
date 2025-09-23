import { type TypeKey } from './types';

const TYPE_EMOJIS: Record<TypeKey, string> = {
  "Animalisch": "🦁",
  "Aquatisch": "🌊",
  "Blumig": "🌸",
  "Chypre": "🌿",
  "Cremig": "🥛",
  "Erdig": "🌱",
  "Fougère": "🌾",
  "Frisch": "💨",
  "Fruchtig": "🍑",
  "Gourmand": "🍫",
  "Grün": "🍃",
  "Harzig": "🪵",
  "Holzig": "🌲",
  "Ledrig": "🥾",
  "Orientalisch": "🏺",
  "Pudrig": "🧴",
  "Rauchig": "☁️",
  "Süß": "🍭",
  "Synthetisch": "🧪",
  "Würzig": "🔥",
  "Zitrus": "☀️"
} as const;

const TYPE_TOKENS: Record<TypeKey, string> = {
  "Animalisch": "animalic",
  "Aquatisch": "aquatic",
  "Blumig": "floral",
  "Chypre": "chypre",
  "Cremig": "creamy",
  "Erdig": "earthy",
  "Fougère": "fougere",
  "Frisch": "fresh",
  "Fruchtig": "fruity",
  "Gourmand": "gourmand",
  "Grün": "green",
  "Harzig": "resinous",
  "Holzig": "woody",
  "Ledrig": "leathery",
  "Orientalisch": "amber",
  "Pudrig": "powdery",
  "Rauchig": "smoky",
  "Süß": "sweet",
  "Synthetisch": "synthetic",
  "Würzig": "spicy",
  "Zitrus": "citrus"
} as const;

export type TypeChipProps = {
  type: TypeKey;
  percentage: number;
};

const writtenOutInlineTailwindClassesToGenerateUtilityClassesFor = [
  "bg-type-animalic-bg text-type-animalic-fg border-type-animalic-border",
  "bg-type-aquatic-bg text-type-aquatic-fg border-type-aquatic-border",
  "bg-type-floral-bg text-type-floral-fg border-type-floral-border",
  "bg-type-chypre-bg text-type-chypre-fg border-type-chypre-border",
  "bg-type-creamy-bg text-type-creamy-fg border-type-creamy-border",
  "bg-type-earthy-bg text-type-earthy-fg border-type-earthy-border",
  "bg-type-fougere-bg text-type-fougere-fg border-type-fougere-border",
  "bg-type-fresh-bg text-type-fresh-fg border-type-fresh-border",
  "bg-type-fruity-bg text-type-fruity-fg border-type-fruity-border",
  "bg-type-gourmand-bg text-type-gourmand-fg border-type-gourmand-border",
  "bg-type-green-bg text-type-green-fg border-type-green-border",
  "bg-type-resinous-bg text-type-resinous-fg border-type-resinous-border",
  "bg-type-woody-bg text-type-woody-fg border-type-woody-border",
  "bg-type-leathery-bg text-type-leathery-fg border-type-leathery-border",
  "bg-type-amber-bg text-type-amber-fg border-type-amber-border",
  "bg-type-powdery-bg text-type-powdery-fg border-type-powdery-border",
  "bg-type-smoky-bg text-type-smoky-fg border-type-smoky-border",
  "bg-type-sweet-bg text-type-sweet-fg border-type-sweet-border",
  "bg-type-synthetic-bg text-type-synthetic-fg border-type-synthetic-border",
  "bg-type-spicy-bg text-type-spicy-fg border-type-spicy-border",
  "bg-type-citrus-bg text-type-citrus-fg border-type-citrus-border",
];

export function TypeChip({ type, percentage }: TypeChipProps) {
  const ticks = percentage >= 30 ? '▪▪▪' : percentage >= 20 ? '▪▪' : '▪';
  const tokenBase = TYPE_TOKENS[type];
  return (
    <span
      className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-type-${tokenBase}-bg text-type-${tokenBase}-fg border border-type-${tokenBase}-border`}
      title={`${TYPE_EMOJIS[type]} ${type}: ${Math.round(percentage)}%`}
    >
      {TYPE_EMOJIS[type]} {type} {ticks}
    </span>
  );
}
