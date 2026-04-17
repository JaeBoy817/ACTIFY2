import { SlidersHorizontal } from "lucide-react";

import type { SnapshotFilterKey } from "@/components/resident-snapshots/types";
import { MoreFiltersDropdown } from "@/components/resident-snapshots/MoreFiltersDropdown";
import { ActionButton, SearchInput, SortDropdown } from "@/components/workspace/shared";

type SortKey =
  | "NAME"
  | "ROOM"
  | "RECENT"
  | "ADMISSION"
  | "BIRTHDAY"
  | "LAST_ENGAGEMENT"
  | "FOLLOW_UP"
  | "PARTICIPATION_HIGH"
  | "PARTICIPATION_LOW"
  | "MOST_MISSED"
  | "RECENT_1TO1"
  | "MOST_RECENT_ATTENDANCE"
  | "MOST_1TO1_COMPLETIONS"
  | "MOST_REFUSALS";

export function ResidentsControlBar({
  search,
  onSearch,
  sort,
  onSort,
  activeFilters,
  onToggleFilter,
  coreFilters,
  moreFilters,
  onClearMoreFilters,
  viewMode,
  onViewMode,
  onToggleBulkMode,
  bulkMode
}: {
  search: string;
  onSearch: (value: string) => void;
  sort: SortKey;
  onSort: (value: SortKey) => void;
  activeFilters: SnapshotFilterKey[];
  onToggleFilter: (key: SnapshotFilterKey) => void;
  coreFilters: Array<{ key: SnapshotFilterKey; label: string }>;
  moreFilters: Array<{ key: SnapshotFilterKey; label: string }>;
  onClearMoreFilters: () => void;
  viewMode: "GRID" | "LIST";
  onViewMode: (value: "GRID" | "LIST") => void;
  onToggleBulkMode: () => void;
  bulkMode: boolean;
}) {
  const sortOptions: Array<{ key: SortKey; label: string }> = [
    { key: "NAME", label: "Name A-Z" },
    { key: "ROOM", label: "Room Number" },
    { key: "RECENT", label: "Most Recently Added" },
    { key: "LAST_ENGAGEMENT", label: "Last Engagement" },
    { key: "ADMISSION", label: "Admission Date" },
    { key: "BIRTHDAY", label: "Birthday" },
    { key: "FOLLOW_UP", label: "Follow-Up Priority" },
    { key: "PARTICIPATION_HIGH", label: "Highest Participation %" },
    { key: "PARTICIPATION_LOW", label: "Lowest Participation %" },
    { key: "MOST_MISSED", label: "Most Missed Activities" },
    { key: "RECENT_1TO1", label: "Most Recent 1:1" },
    { key: "MOST_RECENT_ATTENDANCE", label: "Most Recent Attendance" },
    { key: "MOST_1TO1_COMPLETIONS", label: "Most 1:1 Completions" },
    { key: "MOST_REFUSALS", label: "Most Refusals" }
  ];

  return (
    <section className="sticky top-[5.75rem] z-20 rounded-2xl border border-slate-200 bg-white/95 p-3 shadow-sm backdrop-blur">
      <div className="flex flex-wrap items-center gap-2.5">
        <div className="min-w-[250px] flex-1">
          <SearchInput
            value={search}
            onChange={onSearch}
            placeholder="Search residents by name, room, interests, tags, or attendance trends..."
          />
        </div>
        <SortDropdown options={sortOptions} value={sort} onChange={onSort} />
        <ActionButton tone={viewMode === "GRID" ? "primary" : "secondary"} onClick={() => onViewMode("GRID")}>
          Grid
        </ActionButton>
        <ActionButton tone={viewMode === "LIST" ? "primary" : "secondary"} onClick={() => onViewMode("LIST")}>
          List
        </ActionButton>
        <ActionButton tone={bulkMode ? "primary" : "secondary"} onClick={onToggleBulkMode}>
          <SlidersHorizontal className="h-4 w-4" aria-hidden />
          {bulkMode ? "Selection On" : "Select Residents"}
        </ActionButton>
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-2">
        {coreFilters.map((filter) => {
          const active = activeFilters.includes(filter.key);
          return (
            <button
              key={filter.key}
              type="button"
              onClick={() => onToggleFilter(filter.key)}
              className={[
                "rounded-full border px-3 py-1.5 text-xs font-medium transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-200",
                active
                  ? "border-slate-900 bg-slate-900 text-white"
                  : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
              ].join(" ")}
            >
              {filter.label}
            </button>
          );
        })}
        <MoreFiltersDropdown
          options={moreFilters}
          selected={activeFilters.filter((key) => moreFilters.some((option) => option.key === key))}
          onToggle={onToggleFilter}
          onClear={onClearMoreFilters}
        />
      </div>
    </section>
  );
}
