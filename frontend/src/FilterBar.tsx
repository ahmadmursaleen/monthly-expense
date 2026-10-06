import type { Filters } from "./filters";
import type { Category } from "./types";
import "./FilterBar.css";

export interface FilterBarProps {
  categories: Category[];
  filters: Filters;
  onChange: (filters: Filters) => void;
}

/** Search and category filter (owned by fe-filters-report). Stub: renders nothing. */
export default function FilterBar(props: FilterBarProps) {
  void props;
  return null;
}
