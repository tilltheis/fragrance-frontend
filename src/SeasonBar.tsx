import { StackedBar } from "./StackedBar";
import type { SeasonMap } from "./types";

const DISPLAY_DATA = [
  { key: "Frühling", className: "bg-stack-season-spring", label: "Frühling", value: "🌱" },
  { key: "Sommer", className: "bg-stack-season-summer", label: "Sommer", value: "☀️" },
  { key: "Herbst", className: "bg-stack-season-autumn", label: "Herbst", value: "🍂" },
  { key: "Winter", className: "bg-stack-season-winter", label: "Winter", value: "❄️" },
] as const;

export type SeasonBarProps = {
  map?: SeasonMap;
};

export function SeasonBar({ map }: SeasonBarProps) {
  return <StackedBar map={map} orderedDisplayData={DISPLAY_DATA} />;
}
