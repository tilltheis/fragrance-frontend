import styles from './SeasonBar.module.css';
import { StackedBar } from "./StackedBar";
import type { SeasonMap } from "./types";

const DISPLAY_DATA = [
  { key: "Frühling", color: "var(--Frühling)", label: "Frühling", value: "🌱" },
  { key: "Sommer", color: "var(--Sommer)", label: "Sommer", value: "☀️" },
  { key: "Herbst", color: "var(--Herbst)", label: "Herbst", value: "🍂" },
  { key: "Winter", color: "var(--Winter)", label: "Winter", value: "❄️" },
] as const;

export type SeasonBarProps = {
  map: SeasonMap;
};

export function SeasonBar({ map }: SeasonBarProps) {
  return <StackedBar map={map} orderedDisplayData={DISPLAY_DATA} className={styles.root} />;
}
