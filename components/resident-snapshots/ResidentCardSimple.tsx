import { Sparkles } from "lucide-react";

import { ResidentAnalyticsMiniStrip } from "@/components/resident-snapshots/ResidentAnalyticsMiniStrip";
import { ResidentMoreMenu, type ResidentMoreMenuAction } from "@/components/resident-snapshots/ResidentMoreMenu";
import type { ResidentSnapshot } from "@/components/resident-snapshots/types";
import { toRelativeDayLabel } from "@/components/resident-snapshots/helpers";
import { ActionButton, StatusBadge, TagChip } from "@/components/workspace/shared";
import { toResidentStatusLabel } from "@/lib/residents/types";
import { cn } from "@/lib/utils";

export function ResidentCardSimple({
  resident,
  selected,
  onSelect,
  onAskActify,
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
  onViewDetails: () => void;
  moreActions: ResidentMoreMenuAction[];
  showCheckbox?: boolean;
  checked?: boolean;
  onToggleChecked?: () => void;
}) {
  const compactBadges = [
    resident.followUpRequired ? "Needs Follow-Up" : null,
    resident.supportNeeds.some((need) => /bed-bound/i.test(need)) || resident.status === "BED_BOUND" ? "Bed-Bound" : null,
    resident.tags.some((tag) => /1:1|one-to-one|prefers 1:1/i.test(tag)) ? "Prefers 1:1" : null,
    resident.tags.some((tag) => /group/i.test(tag)) ? "Group-Friendly" : null
  ]
    .filter((value): value is string => Boolean(value))
    .slice(0, 2);

  return (
    <article
      className={cn(
        "rounded-2xl border bg-white p-4 shadow-sm transition duration-200 hover:-translate-y-0.5 hover:shadow-md",
        selected ? "border-sky-300 ring-2 ring-sky-100" : "border-slate-200"
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <button type="button" onClick={onSelect} className="text-left">
          <h3 className="text-base font-semibold text-slate-900">{resident.fullName}</h3>
          <p className="text-sm text-slate-600">Room {resident.room}</p>
          {resident.preferredName ? <p className="text-xs text-slate-500">Prefers: {resident.preferredName}</p> : null}
        </button>
        <div className="flex items-center gap-2">
          <StatusBadge label={toResidentStatusLabel(resident.status)} tone={resident.status === "ACTIVE" ? "success" : "warning"} />
          <ResidentMoreMenu compact actions={moreActions} />
        </div>
      </div>

      <div className="mt-2 flex flex-wrap items-center gap-1.5">
        {compactBadges.map((badge) => (
          <StatusBadge
            key={badge}
            label={badge}
            tone={badge === "Needs Follow-Up" ? "danger" : badge === "Bed-Bound" ? "warning" : "default"}
          />
        ))}
      </div>

      <div className="mt-2 flex flex-wrap gap-1.5">
        {resident.tags.slice(0, 4).map((tag) => (
          <TagChip key={`${resident.id}-${tag}`} label={tag} />
        ))}
        {resident.tags.length > 4 ? <TagChip label={`+${resident.tags.length - 4} more`} /> : null}
      </div>

      <p className="mt-2 text-xs text-slate-500">Last engagement: {toRelativeDayLabel(resident.lastEngagementDate)}</p>

      <ResidentAnalyticsMiniStrip resident={resident} />

      <div className="mt-3 flex flex-wrap items-center gap-2">
        <ActionButton tone="secondary" onClick={onAskActify}>
          <Sparkles className="h-4 w-4" aria-hidden />
          Ask Actify
        </ActionButton>
        <ActionButton tone="secondary" onClick={onViewDetails}>
          View Details
        </ActionButton>
        {showCheckbox ? (
          <label className="ml-auto inline-flex items-center gap-2 text-xs font-medium text-slate-700">
            <input
              type="checkbox"
              checked={checked}
              onChange={() => onToggleChecked?.()}
              className="h-4 w-4 rounded border-slate-300"
            />
            Select
          </label>
        ) : null}
      </div>
    </article>
  );
}
