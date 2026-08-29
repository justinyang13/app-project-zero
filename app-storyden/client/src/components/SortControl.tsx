import { SORT_OPTIONS } from "../lib/sortBooks";
import type { SortOption } from "../lib/sortBooks";
import "./SortControl.css";

interface SortControlProps {
  value: SortOption;
  onChange: (value: SortOption) => void;
}

export function SortControl({ value, onChange }: SortControlProps) {
  return (
    <label className="sort-control">
      <span className="sort-control__label">Sort by</span>
      <select
        className="sort-control__select"
        value={value}
        onChange={(e) => onChange(e.target.value as SortOption)}
      >
        {SORT_OPTIONS.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </label>
  );
}
