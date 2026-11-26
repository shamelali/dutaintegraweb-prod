import { cn } from "@/lib/utils";

export function StatCard({
  title,
  value,
  delta,
}: {
  title: string;
  value: string | number;
  delta?: { label: string; positive?: boolean };
}) {
  return (
    <div className="pulse-stat-card">
      <p className="pulse-stat-title">{title}</p>
      <p className="pulse-stat-value">{value}</p>
      {delta && (
        <p className={cn("pulse-stat-delta", delta.positive !== false && "pulse-stat-delta-up")}>
          {delta.label}
        </p>
      )}
    </div>
  );
}
