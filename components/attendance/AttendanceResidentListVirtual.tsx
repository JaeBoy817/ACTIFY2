"use client";

import { memo, useMemo, useRef } from "react";
import { useVirtualizer } from "@tanstack/react-virtual";

import { AttendanceStatusChip } from "@/components/attendance/AttendanceStatusChip";
import { Badge } from "@/components/ui/badge";
import type { QuickAttendanceStatus } from "@/lib/attendance-tracker/status";
import type { AttendanceEntriesMap, AttendanceQuickResident } from "@/lib/attendance-tracker/types";
import { cn } from "@/lib/utils";

type ResidentRowState = {
  residentId: string;
  status: QuickAttendanceStatus;
};

const statusHotkeyHint = "1 Present · 2 Refused · 3 Asleep · 4 Out of Room · 5 1:1 · 0 Clear";

function formatResidentStatusText(status: string): string {
  return status
    .replaceAll("_", " ")
    .toLowerCase()
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

const ResidentRow = memo(function ResidentRow({
  resident,
  currentStatus,
  selected,
  onFocus,
  onStatusChange,
  disabled
}: {
  resident: AttendanceQuickResident;
  currentStatus: QuickAttendanceStatus;
  selected: boolean;
  onFocus: () => void;
  onStatusChange: (next: QuickAttendanceStatus) => void;
  disabled?: boolean;
}) {
  return (
    <div
      className={cn(
        "flex items-center justify-between gap-2 rounded-xl border px-3 py-2",
        "border-white/25 bg-white/70",
        selected && "ring-2 ring-[color:var(--actify-accent)]/45"
      )}
      onClick={onFocus}
    >
      <div className="min-w-0">
        <p className="truncate font-medium text-foreground">
          {resident.lastName}, {resident.firstName}
        </p>
        <div className="mt-1 flex flex-wrap items-center gap-1.5 text-xs text-muted-foreground">
          <span>Room {resident.room}</span>
          {resident.unitName ? <span>· {resident.unitName}</span> : null}
          <Badge variant="outline" className="border-white/30 bg-white/60 text-[10px]">
            {formatResidentStatusText(resident.residentStatus)}
          </Badge>
        </div>
      </div>
      <AttendanceStatusChip status={currentStatus} onStatusChange={onStatusChange} disabled={disabled} />
    </div>
  );
});

export function AttendanceResidentListVirtual({
  residents,
  entriesByResidentId,
  focusedResidentId,
  onFocusResident,
  onSetResidentStatus,
  className,
  disabled
}: {
  residents: AttendanceQuickResident[];
  entriesByResidentId: AttendanceEntriesMap;
  focusedResidentId: string | null;
  onFocusResident: (residentId: string) => void;
  onSetResidentStatus: (state: ResidentRowState) => void;
  className?: string;
  disabled?: boolean;
}) {
  const parentRef = useRef<HTMLDivElement>(null);

  const virtualizer = useVirtualizer({
    count: residents.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 72,
    overscan: 12
  });

  const currentIndex = useMemo(() => {
    if (!focusedResidentId) return -1;
    return residents.findIndex((resident) => resident.id === focusedResidentId);
  }, [focusedResidentId, residents]);

  function focusByIndex(nextIndex: number) {
    if (nextIndex < 0 || nextIndex >= residents.length) return;
    const resident = residents[nextIndex];
    if (!resident) return;
    onFocusResident(resident.id);
    virtualizer.scrollToIndex(nextIndex, {
      align: "auto"
    });
  }

  function handleKeyDown(event: React.KeyboardEvent<HTMLDivElement>) {
    if (residents.length === 0) return;

    if (event.key === "ArrowDown") {
      event.preventDefault();
      focusByIndex(currentIndex < 0 ? 0 : Math.min(currentIndex + 1, residents.length - 1));
      return;
    }

    if (event.key === "ArrowUp") {
      event.preventDefault();
      focusByIndex(currentIndex <= 0 ? 0 : currentIndex - 1);
      return;
    }

    if (!focusedResidentId) return;

    const resident = residents[currentIndex];
    if (!resident) return;

    const key = event.key;
    if (key === "1") onSetResidentStatus({ residentId: resident.id, status: "PRESENT" });
    if (key === "2") onSetResidentStatus({ residentId: resident.id, status: "REFUSED" });
    if (key === "3") onSetResidentStatus({ residentId: resident.id, status: "ASLEEP" });
    if (key === "4") onSetResidentStatus({ residentId: resident.id, status: "OUT_OF_ROOM" });
    if (key === "5") onSetResidentStatus({ residentId: resident.id, status: "ONE_TO_ONE" });
    if (key === "0") onSetResidentStatus({ residentId: resident.id, status: "CLEAR" });
  }

  return (
    <section className={cn("space-y-2", className)}>
      <div className="flex items-center justify-between gap-2">
        <p className="text-sm text-muted-foreground">Tap status chip to cycle.</p>
        <p className="text-xs text-muted-foreground">{statusHotkeyHint}</p>
      </div>
      <div
        ref={parentRef}
        tabIndex={0}
        onKeyDown={handleKeyDown}
        className="h-[62vh] min-h-[360px] overflow-auto rounded-xl border border-white/20 bg-white/35 p-2 outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--actify-accent)]/55"
        aria-label="Attendance resident list"
      >
        {residents.length === 0 ? (
          <div className="flex h-full items-center justify-center rounded-lg border border-dashed border-white/35 bg-white/60 text-sm text-muted-foreground">
            No residents for this filter.
          </div>
        ) : (
          <div
            style={{
              height: `${virtualizer.getTotalSize()}px`,
              width: "100%",
              position: "relative"
            }}
          >
            {virtualizer.getVirtualItems().map((virtualRow) => {
              const resident = residents[virtualRow.index];
              if (!resident) return null;
              const existing = entriesByResidentId[resident.id];
              const currentStatus = existing?.status ?? "CLEAR";
              return (
                <div
                  key={resident.id}
                  className="px-1 py-1"
                  style={{
                    position: "absolute",
                    top: 0,
                    left: 0,
                    width: "100%",
                    transform: `translateY(${virtualRow.start}px)`
                  }}
                >
                  <ResidentRow
                    resident={resident}
                    currentStatus={currentStatus}
                    selected={focusedResidentId === resident.id}
                    onFocus={() => onFocusResident(resident.id)}
                    onStatusChange={(next) => onSetResidentStatus({ residentId: resident.id, status: next })}
                    disabled={disabled}
                  />
                </div>
              );
            })}
          </div>
        )}
      </div>
    </section>
  );
}
