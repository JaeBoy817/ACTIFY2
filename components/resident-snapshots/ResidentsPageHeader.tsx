import { Plus } from "lucide-react";

import { ActionButton } from "@/components/workspace/shared";

export function ResidentsPageHeader({
  onAddResident,
  onViewArchived,
  moreMenu
}: {
  onAddResident: () => void;
  onViewArchived: () => void;
  moreMenu?: React.ReactNode;
}) {
  return (
    <header className="rounded-3xl border border-slate-200 bg-white/85 px-5 py-4 shadow-sm shadow-slate-200/70">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900 sm:text-3xl">Residents</h1>
          <p className="mt-1 text-sm text-slate-600 sm:text-base">
            Quick resident preferences, participation style, engagement support, and attendance insights.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <ActionButton tone="secondary" onClick={onViewArchived}>
            Archived Residents
          </ActionButton>
          {moreMenu}
          <ActionButton onClick={onAddResident}>
            <Plus className="h-4 w-4" aria-hidden />
            Add Resident
          </ActionButton>
        </div>
      </div>
    </header>
  );
}
