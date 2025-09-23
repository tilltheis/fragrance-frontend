import { StackedBar } from "./StackedBar";
import type { SeasonMap } from "./types";

const DISPLAY_DATA = [
  { key: "Frühling", color: "var(--color-stack-season-spring)", label: "Frühling", value: "🌱" },
  { key: "Sommer", color: "var(--color-stack-season-summer)", label: "Sommer", value: "☀️" },
  { key: "Herbst", color: "var(--color-stack-season-autumn)", label: "Herbst", value: "🍂" },
  { key: "Winter", color: "var(--color-stack-season-winter)", label: "Winter", value: "❄️" },
] as const;

export type SeasonBarProps = {
  map: SeasonMap;
};

export function SeasonBar({ map }: SeasonBarProps) {
  return <StackedBar map={map} orderedDisplayData={DISPLAY_DATA} />;
}
