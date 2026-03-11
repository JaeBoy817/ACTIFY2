import { Filter, RefreshCcw } from "lucide-react";

import { AttendanceExportButton } from "@/components/attendance/v3/AttendanceExportButton";
import { AttendanceQuickActionButton } from "@/components/attendance/v3/AttendanceQuickActionButton";
import type { AttendanceStatusFilter } from "@/components/attendance/v3/types";

type AttendanceFilterBarProps = {
  searchValue: string;
  onSearchChange: (value: string) => void;
  dateKey: string;
  onDateChange: (value: string) => void;
  unitFilter: string;
  onUnitFilterChange: (value: string) => void;
  unitOptions: string[];
  locationFilter: string;
  onLocationFilterChange: (value: string) => void;
  locationOptions: string[];
  statusFilter: AttendanceStatusFilter;
  onStatusFilterChange: (value: AttendanceStatusFilter) => void;
  loading?: boolean;
  exporting?: boolean;
  onReload: () => void;
  onExport: () => void;
};

export function AttendanceFilterBar({
  searchValue,
  onSearchChange,
  dateKey,
  onDateChange,
  unitFilter,
  onUnitFilterChange,
  unitOptions,
  locationFilter,
  onLocationFilterChange,
  locationOptions,
  statusFilter,
  onStatusFilterChange,
  loading,
  exporting,
  onReload,
  onExport
}: AttendanceFilterBarProps) {
  return (
    <section className="rounded-2xl border border-[#1e3150] bg-[linear-gradient(180deg,#0a1325_0%,#0a1527_100%)] p-3 shadow-[0_20px_44px_-34px_rgba(37,99,235,0.78)]">
      <div className="flex flex-wrap items-end gap-2">
        <label className="min-w-[230px] flex-1 text-xs text-[#9eb4d8]">
          Search
          <input
            value={searchValue}
            onChange={(event) => onSearchChange(event.target.value)}
            placeholder="Search residents or activities"
            className="mt-1 h-10 w-full rounded-xl border border-[#2f4269] bg-[#0f1d35] px-3 text-sm text-[#e0edff] placeholder:text-[#7f97bf]"
          />
        </label>

        <label className="text-xs text-[#9eb4d8]">
          Date
          <input
            type="date"
            value={dateKey}
            onChange={(event) => onDateChange(event.target.value)}
            className="mt-1 h-10 rounded-xl border border-[#2f4269] bg-[#0f1d35] px-3 text-sm text-[#e0edff]"
          />
        </label>

        <label className="text-xs text-[#9eb4d8]">
          Hall / Unit
          <select
            value={unitFilter}
            onChange={(event) => onUnitFilterChange(event.target.value)}
            className="mt-1 h-10 min-w-[140px] rounded-xl border border-[#2f4269] bg-[#0f1d35] px-3 text-sm text-[#e0edff]"
          >
            <option value="all">All units</option>
            {unitOptions.map((unit) => (
              <option key={unit} value={unit}>
                {unit}
              </option>
            ))}
          </select>
        </label>

        <label className="text-xs text-[#9eb4d8]">
          Location
          <select
            value={locationFilter}
            onChange={(event) => onLocationFilterChange(event.target.value)}
            className="mt-1 h-10 min-w-[140px] rounded-xl border border-[#2f4269] bg-[#0f1d35] px-3 text-sm text-[#e0edff]"
          >
            <option value="all">All locations</option>
            {locationOptions.map((location) => (
              <option key={location} value={location}>
                {location}
              </option>
            ))}
          </select>
        </label>

        <label className="text-xs text-[#9eb4d8]">
          Status
          <select
            value={statusFilter}
            onChange={(event) => onStatusFilterChange(event.target.value as AttendanceStatusFilter)}
            className="mt-1 h-10 min-w-[160px] rounded-xl border border-[#2f4269] bg-[#0f1d35] px-3 text-sm text-[#e0edff]"
          >
            <option value="all">All statuses</option>
            <option value="not_started">Not started</option>
            <option value="in_progress">In progress</option>
            <option value="complete">Complete</option>
            <option value="present">Present</option>
            <option value="refused">Refused</option>
            <option value="asleep">Asleep</option>
            <option value="out_of_room">Out of room</option>
            <option value="one_to_one">1:1 completed</option>
            <option value="not_applicable">Not applicable</option>
            <option value="clear">Unmarked</option>
          </select>
        </label>

        <div className="ml-auto flex flex-wrap items-center gap-2">
          <AttendanceQuickActionButton
            label={loading ? "Refreshing..." : "Refresh"}
            icon={RefreshCcw}
            onClick={onReload}
            tone="neutral"
            disabled={loading}
          />
          <AttendanceQuickActionButton label="More Filters" icon={Filter} tone="neutral" />
          <AttendanceExportButton loading={exporting} onExport={onExport} />
        </div>
      </div>
    </section>
  );
}
