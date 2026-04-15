import { FilterX } from "lucide-react";

import { SNAPSHOT_FILTER_OPTIONS, type SnapshotFilterKey } from "@/components/resident-snapshots/types";
import { cn } from "@/lib/utils";

export function ResidentFilterBar({
  filters,
  onToggleFilter,
  onClearFilters,
  availableFilters
}: {
  filters: SnapshotFilterKey[];
  onToggleFilter: (filter: SnapshotFilterKey) => void;
  onClearFilters: () => void;
  availableFilters: SnapshotFilterKey[];
}) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white/90 p-3 shadow-sm shadow-slate-200/50">
      <div className="mb-2 flex items-center justify-between gap-3">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Filters</p>
        <button
          type="button"
          onClick={onClearFilters}
          disabled={filters.length === 0}
          className="inline-flex items-center gap-1 rounded-full border border-slate-200 px-2.5 py-1 text-xs font-medium text-slate-600 transition hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-200 disabled:cursor-not-allowed disabled:opacity-40"
        >
          <FilterX className="h-3.5 w-3.5" aria-hidden />
          Clear
        </button>
      </div>
      <div className="flex flex-wrap gap-2">
        {availableFilters.map((filter) => {
          const option = SNAPSHOT_FILTER_OPTIONS.find((entry) => entry.key === filter);
          if (!option) return null;

          const active = filters.includes(filter);
          return (
            <button
              key={filter}
              type="button"
              onClick={() => onToggleFilter(filter)}
              className={cn(
                "rounded-full border px-3 py-1.5 text-xs font-medium transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-100",
                active
                  ? "border-teal-300 bg-teal-50 text-teal-700"
                  : "border-slate-200 bg-white text-slate-600 hover:border-slate-300 hover:bg-slate-50"
              )}
            >
              {option.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}
