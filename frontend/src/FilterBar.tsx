import { useId, useRef } from "react";
import { emptyFilters, isFiltered, type Filters } from "./filters";
import type { Category } from "./types";
import "./FilterBar.css";

export interface FilterBarProps {
  categories: Category[];
  filters: Filters;
  onChange: (filters: Filters) => void;
}

/** Search by description and filter by category. Clear appears while a filter is active. */
export default function FilterBar({ categories, filters, onChange }: FilterBarProps) {
  const id = useId();
  const searchId = `${id}-search`;
  const categoryId = `${id}-category`;
  const active = isFiltered(filters);
  const searchRef = useRef<HTMLInputElement>(null);

  function handleClear() {
    onChange(emptyFilters);
    // Clear unmounts itself once the filters are empty; keep keyboard focus in the bar.
    searchRef.current?.focus();
  }

  return (
    <div className="filter-bar" role="search">
      <div className="filter-bar__field filter-bar__field--search">
        <label htmlFor={searchId}>Search descriptions</label>
        <input
          ref={searchRef}
          id={searchId}
          type="search"
          className="filter-bar__control"
          value={filters.query}
          autoComplete="off"
          onChange={(e) => onChange({ ...filters, query: e.target.value })}
        />
      </div>
      <div className="filter-bar__field">
        <label htmlFor={categoryId}>Category</label>
        <select
          id={categoryId}
          className="filter-bar__control"
          value={filters.category}
          onChange={(e) => onChange({ ...filters, category: e.target.value })}
        >
          <option value="">All categories</option>
          {categories.map((c) => (
            <option key={c.id} value={c.id}>
              {c.label}
            </option>
          ))}
        </select>
      </div>
      {active && (
        <button type="button" className="btn btn-quiet filter-bar__clear" onClick={handleClear}>
          Clear
        </button>
      )}
    </div>
  );
}
