type PerfumeBottleIconProps = {
  className?: string;
};

export function PerfumeBottleIcon({ className }: PerfumeBottleIconProps) {
  return (
    <svg
      viewBox="0 0 20 20"
      width="20"
      height="20"
      fill="currentColor"
      aria-hidden="true"
      focusable="false"
      data-ownership-indicator="true"
      className={className}
    >
      <rect x="7" y="1.5" width="6" height="3.5" rx="0.8" />
      <rect x="8.2" y="5" width="3.6" height="2.2" rx="0.6" />
      <path d="M5.5 8.5C5.5 7.67 6.17 7 7 7h6c0.83 0 1.5 0.67 1.5 1.5V16c0 1.38-1.12 2.5-2.5 2.5h-4c-1.38 0-2.5-1.12-2.5-2.5V8.5Z" />
    </svg>
  );
}
