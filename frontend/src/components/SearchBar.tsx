import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { SortOption } from "@/types";

interface SearchBarProps {
  query: string;
  onQueryChange: (query: string) => void;
  typeFilter: string;
  onTypeFilterChange: (type: string) => void;
  types: string[];
  sortBy: SortOption;
  onSortByChange: (sort: SortOption) => void;
}

export function SearchBar({
  query,
  onQueryChange,
  typeFilter,
  onTypeFilterChange,
  types,
  sortBy,
  onSortByChange,
}: SearchBarProps) {
  return (
    <div className="flex w-full max-w-xl flex-col gap-2 sm:flex-row">
      <input
        value={query}
        onChange={(e) => onQueryChange(e.target.value)}
        placeholder="Search word or definition…"
        className="flex-1 rounded-md border bg-background px-3 py-2 text-sm"
      />
      <Select value={typeFilter} onValueChange={(v) => onTypeFilterChange(v ?? "all")}>
        <SelectTrigger className="w-full sm:w-40">
          <SelectValue placeholder="All types">
            {(value: string) => (value === "all" ? "All types" : value)}
          </SelectValue>
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All types</SelectItem>
          {types.map((type) => (
            <SelectItem key={type} value={type}>
              {type}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <Select value={sortBy} onValueChange={(v) => onSortByChange(v as SortOption)}>
        <SelectTrigger className="w-full sm:w-40">
          <SelectValue placeholder="Sort">
            {(value: SortOption) => (value === "alphabetical" ? "Alphabetical" : "Newest")}
          </SelectValue>
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="newest">Newest</SelectItem>
          <SelectItem value="alphabetical">Alphabetical</SelectItem>
        </SelectContent>
      </Select>
    </div>
  );
}
