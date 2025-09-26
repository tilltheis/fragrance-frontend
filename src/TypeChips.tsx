import { TypeChip } from './TypeChip';
import { type TypeMap, type TypeKey } from './types';

export type TypeChipsProps = {
  typeMap?: TypeMap;
  className?: string;
};

export function TypeChips({ typeMap: maybeTypeMap, className }: TypeChipsProps) {
  const typeMap = maybeTypeMap ?? {};
  const total = Object.values(typeMap).reduce((sum, count) => sum + count, 0);
  const chips = Object.entries(typeMap)
    .map(([type, count]) => ({ type: type as TypeKey, percentage: (count / total) * 100 }))
    .filter(({ percentage }) => percentage >= 5)
    .sort((a, b) => b.percentage - a.percentage)
    .slice(0, 2); // Max 2 chips
  return (
    <div className={`flex flex-wrap gap-1 h-6.5 ${className}`}>
      {chips.map(({ type, percentage }) => (
        <TypeChip key={type} type={type} percentage={percentage} />
      ))}
    </div>
  );
}
