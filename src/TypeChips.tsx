import { TypeChip } from './TypeChip';
import { type TypeMap, type TypeKey } from './types';

export type TypeChipsProps = {
  typeMap: TypeMap;
};

export function TypeChips({ typeMap }: TypeChipsProps) {
  const total = Object.values(typeMap).reduce((sum, count) => sum + count, 0);
  if (total === 0) return null;
  const chips = Object.entries(typeMap)
    .map(([type, count]) => ({ type: type as TypeKey, percentage: (count / total) * 100 }))
    .filter(({ percentage }) => percentage >= 5)
    .sort((a, b) => b.percentage - a.percentage)
    .slice(0, 2); // Max 2 chips
  if (chips.length === 0) return null;
  return (
    <div className="mb-3">
      <div className="flex flex-wrap gap-1">
        {chips.map(({ type, percentage }) => (
          <TypeChip key={type} type={type} percentage={percentage} />
        ))}
      </div>
    </div>
  );
}
