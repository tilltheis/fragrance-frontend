import styles from './TypeChip.module.css';
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

export type TypeChipProps = {
  type: TypeKey;
  percentage: number;
};

export function TypeChip({ type, percentage }: TypeChipProps) {
  const color = `var(--${type})`;
  const ticks = percentage >= 30 ? '▪▪▪' : percentage >= 20 ? '▪▪' : '▪';
  return (
    <span
      className={`${styles.root} inline-flex items-center px-2 py-1 rounded-full text-xs font-medium`}
      style={{
        backgroundColor: `rgb(${color} / 0.2)`,
        color: `rgb(${color})`,
        border: `1px solid rgb(${color} / 0.4)`,
      }}
      title={`${TYPE_EMOJIS[type]} ${type}: ${Math.round(percentage)}%`}
    >
      {TYPE_EMOJIS[type]} {type} {ticks}
    </span>
  );
}
