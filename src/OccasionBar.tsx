import { StackedBar } from "./StackedBar";
import type { OccasionMap } from "./types";

const DISPLAY_DATA = [
  { key: "Täglich", color: "var(--color-stack-occasion-daily)", label: "Täglich", value: "📅" },
  { key: "Sport", color: "var(--color-stack-occasion-sport)", label: "Sport", value: "🏃" },
  { key: "Freizeit", color: "var(--color-stack-occasion-leisure)", label: "Freizeit", value: "🎮" },
  { key: "Ausgehen", color: "var(--color-stack-occasion-outing)", label: "Ausgehen", value: "✨" },
  { key: "Arbeit", color: "var(--color-stack-occasion-work)", label: "Arbeit", value: "💼" },
  { key: "Abend", color: "var(--color-stack-occasion-evening)", label: "Abend", value: "🌙" },
] as const;

export type OccasionBarProps = {
  map?: OccasionMap;
};

export function OccasionBar({ map }: OccasionBarProps) {
  return <StackedBar map={map} orderedDisplayData={DISPLAY_DATA} />;
}
