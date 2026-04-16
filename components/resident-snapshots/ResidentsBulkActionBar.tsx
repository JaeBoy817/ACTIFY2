import { ActionButton, StickyActionBar } from "@/components/workspace/shared";

export function ResidentsBulkActionBar({
  count,
  onAskActify,
  onAddTag,
  onAddFollowUp,
  onArchive,
  onExportSummaries,
  onExportParticipation
}: {
  count: number;
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
        <p className="text-sm font-medium text-slate-700">{count} residents selected</p>
        <div className="flex flex-wrap items-center gap-2">
          <ActionButton tone="secondary" onClick={onAddTag}>
            Add Tag
          </ActionButton>
          <ActionButton tone="secondary" onClick={onAddFollowUp}>
            Add Follow-Up
          </ActionButton>
          <ActionButton tone="secondary" onClick={onAskActify}>
            Ask Actify
          </ActionButton>
          <ActionButton tone="secondary" onClick={onArchive}>
            Archive
          </ActionButton>
          <ActionButton tone="secondary" onClick={onExportSummaries}>
            Export Resident Summaries
          </ActionButton>
          <ActionButton tone="secondary" onClick={onExportParticipation}>
            Export Participation Snapshot
          </ActionButton>
        </div>
      </div>
    </StickyActionBar>
  );
}
