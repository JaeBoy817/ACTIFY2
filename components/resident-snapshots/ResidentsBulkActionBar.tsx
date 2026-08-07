import { ActionButton, StickyActionBar } from "@/components/workspace/shared";

export function ResidentsBulkActionBar({
  count,
  visibleCount,
  isArchiving,
  archiveDisabled,
  onSelectVisible,
  onClearSelection,
  onAskActify,
  onAddTag,
  onAddFollowUp,
  onArchive,
  onExportSummaries,
  onExportParticipation
}: {
  count: number;
  visibleCount: number;
  isArchiving?: boolean;
  archiveDisabled?: boolean;
  onSelectVisible: () => void;
  onClearSelection: () => void;
  onAskActify: () => void;
  onAddTag: () => void;
  onAddFollowUp: () => void;
  onArchive: () => void;
  onExportSummaries: () => void;
  onExportParticipation: () => void;
}) {
  return (
    <StickyActionBar>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm font-medium text-slate-700">
          {count} resident{count === 1 ? "" : "s"} selected
          {visibleCount > 0 ? <span className="ml-1 text-slate-500">of {visibleCount} in view</span> : null}
        </p>
        <div className="flex flex-wrap items-center gap-2">
          <ActionButton tone="secondary" onClick={onSelectVisible} disabled={visibleCount === 0}>
            Select Visible
          </ActionButton>
          <ActionButton tone="ghost" onClick={onClearSelection} disabled={count === 0}>
            Clear
          </ActionButton>
          <ActionButton tone="secondary" onClick={onAddTag} disabled={count === 0}>
            Add Tag
          </ActionButton>
          <ActionButton tone="secondary" onClick={onAddFollowUp} disabled={count === 0}>
            Add Follow-Up
          </ActionButton>
          <ActionButton tone="secondary" onClick={onAskActify} disabled={count === 0}>
            Ask Actify
          </ActionButton>
          <ActionButton tone="secondary" onClick={onArchive} disabled={count === 0 || isArchiving || archiveDisabled}>
            {isArchiving ? "Archiving..." : "Archive"}
          </ActionButton>
          <ActionButton tone="secondary" onClick={onExportSummaries} disabled={count === 0}>
            Export Resident Summaries
          </ActionButton>
          <ActionButton tone="secondary" onClick={onExportParticipation} disabled={count === 0}>
            Export Participation Snapshot
          </ActionButton>
        </div>
      </div>
    </StickyActionBar>
  );
}
