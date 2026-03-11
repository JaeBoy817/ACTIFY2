import { CalendarClock, MapPin, NotebookPen, UsersRound } from "lucide-react";
import Link from "next/link";

import { AttendanceQuickActionButton } from "@/components/attendance/v3/AttendanceQuickActionButton";
import { cn } from "@/lib/utils";
import type { AttendanceSessionSummary } from "@/lib/attendance-tracker/types";

function resolveSessionStatus(session: AttendanceSessionSummary): "Not Started" | "In Progress" | "Complete" {
  if (session.counts.totalEntries === 0) return "Not Started";
  if (session.completionPercent >= 100) return "Complete";
  return "In Progress";
}

function statusClass(status: ReturnType<typeof resolveSessionStatus>) {
  if (status === "Complete") return "border-emerald-400/45 bg-emerald-500/18 text-emerald-100";
  if (status === "In Progress") return "border-sky-400/45 bg-sky-500/18 text-sky-100";
  return "border-amber-400/45 bg-amber-500/18 text-amber-100";
}

function timeLabel(startAt: string, endAt: string) {
  const start = new Date(startAt);
  const end = new Date(endAt);
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) return "Time unavailable";
  return `${start.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })} - ${end.toLocaleTimeString([], {
    hour: "numeric",
    minute: "2-digit"
  })}`;
}

export function AttendanceActivityRow({
  session,
  selected,
  onOpen,
  onContinue
}: {
  session: AttendanceSessionSummary;
  selected?: boolean;
  onOpen: () => void;
  onContinue: () => void;
}) {
  const sessionStatus = resolveSessionStatus(session);

  return (
    <article
      className={cn(
        "rounded-2xl border border-[#21365a] bg-[linear-gradient(180deg,#0d1a31_0%,#0b1528_100%)] p-4 transition",
        "shadow-[0_16px_30px_-26px_rgba(37,99,235,0.75)] hover:-translate-y-px hover:border-[#3b5788]",
        selected && "border-blue-300/45 ring-1 ring-blue-300/30"
      )}
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <button type="button" onClick={onOpen} className="truncate text-left text-base font-bold text-white hover:text-blue-100">
            {session.title}
          </button>
          <p className="mt-1 inline-flex items-center gap-1.5 text-xs text-[#9cb2d7]">
            <CalendarClock className="h-3.5 w-3.5" />
            {timeLabel(session.startAt, session.endAt)}
          </p>
          <p className="mt-1 inline-flex items-center gap-1.5 text-xs text-[#9cb2d7]">
            <MapPin className="h-3.5 w-3.5" />
            {session.location || "No location"}
          </p>
        </div>
        <span className={cn("inline-flex h-7 items-center rounded-full border px-2.5 text-xs font-semibold", statusClass(sessionStatus))}>
          {sessionStatus}
        </span>
      </div>

      <div className="mt-3 grid gap-2 text-xs text-[#a8bddf] sm:grid-cols-4">
        <p>
          Marked <span className="font-semibold text-white">{session.counts.totalEntries}</span>
        </p>
        <p>
          Present <span className="font-semibold text-white">{session.counts.present + session.counts.oneToOne}</span>
        </p>
        <p>
          Follow-up <span className="font-semibold text-white">{session.counts.refused + session.counts.asleep + session.counts.outOfRoom}</span>
        </p>
        <p>
          Completion <span className="font-semibold text-white">{session.completionPercent.toFixed(0)}%</span>
        </p>
      </div>

      <div className="mt-3 h-2 rounded-full bg-[#142746]">
        <div
          className="h-2 rounded-full bg-[linear-gradient(90deg,#3b82f6_0%,#22d3ee_55%,#818cf8_100%)] transition-[width] duration-300"
          style={{ width: `${Math.max(4, Math.min(100, session.completionPercent))}%` }}
          aria-hidden
        />
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-2">
        <AttendanceQuickActionButton label="Continue" onClick={onContinue} tone="blue" />
        <AttendanceQuickActionButton label="View Residents" icon={UsersRound} onClick={onOpen} tone="sky" />
        <AttendanceQuickActionButton label="Add Note" icon={NotebookPen} href={`/app/notes?activityId=${encodeURIComponent(session.id)}`} tone="violet" />
        <Link
          href={`/app/calendar/${encodeURIComponent(session.id)}/attendance`}
          className="inline-flex h-8 items-center rounded-full border border-[#334d78] bg-[#12213c] px-3 text-xs font-semibold text-[#d9e7ff] transition hover:border-[#4e6fa7] hover:bg-[#16294a]"
        >
          Open Attendance
        </Link>
      </div>
    </article>
  );
}

