import { useState } from "react";
import { formatMoney, type ProductAggregate } from "../../lib/analytics";

const WIDTH = 700;
const HEIGHT = 300;
const MARGIN = { top: 34, right: 24, bottom: 40, left: 96 };
const ACCENT = "#0f9f8f";
const MUTED = "#667085";

export function ProductBar({ products }: { products: readonly ProductAggregate[] }) {
  const [tip, setTip] = useState<{ label: string; x: number; y: number } | null>(null);
  const n = products.length;
  const max = Math.max(1, ...products.map((p) => p.revenue));
  const plotX = MARGIN.left;
  const plotW = WIDTH - MARGIN.left - MARGIN.right;
  const rowH = (HEIGHT - MARGIN.top - MARGIN.bottom) / Math.max(n, 1);
  const barH = rowH * 0.5;

  const x = (value: number) => plotX + (value / max) * plotW;
  const cy = (i: number) => MARGIN.top + (i + 0.5) * rowH;

  return (
    <svg width={WIDTH} height={HEIGHT} viewBox={`0 0 ${WIDTH} ${HEIGHT}`} role="img" aria-label="Product ranking by revenue">
      <title>Product ranking by revenue</title>
      {products.map((p, i) => {
        const centerY = cy(i);
        const barEnd = x(p.revenue);
        return (
          <g key={p.sku}>
            <rect
              x={plotX}
              y={centerY - barH / 2}
              width={barEnd - plotX}
              height={barH}
              fill={ACCENT}
              onMouseEnter={() =>
                setTip({
                  label: `${p.product} · ${formatMoney(p.revenue)} · ${p.orders} orders`,
                  x: barEnd,
                  y: centerY,
                })}
              onMouseLeave={() => setTip(null)}
            />
            <text x={barEnd + 6} y={centerY + 4} fontSize="11" fill={MUTED}>
              {formatMoney(p.revenue)}
            </text>
          </g>
        );
      })}
      {products.map((p, i) => (
        <text key={i} x={plotX - 10} y={cy(i) + 4} fontSize="11" fill={MUTED} textAnchor="end">
          {p.product}
        </text>
      ))}
      {tip && (
        <g transform={`translate(${tip.x + 8},${tip.y - 14})`}>
          <rect x="0" y="0" width={120} height="22" rx="4" fill="#0f172a" fillOpacity={0.85} />
          <text x="6" y="16" fontSize="11" fill="#ffffff">{tip.label}</text>
        </g>
      )}
    </svg>
  );
}
