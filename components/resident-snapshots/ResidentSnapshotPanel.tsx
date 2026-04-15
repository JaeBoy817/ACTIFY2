import { CalendarDays, MessageSquareText, Sparkles, X } from "lucide-react";

import { AIActionButton } from "@/components/resident-snapshots/AIActionButton";
import { SnapshotSection } from "@/components/resident-snapshots/SnapshotSection";
import { ResidentTag } from "@/components/resident-snapshots/ResidentTag";
import type { ResidentSnapshot, SnapshotIntentAction } from "@/components/resident-snapshots/types";
import { toDisplayDate, toRelativeDayLabel } from "@/components/resident-snapshots/helpers";
import { toResidentStatusLabel } from "@/lib/residents/types";

function ListRow({ label, values }: { label: string; values: string[] }) {
  return (
    <div>
      <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">{label}</p>
      <p className="mt-1 text-sm leading-6 text-slate-700">{values.length ? values.join(", ") : "Not set"}</p>
    </div>
  );
}

function TextRow({ label, value }: { label: string; value: string | null | undefined }) {
  return (
    <div>
      <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">{label}</p>
      <p className="mt-1 text-sm leading-6 text-slate-700">{value && value.trim().length ? value : "Not set"}</p>
    </div>
  );
}

export function ResidentSnapshotPanel({
  resident,
  actions,
  onAskActify,
  onEdit,
  onArchive,
  archiveActionLabel,
  onClose
}: {
  resident: ResidentSnapshot;
  actions: SnapshotIntentAction[];
  onAskActify: (action: SnapshotIntentAction) => void;
  onEdit: () => void;
  onArchive: () => void;
  archiveActionLabel: string;
  onClose?: () => void;
}) {
  return (
    <aside className="h-full overflow-y-auto rounded-3xl border border-slate-200 bg-white p-4 shadow-sm shadow-slate-200/60">
      <header className="mb-4 rounded-2xl border border-slate-200 bg-slate-50 p-4">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Resident Snapshot</p>
            <h2 className="mt-1 text-xl font-semibold text-slate-900">{resident.fullName}</h2>
            <p className="text-sm text-slate-600">Room {resident.room}</p>
          </div>
          {onClose ? (
            <button
              type="button"
              onClick={onClose}
              className="rounded-full border border-slate-200 bg-white p-2 text-slate-600 transition hover:bg-slate-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-200 lg:hidden"
            >
              <X className="h-4 w-4" aria-hidden />
              <span className="sr-only">Close snapshot</span>
            </button>
          ) : null}
        </div>

        <div className="mt-3 flex flex-wrap gap-1.5">
          <ResidentTag label={toResidentStatusLabel(resident.status)} tone="accent" />
          {resident.tags.slice(0, 5).map((tag) => (
            <ResidentTag key={tag} label={tag} />
          ))}
        </div>

        <div className="mt-3 grid gap-2 text-sm text-slate-600 sm:grid-cols-2">
          <p>
            <span className="font-semibold text-slate-700">Preferred:</span> {resident.preferredName || "Not set"}
          </p>
          <p>
            <span className="font-semibold text-slate-700">Admission:</span> {toDisplayDate(resident.admissionDate)}
          </p>
          <p>
            <span className="font-semibold text-slate-700">Birthday:</span> {toDisplayDate(resident.birthDate)}
          </p>
          <p>
            <span className="font-semibold text-slate-700">Last engagement:</span> {toRelativeDayLabel(resident.lastEngagementDate)}
          </p>
          {resident.status === "DISCHARGED" ? (
            <p>
              <span className="font-semibold text-slate-700">Archived:</span> {resident.dischargeDate || "Not set"}
              {resident.dischargeReason ? ` (${resident.dischargeReason})` : ""}
            </p>
          ) : null}
        </div>

        <div className="mt-4 flex flex-wrap gap-2">
          <button
            type="button"
            onClick={onEdit}
            className="rounded-full border border-slate-200 bg-white px-3 py-1.5 text-sm font-medium text-slate-700 transition hover:bg-slate-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-200"
          >
            Edit Snapshot
          </button>
          <button
            type="button"
            onClick={onArchive}
            className="rounded-full border border-rose-200 bg-white px-3 py-1.5 text-sm font-medium text-rose-700 transition hover:bg-rose-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-200"
          >
            {archiveActionLabel}
          </button>
        </div>
      </header>

      <div className="space-y-3">
        <SnapshotSection title="Preference Snapshot">
          <ListRow label="Interests" values={resident.interests} />
          <ListRow label="Dislikes" values={resident.dislikes} />
          <ListRow label="Favorite Activities" values={resident.favoriteActivities} />
          <ListRow label="Favorite Conversation Topics" values={resident.favoriteTopics} />
          <ListRow label="Favorite Music" values={resident.favoriteMusic} />
          <ListRow label="Favorite Independent Activities" values={resident.independentActivities} />
          <TextRow label="Best Times for Engagement" value={resident.bestTimeOfDay} />
        </SnapshotSection>

        <SnapshotSection title="Participation Snapshot">
          <TextRow label="Group Participation Style" value={resident.participationStyle} />
          <TextRow label="1:1 Response Style" value={resident.oneToOneStyle} />
          <TextRow label="Common Refusals" value={resident.commonRefusals} />
          <TextRow label="What Works" value={resident.whatWorks} />
          <TextRow label="What Usually Does Not Work" value={resident.whatDoesNotWork} />
          <TextRow label="Suggested Approach Notes" value={resident.groupParticipationNotes} />
        </SnapshotSection>

        <SnapshotSection title="Support Needs Snapshot">
          <ListRow label="Support Needs" values={resident.supportNeeds} />
          <p className="text-sm text-slate-600">
            Keep support details practical and AD-focused. No diagnosis or charting language is used in this workspace.
          </p>
        </SnapshotSection>

        <SnapshotSection title="Last Engagement Snapshot">
          <div className="grid gap-3 text-sm text-slate-700">
            <div className="flex items-start gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2">
              <CalendarDays className="mt-0.5 h-4 w-4 text-slate-500" aria-hidden />
              <span>
                <span className="font-semibold text-slate-800">Last activity:</span> {resident.lastActivity || "Not set"}
              </span>
            </div>
            <div className="flex items-start gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2">
              <MessageSquareText className="mt-0.5 h-4 w-4 text-slate-500" aria-hidden />
              <span>
                <span className="font-semibold text-slate-800">Last 1:1 visit:</span> {resident.lastOneToOne || "Not set"}
              </span>
            </div>
            <TextRow label="Last note date" value={resident.lastNoteDate ? toDisplayDate(resident.lastNoteDate) : "Not set"} />
            <TextRow label="Last AI suggestion used" value={resident.lastAiSuggestion} />
          </div>
        </SnapshotSection>

        <SnapshotSection title="AI Action Panel" tone="accent">
          <p className="text-sm text-slate-700">One-tap prompts launch Actify Assistant with this resident context.</p>
          <div className="space-y-2">
            {actions.map((action) => (
              <AIActionButton
                key={action.id}
                label={action.label}
                description={action.description}
                onClick={() => onAskActify(action)}
                compact
              />
            ))}
          </div>
          <button
            type="button"
            onClick={() => onAskActify(actions[0])}
            className="inline-flex items-center gap-1.5 rounded-full border border-teal-300 bg-teal-600 px-3 py-1.5 text-sm font-semibold text-white transition hover:bg-teal-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-200"
          >
            <Sparkles className="h-4 w-4" aria-hidden />
            Ask Actify
          </button>
        </SnapshotSection>
      </div>
    </aside>
  );
}
