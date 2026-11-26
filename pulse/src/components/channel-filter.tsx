import { DEMO_CHANNELS } from "../lib/demo-data";

const capitalize = (s: string) => `${s.slice(0, 1).toUpperCase()}${s.slice(1)}`;

export function ChannelFilter({
  channel,
  onChange,
}: {
  channel: string;
  onChange: (channel: string) => void;
}) {
  return (
    <div className="pulse-filter">
      <label className="pulse-filter-label">Channel</label>
      <select
        className="pulse-filter-select"
        value={channel}
        onChange={event => onChange(event.target.value)}
      >
        <option value="all">All channels</option>
        {DEMO_CHANNELS.map(channel => (
          <option key={channel} value={channel}>
            {capitalize(channel)}
          </option>
        ))}
      </select>
    </div>
  );
}
