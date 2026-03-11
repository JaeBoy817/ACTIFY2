import { Inbox } from "lucide-react";

import { AttendanceQuickActionButton } from "@/components/attendance/v3/AttendanceQuickActionButton";

export function AttendanceEmptyState({
  title,
  description,
  actionLabel,
  onAction
}: {
  title: string;
  description: string;
  actionLabel?: string;
  onAction?: () => void;
}) {
  return (
    <div className="rounded-2xl border border-dashed border-[#2c3f66] bg-[#0b1426] p-10 text-center">
      <span className="mx-auto inline-flex h-12 w-12 items-center justify-center rounded-2xl border border-[#324b76] bg-[#12213c] text-[#bcd0f2]">
        <Inbox className="h-6 w-6" />
      </span>
      <h3 className="mt-3 text-lg font-semibold text-white">{title}</h3>
      <p className="mx-auto mt-2 max-w-lg text-sm text-[#9db2d8]">{description}</p>
      {actionLabel && onAction ? (
        <div className="mt-4">
          <AttendanceQuickActionButton label={actionLabel} onClick={onAction} tone="blue" />
        </div>
      ) : null}
    </div>
  );
}

