import { DEMO_STATUSES } from "../lib/demo-data";

const capitalize = (s: string) => `${s.slice(0, 1).toUpperCase()}${s.slice(1)}`;

export function StatusFilter({
  status,
  onChange,
}: {
  status: string;
  onChange: (status: string) => void;
}) {
  return (
    <div className="pulse-filter">
      <label className="pulse-filter-label">Status</label>
      <select
        className="pulse-filter-select"
        value={status}
        onChange={event => onChange(event.target.value)}
      >
        <option value="all">All statuses</option>
        {DEMO_STATUSES.map(status => (
          <option key={status} value={status}>
            {capitalize(status)}
          </option>
        ))}
      </select>
    </div>
  );
}
