"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Search, X } from "lucide-react";
import { useFormStatus } from "react-dom";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

type AttendanceStatus = "PRESENT" | "ACTIVE" | "LEADING" | "REFUSED" | "NO_SHOW";
type UiAttendanceStatus = "PRESENT_ACTIVE" | "LEADING" | "REFUSED" | "NO_SHOW";
type BarrierReason =
  | "ASLEEP"
  | "BED_BOUND"
  | "THERAPY"
  | "AT_APPOINTMENT"
  | "REFUSED"
  | "NOT_INFORMED"
  | "PAIN"
  | "ISOLATION_PRECAUTIONS"
  | "OTHER";

type ResidentRow = {
  id: string;
  firstName: string;
  lastName: string;
  room: string;
  unitName: string | null;
  status: string;
  notes: string | null;
};

type ExistingAttendanceRow = {
  status: AttendanceStatus;
  barrierReason: BarrierReason | null;
  notes: string | null;
};

function AttendanceSubmitButtons({ compact = false }: { compact?: boolean }) {
  const { pending } = useFormStatus();

  return (
    <div className={cn("flex flex-wrap items-center gap-2", compact && "gap-1.5")}>
      <Button type="submit" name="afterSave" value="return" disabled={pending}>
        {pending ? "Saving..." : "Save & return to calendar"}
      </Button>
      <Button type="submit" variant="outline" name="afterSave" value="stay" disabled={pending}>
        {pending ? "Saving..." : "Save & stay"}
      </Button>
    </div>
  );
}

const statusOptions: Array<{ value: UiAttendanceStatus; label: string }> = [
  { value: "PRESENT_ACTIVE", label: "Present/Active" },
  { value: "LEADING", label: "Leading" },
  { value: "REFUSED", label: "Refused" },
  { value: "NO_SHOW", label: "No show" }
];

function getDefaultStatusSelections(status?: AttendanceStatus): UiAttendanceStatus[] {
  if (!status) return [];
  if (status === "LEADING") return ["PRESENT_ACTIVE", "LEADING"];
  if (status === "PRESENT" || status === "ACTIVE") return ["PRESENT_ACTIVE"];
  if (status === "REFUSED") return ["REFUSED"];
  return ["NO_SHOW"];
}

function highlightText(value: string, query: string) {
  if (!query) return value;
  const lowerValue = value.toLowerCase();
  const lowerQuery = query.toLowerCase();
  const index = lowerValue.indexOf(lowerQuery);
  if (index < 0) return value;

  const before = value.slice(0, index);
  const match = value.slice(index, index + query.length);
  const after = value.slice(index + query.length);

  return (
    <>
      {before}
      <mark className="rounded bg-actifyMint/30 px-0.5 text-foreground">{match}</mark>
      {after}
    </>
  );
}

export function AttendanceChecklistClient({
  activityId,
  residents,
  existingByResidentId,
  saveAction
}: {
  activityId: string;
  residents: ResidentRow[];
  existingByResidentId: Record<string, ExistingAttendanceRow | undefined>;
  saveAction: (formData: FormData) => Promise<void> | void;
}) {
  const [searchText, setSearchText] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");

  useEffect(() => {
    const timeout = window.setTimeout(() => {
      setDebouncedSearch(searchText.trim());
    }, 160);
    return () => window.clearTimeout(timeout);
  }, [searchText]);

  const normalizedQuery = debouncedSearch.toLowerCase();

  const matchingResidentIds = useMemo(() => {
    if (!normalizedQuery) {
      return new Set(residents.map((resident) => resident.id));
    }

    return new Set(
      residents
        .filter((resident) => {
          const fullName = `${resident.firstName} ${resident.lastName}`.toLowerCase();
          const reverseName = `${resident.lastName}, ${resident.firstName}`.toLowerCase();
          return (
            fullName.includes(normalizedQuery) ||
            reverseName.includes(normalizedQuery) ||
            resident.room.toLowerCase().includes(normalizedQuery) ||
            (resident.notes ?? "").toLowerCase().includes(normalizedQuery)
          );
        })
        .map((resident) => resident.id)
    );
  }, [normalizedQuery, residents]);

  const visibleCount = matchingResidentIds.size;

  return (
    <form action={saveAction} className="space-y-4">
      <div className="sticky top-2 z-20 rounded-lg border border-white/70 bg-white/90 p-3 shadow-sm backdrop-blur">
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative min-w-[250px] flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-foreground/55" />
            <Input
              value={searchText}
              onChange={(event) => setSearchText(event.target.value)}
              placeholder="Search resident by name, room, or notes"
              className="h-10 border-white/70 bg-white/90 pl-9 pr-10"
              aria-label="Search residents in real time"
            />
            {searchText ? (
              <button
                type="button"
                onClick={() => setSearchText("")}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-foreground/55 hover:text-foreground"
                aria-label="Clear search"
              >
                <X className="h-4 w-4" />
              </button>
            ) : null}
          </div>
          <AttendanceSubmitButtons compact />
          <Button asChild type="button" variant="ghost">
            <Link href={`/app/calendar/${activityId}/attendance`}>Clear</Link>
          </Button>
          <Badge variant="outline">{visibleCount} shown</Badge>
        </div>
      </div>

      <div className="space-y-4">
        <div className="space-y-2">
          {residents.length === 0 ? (
            <p className="rounded-md border border-dashed p-3 text-sm text-muted-foreground">
              No residents available for attendance.
            </p>
          ) : null}
          {residents.map((resident) => {
            const existing = existingByResidentId[resident.id];
            const isBedBoundResident = resident.status === "BED_BOUND";
            const defaultStatusSelections = new Set(
              existing?.status
                ? getDefaultStatusSelections(existing.status)
                : isBedBoundResident
                  ? (["NO_SHOW"] as UiAttendanceStatus[])
                  : []
            );
            const visible = matchingResidentIds.has(resident.id);
            const name = `${resident.lastName}, ${resident.firstName}`;

            return (
              <div
                key={`check-${resident.id}`}
                className={cn("rounded-md border p-3", !visible && "hidden")}
                aria-hidden={!visible}
              >
                <input type="hidden" name="residentIds" value={resident.id} />
                <div className="mb-2 flex items-center justify-between gap-2">
                  <p className="font-medium">{highlightText(name, debouncedSearch)}</p>
                  <span className="text-xs text-muted-foreground">
                    Room {highlightText(resident.room, debouncedSearch)} · {resident.unitName ?? "No unit"}
                  </span>
                </div>
                <div className="grid gap-2 lg:grid-cols-3">
                  <fieldset className="flex flex-wrap gap-3 rounded-md border bg-muted/20 px-3 py-2">
                    <legend className="px-1 text-[11px] font-medium text-muted-foreground">Status</legend>
                    {statusOptions.map((option) => (
                      <label key={`${resident.id}-${option.value}`} className="inline-flex items-center gap-1.5 text-xs">
                        <input
                          type="checkbox"
                          name={`status_${resident.id}`}
                          value={option.value}
                          defaultChecked={defaultStatusSelections.has(option.value)}
                          className="h-3.5 w-3.5"
                        />
                        {option.label}
                      </label>
                    ))}
                    {isBedBoundResident ? (
                      <p className="w-full text-[11px] text-muted-foreground">
                        Bed Bound residents default to No show with Bed bound barrier when left unchecked, but you can select other options.
                      </p>
                    ) : (
                      <p className="w-full text-[11px] text-muted-foreground">
                        You can check multiple. Save uses highest selected: No show &gt; Refused &gt; Leading &gt; Present/Active. If left unchecked, it saves as No show.
                      </p>
                    )}
                  </fieldset>
                  <select
                    name={`barrier_${resident.id}`}
                    defaultValue={existing?.barrierReason ?? (isBedBoundResident ? "BED_BOUND" : "")}
                    className="h-10 rounded-md border px-3 text-sm"
                  >
                    <option value="">No barrier</option>
                    <option value="ASLEEP">Asleep</option>
                    <option value="BED_BOUND">Bed bound</option>
                    <option value="THERAPY">Therapy</option>
                    <option value="AT_APPOINTMENT">At appointment</option>
                    <option value="REFUSED">Refused</option>
                    <option value="NOT_INFORMED">Not informed</option>
                    <option value="PAIN">Pain</option>
                    <option value="ISOLATION_PRECAUTIONS">Isolation precautions</option>
                    <option value="OTHER">Other</option>
                  </select>

                  <Input
                    name={`notes_${resident.id}`}
                    defaultValue={existing?.notes ?? ""}
                    placeholder="Optional notes"
                  />
                </div>
              </div>
            );
          })}
          {visibleCount === 0 ? (
            <p className="rounded-md border border-dashed p-3 text-sm text-muted-foreground">
              No residents matched your search.
            </p>
          ) : null}
        </div>
        <AttendanceSubmitButtons />
      </div>
    </form>
  );
}
