"use client";

import { memo } from "react";
import { BedDouble, MessageSquareOff, Stethoscope } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import {
  formatResidentBirthDate,
  getResidentAge,
  getResidentTagIconKeys,
  toResidentStatusLabel,
  type ResidentListRow
} from "@/lib/residents/types";

function statusClassName(status: ResidentListRow["status"]) {
  if (status === "ACTIVE") return "border-emerald-200 bg-emerald-50 text-emerald-700";
  if (status === "BED_BOUND") return "border-sky-200 bg-sky-50 text-sky-700";
  if (status === "HOSPITALIZED") return "border-amber-200 bg-amber-50 text-amber-700";
  if (status === "DISCHARGED") return "border-zinc-200 bg-zinc-100 text-zinc-700";
  return "border-violet-200 bg-violet-50 text-violet-700";
}

function ResidentListItemImpl({
  resident,
  selected,
  onSelectResident
}: {
  resident: ResidentListRow;
  selected: boolean;
  onSelectResident: (residentId: string) => void;
}) {
  const tagIcons = getResidentTagIconKeys(resident.tags);
  const age = getResidentAge(resident.birthDate);

  return (
    <button
      type="button"
      onClick={() => onSelectResident(resident.id)}
      className={`w-full rounded-xl border p-3 text-left shadow-lg shadow-black/10 transition hover:-translate-y-[1px] hover:bg-white/80 ${
        selected
          ? "border-actifyBlue/35 bg-actifyBlue/10 ring-2 ring-actifyBlue/30"
          : "border-white/50 bg-white/70"
      }`}
      aria-pressed={selected}
    >
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="font-medium text-foreground">
            {resident.lastName}, {resident.firstName}
          </p>
          <p className="text-xs text-foreground/70">Room {resident.room}</p>
          <p className="text-xs text-foreground/65">
            Birthday {formatResidentBirthDate(resident.birthDate)} • Age {age ?? "—"}
          </p>
        </div>
        <Badge className={`border ${statusClassName(resident.status)}`}>
          {toResidentStatusLabel(resident.status)}
        </Badge>
      </div>

      {tagIcons.length > 0 ? (
        <div className="mt-2 flex items-center gap-2 text-foreground/65">
          {tagIcons.includes("BED_BOUND") ? (
            <span className="inline-flex items-center gap-1 text-xs">
              <BedDouble className="h-3.5 w-3.5 text-sky-600" />
              Bed bound
            </span>
          ) : null}
          {tagIcons.includes("NON_VERBAL") ? (
            <span className="inline-flex items-center gap-1 text-xs">
              <MessageSquareOff className="h-3.5 w-3.5 text-violet-600" />
              Non-verbal
            </span>
          ) : null}
          {tagIcons.includes("TRACH") ? (
            <span className="inline-flex items-center gap-1 text-xs">
              <Stethoscope className="h-3.5 w-3.5 text-amber-600" />
              Trach
            </span>
          ) : null}
        </div>
      ) : null}
    </button>
  );
}

export const ResidentListItem = memo(ResidentListItemImpl);
