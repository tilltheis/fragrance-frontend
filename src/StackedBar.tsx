export type StackedBarSegmentDisplayData<T extends string> = {
  key: T;
  label: string;
  value: string;
  className?: string;
};

export type StackedBarProps<T extends string> = {
  map?: Partial<Record<T, number>>;
  orderedDisplayData: readonly StackedBarSegmentDisplayData<T>[];
  className?: string;
};

export function StackedBar<T extends string>({ map = {}, orderedDisplayData, className }: StackedBarProps<T>) {
  const total = Object.values(map).reduce((sum, count) => sum + count, 0);
  const segments = orderedDisplayData
    .map(({ key, ...rest }) => {
      return {
        ...rest,
        key,
        percentage: ((map[key] ?? 0) / total) * 100
      };
    })
    .filter(({ percentage }) => percentage > 0);

  return (
    <div className={`flex rounded overflow-hidden bg-gray-200 dark:bg-gray-700 h-5 ${className}`}>
      {segments.map(({ key, percentage, className, label, value }) => (
        <div
          key={key}
          style={{ width: `${percentage}%` }}
          className={className}
          title={`${label}: ${Math.round(percentage)}%`}
        >
          <span className="flex items-center justify-center h-full text-xs text-shadow-[0_0px_2px_#000,0_1px_2px_#000]">
            {value}
          </span>
        </div>
      ))}
    </div>
  );
}
