import styles from './OccasionBar.module.css';
import { StackedBar } from "./StackedBar";
import type { OccasionMap } from "./types";

const DISPLAY_DATA = [
  { key: "Täglich", color: "var(--Täglich)", label: "Täglich", value: "📅" },
  { key: "Sport", color: "var(--Sport)", label: "Sport", value: "🏃" },
  { key: "Freizeit", color: "var(--Freizeit)", label: "Freizeit", value: "🎮" },
  { key: "Ausgehen", color: "var(--Ausgehen)", label: "Ausgehen", value: "✨" },
  { key: "Arbeit", color: "var(--Arbeit)", label: "Arbeit", value: "💼" },
  { key: "Abend", color: "var(--Abend)", label: "Abend", value: "🌙" },
] as const;

export type OccasionBarProps = {
  map: OccasionMap;
};

export function OccasionBar({ map }: OccasionBarProps) {
  return <StackedBar map={map} orderedDisplayData={DISPLAY_DATA} className={styles.root} />;
}
