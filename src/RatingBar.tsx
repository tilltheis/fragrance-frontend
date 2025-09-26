interface RatingBarProps {
  label: string;
  value?: number;
  className?: string;
  classNames?: {
    track?: string;
    fill?: string;
    text?: string;
    label?: string;
    value?: string;
  };
}

export function RatingBar({ label, value, className, classNames }: RatingBarProps) {
  const width = value == null ? 0 : `${value}%`;
  const formattedValue = value == null ? "—" : value;
  return (
    <div className={`flex-1 relative h-5 ${className ?? ''}`}>
      <div className={`absolute inset-0 rounded ${classNames?.track ?? ''}`} />
      <div
        className={`absolute left-0 top-0 h-full rounded ${classNames?.fill ?? ''}`}
        style={{ width, transition: "width 0.3s" }}
      />
      <div
        className={`absolute inset-0 flex items-center justify-center font-semibold text-xs text-fg-black pointer-events-none ${classNames?.text ?? ''}`}
      >
        <span className={`mr-1 text-shadow-[0_0px_2px_#000,0_1px_2px_#000] ${classNames?.label ?? ''}`}>{label}</span>
        <span className={`text-shadow-[0_0px_2px_#fff,0_1px_2px_#fff] ${classNames?.value ?? ''}`}>{formattedValue}%</span>
      </div>
    </div>
  );
};