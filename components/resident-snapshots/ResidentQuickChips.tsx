import type { ResidentSnapshot } from "@/components/resident-snapshots/types";
import { TagChip } from "@/components/workspace/shared";

function includeIfPresent(list: string[], value: string | null | undefined) {
  if (!value || !value.trim()) return;
  list.push(value.trim());
}

export function ResidentQuickChips({ resident }: { resident: ResidentSnapshot }) {
  const chips: string[] = [];
  if (resident.tags.some((tag) => /1:1|one-to-one|prefers 1:1/i.test(tag))) chips.push("Prefers 1:1");
  if (resident.supportNeeds.some((need) => /bed-bound/i.test(need)) || resident.status === "BED_BOUND") chips.push("Bed-Bound");
  if (resident.supportNeeds.some((need) => /quiet/i.test(need))) chips.push("Quiet Setting");
  if (/encouragement/i.test(resident.participationStyle) || /encouragement/i.test(resident.whatWorks)) chips.push("Needs Encouragement");
  includeIfPresent(chips, resident.bestTimeOfDay ? `${resident.bestTimeOfDay}` : null);
  if (resident.supportNeeds.some((need) => /low energy/i.test(need))) chips.push("Low Energy");

  if (chips.length === 0) {
    return <p className="text-xs text-slate-500">No quick snapshot chips yet.</p>;
  }

  return (
    <div className="flex flex-wrap gap-1.5">
      {chips.slice(0, 6).map((chip) => (
        <TagChip key={chip} label={chip} />
      ))}
    </div>
  );
}
