import { useState } from "react";
import { formatMoney, type MetricPoint } from "../../lib/analytics";

const WIDTH = 700;
const HEIGHT = 300;
const MARGIN = { top: 28, right: 24, bottom: 34, left: 48 };
const ACCENT = "#0f9f8f";
const MUTED = "#667085";

export function TrendChart({ points }: { points: readonly MetricPoint[] }) {
  const [tip, setTip] = useState<{ label: string; cx: number; cy: number } | null>(null);
  const n = points.length;
  const plotX = MARGIN.left;
  const plotW = WIDTH - MARGIN.left - MARGIN.right;
  const plotY = MARGIN.top;
  const plotH = HEIGHT - MARGIN.top - MARGIN.bottom;
  const max = Math.max(1, ...points.map((p) => p.revenue));
  const baseline = plotY + plotH;
  const x = (i: number) => (n === 1 ? plotX + plotW / 2 : plotX + (i / (n - 1)) * plotW);
  const y = (value: number) => baseline - (value / max) * plotH;
  const line = points.map((p, i) => `${x(i)},${y(p.revenue)}`).join(" ");

  return (
    <svg width={WIDTH} height={HEIGHT} viewBox={`0 0 ${WIDTH} ${HEIGHT}`} role="img" aria-label="Revenue trend over time">
      <title>Revenue trend over time</title>
      <defs>
        <clipPath id="trend-plot"><rect x={plotX} y={plotY} width={plotW} height={plotH} /></clipPath>
      </defs>
      <path fill={ACCENT} fillOpacity="0.12" d={`M${plotX} ${baseline} L${line} L${x(n - 1)} ${baseline} Z`} clipPath="url(#trend-plot)" />
      <polyline fill="none" stroke={ACCENT} strokeWidth="2" points={line} clipPath="url(#trend-plot)" />
      {points.map((p, i) => (
        <circle
          key={p.date}
          cx={x(i)}
          cy={y(p.revenue)}
          r={4}
          fill={ACCENT}
          stroke="#ffffff"
          strokeWidth="2"
          onMouseEnter={() =>
            setTip({
              label: `${p.date} · ${formatMoney(p.revenue)} · ${p.orders} order${p.orders === 1 ? "" : "s"}`,
              cx: x(i),
              cy: y(p.revenue),
            })}
          onMouseLeave={() => setTip(null)}
        />
      ))}
      <line x1={plotX} y1={baseline} x2={plotX + plotW} y2={baseline} stroke={MUTED} strokeWidth="1" />
      {[0, max / 2, max].map((value, i) => (
        <g key={i}>
          <line x1={plotX - 6} x2={plotX} y1={y(value)} y2={y(value)} stroke={MUTED} strokeWidth="1" />
          <text x={plotX - 10} y={y(value) + 4} fontSize="11" fill={MUTED} textAnchor="end">
            {formatMoney(value)}
          </text>
        </g>
      ))}
      {labelIndices(n).map((i) => (
        <text key={i} x={x(i)} y={baseline + 21} fontSize="11" fill={MUTED} textAnchor="middle">
          {points[i].date}
        </text>
      ))}
      {tip && (
        <g transform={`translate(${tip.cx},${tip.cy - 40})`}>
          <rect x="-46" y="0" width="92" height="22" rx="4" fill="#0f172a" fillOpacity={0.85} />
          <text x="0" y="16" fontSize="11" fill="#ffffff" textAnchor="middle">
            {tip.label}
          </text>
        </g>
      )}
    </svg>
  );
}

function labelIndices(n: number): number[] {
  if (n <= 3) return [0, 1, 2].filter((i) => i < n);
  const mid = Math.floor((n - 1) / 2);
  return [0, mid, n - 1];
}
