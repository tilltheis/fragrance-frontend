import { StackedBar } from './StackedBar';
import type { OccasionMap } from './types';

const DISPLAY_DATA = [
  { key: 'Täglich', className: 'bg-stack-occasion-daily', label: 'Täglich', value: '📅' },
  { key: 'Sport', className: 'bg-stack-occasion-sport', label: 'Sport', value: '🏃' },
  { key: 'Freizeit', className: 'bg-stack-occasion-leisure', label: 'Freizeit', value: '🎮' },
  { key: 'Ausgehen', className: 'bg-stack-occasion-outing', label: 'Ausgehen', value: '✨' },
  { key: 'Arbeit', className: 'bg-stack-occasion-work', label: 'Arbeit', value: '💼' },
  { key: 'Abend', className: 'bg-stack-occasion-evening', label: 'Abend', value: '🌙' },
] as const;

export type OccasionBarProps = {
  map?: OccasionMap;
};

export function OccasionBar({ map }: OccasionBarProps) {
  return <StackedBar map={map} orderedDisplayData={DISPLAY_DATA} />;
}
