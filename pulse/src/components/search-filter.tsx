export function SearchFilter({
  value,
  onChange,
}: {
  value: string;
  onChange: (search: string) => void;
}) {
  return (
    <div className="pulse-filter pulse-filter-search">
      <label className="pulse-filter-label">Search</label>
      <input
        type="search"
        role="searchbox"
        className="pulse-filter-input"
        value={value}
        onChange={event => onChange(event.target.value)}
      />
    </div>
  );
}
