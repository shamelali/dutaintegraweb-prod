export type Range = "7d" | "30d" | "90d";

const RANGES: Array<{ value: Range; label: string }> = [
  { value: "7d", label: "7 days" },
  { value: "30d", label: "30 days" },
  { value: "90d", label: "90 days" },
];

export function RangeSelector({
  value,
  onChange,
}: {
  value: Range;
  onChange: (range: Range) => void;
}) {
  return (
    <div className="pulse-range-selector" role="radiogroup" aria-label="Time range">
      {RANGES.map(({ value: v, label }) => (
        <button
          key={v}
          type="button"
          aria-pressed={v === value}
          className={
            v === value
              ? "pulse-range-item pulse-range-item-active"
              : "pulse-range-item"
          }
          onClick={() => onChange(v)}
        >
          {label}
        </button>
      ))}
    </div>
  );
}
