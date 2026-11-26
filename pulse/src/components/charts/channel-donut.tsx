import { useState } from "react";
import { formatMoney, type ChannelAggregate } from "../../lib/analytics";

const WIDTH = 560;
const HEIGHT = 340;
const CX = WIDTH / 2;
const CY = HEIGHT / 2;
const OUTER = 92;
const INNER = 56;
const ACCENT = "#0f9f8f";
const MUTED = "#667085";
const SLICE_COLORS = ["#0f9f8f", "#3b82f6", "#a855f7", "#eab308", "#ef4444"];

export function ChannelDonut({ channels }: { channels: readonly ChannelAggregate[] }) {
  const [tip, setTip] = useState<{ label: string; x: number; y: number } | null>(null);
  const total = channels.reduce((s, c) => s + c.revenue, 0);
  const polar = (revenue: number) => (total ? (revenue / total) * 2 * Math.PI : 0);

  let start = -Math.PI / 2;
  const slices = channels.map((channel, i) => {
    const sweep = polar(channel.revenue);
    const end = start + sweep;
    const mid = start + sweep / 2;
    const large = sweep > Math.PI ? 1 : 0;
    const color = SLICE_COLORS[i % SLICE_COLORS.length];
    const path = `M${CX + OUTER * Math.cos(start)},${CY + OUTER * Math.sin(start)} A${OUTER},${OUTER} 0 ${large} 1 ${CX + OUTER * Math.cos(end)},${CY + OUTER * Math.sin(end)} L${CX + INNER * Math.cos(end)},${CY + INNER * Math.sin(end)} A${INNER},${INNER} 0 ${large} 0 ${CX + INNER * Math.cos(start)},${CY + INNER * Math.sin(start)} Z`;
    const labelRadius = (OUTER + INNER) / 2;
    const labelX = CX + labelRadius * Math.cos(mid) * 1.18;
    const labelY = CY + labelRadius * Math.sin(mid) * 1.18;
    const entry = { channel, sweep, path, labelX, labelY, color };
    start = end;
    return entry;
  });

  const onEnter = (channel: ChannelAggregate) => {
    const share = total ? Math.round((channel.revenue / total) * 1000) / 10 : 0;
    setTip({ label: `${channel.channel} · ${formatMoney(channel.revenue)} · ${share}%`, x: CX, y: CY - OUTER - 26 });
  };

  return (
    <svg width={WIDTH} height={HEIGHT} viewBox={`0 0 ${WIDTH} ${HEIGHT}`} role="img" aria-label="Channel distribution by revenue">
      <title>Channel distribution by revenue</title>
      {slices.map((slice) => (
        <path
          key={slice.channel.channel}
          d={slice.path}
          fill={slice.color}
          onMouseEnter={() => onEnter(slice.channel)}
          onMouseLeave={() => setTip(null)}
        />
      ))}
      <circle cx={CX} cy={CY} r={INNER} fill="#ffffff" />
      <text x={CX} y={CY + 4} fontSize="16" fontWeight="600" fill="#0f172a" textAnchor="middle">
        {formatMoney(total)}
      </text>
      <text x={CX} y={CY + 20} fontSize="11" fill={MUTED} textAnchor="middle">
        total revenue
      </text>
      {slices.map((slice, i) => {
        const share = total ? Math.round((slice.channel.revenue / total) * 1000) / 10 : 0;
        const cx = CX + ((OUTER + INNER) / 2) * Math.cos(-Math.PI / 2 + (slices.slice(0, i).reduce((s, c) => s + polar(c.channel.revenue), 0) + slice.sweep / 2)) * 1.05;
        const cy = CY + ((OUTER + INNER) / 2) * Math.sin(-Math.PI / 2 + (slices.slice(0, i).reduce((s, c) => s + polar(c.channel.revenue), 0) + slice.sweep / 2)) * 1.05;
        return (
          <g key={slice.channel.channel} transform={`translate(${cx},${cy})`}>
            <rect x="-26" y="-9" width="52" height="18" rx="4" fill="#0f172a" fillOpacity={0.85} />
            <text x="0" y="5" fontSize="10" fill="#ffffff" textAnchor="middle">
              {slice.channel.channel} {share}%
            </text>
          </g>
        );
      })}
      {tip && (
        <g transform={`translate(${tip.x},${tip.y})`}>
          <rect x="-74" y="0" width="148" height="22" rx="4" fill="#0f172a" fillOpacity={0.85} />
          <text x="0" y="16" fontSize="11" fill="#ffffff" textAnchor="middle">
            {tip.label}
          </text>
        </g>
      )}
    </svg>
  );
}
