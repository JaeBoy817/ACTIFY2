import { Sparkles } from "lucide-react";

import { ResidentMoreMenu, type ResidentMoreMenuAction } from "@/components/resident-snapshots/ResidentMoreMenu";
import type { ResidentSnapshot } from "@/components/resident-snapshots/types";
import { analyticsSummaryLabel } from "@/components/resident-snapshots/analytics";
import { toRelativeDayLabel } from "@/components/resident-snapshots/helpers";
import { ActionButton, StatusBadge, TagChip } from "@/components/workspace/shared";
import { toResidentStatusLabel } from "@/lib/residents/types";
import { cn } from "@/lib/utils";

export function ResidentCardListRow({
  resident,
  selected,
  onSelect,
  onAskActify,
  onTrackAttendance,
  onViewDetails,
  moreActions,
  showCheckbox,
  checked,
  onToggleChecked
}: {
  resident: ResidentSnapshot;
  selected?: boolean;
  onSelect: () => void;
  onAskActify: () => void;
  onTrackAttendance: () => void;
  onViewDetails: () => void;
  moreActions: ResidentMoreMenuAction[];
  showCheckbox?: boolean;
  checked?: boolean;
  onToggleChecked?: () => void;
}) {
  return (
    <article
      className={cn(
        "rounded-2xl border bg-white p-3 shadow-sm transition duration-200 hover:border-slate-300",
        selected ? "border-sky-300 ring-1 ring-sky-100" : "border-slate-200"
      )}
    >
      <div className="flex flex-wrap items-center gap-2">
        <button type="button" onClick={onSelect} className="min-w-[180px] text-left">
          <p className="font-semibold text-slate-900">{resident.fullName}</p>
          <p className="text-xs text-slate-600">Room {resident.room}</p>
        </button>
        <StatusBadge label={toResidentStatusLabel(resident.status)} tone={resident.status === "ACTIVE" ? "success" : "warning"} />
        {resident.tags.slice(0, 2).map((tag) => (
          <TagChip key={`${resident.id}-${tag}`} label={tag} />
        ))}
        <p className="text-xs text-slate-500">{analyticsSummaryLabel(resident)}</p>
        <span className="ml-auto text-xs text-slate-500">{toRelativeDayLabel(resident.lastEngagementDate)}</span>
        <ActionButton tone="secondary" onClick={onAskActify}>
          <Sparkles className="h-4 w-4" aria-hidden />
          Ask Actify
        </ActionButton>
        <ActionButton tone="secondary" onClick={onTrackAttendance}>
          Track
        </ActionButton>
        <ActionButton tone="secondary" onClick={onViewDetails}>
          View Details
        </ActionButton>
        {showCheckbox ? (
          <input
            type="checkbox"
            checked={checked}
            onChange={() => onToggleChecked?.()}
            className="h-4 w-4 rounded border-slate-300"
            aria-label={`Select ${resident.fullName}`}
          />
        ) : null}
        <ResidentMoreMenu compact actions={moreActions} />
      </div>
    </article>
  );
}
