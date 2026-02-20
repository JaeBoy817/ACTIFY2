import { UsersRound } from "lucide-react";

import { Badge } from "@/components/ui/badge";

export function AttendancePanel({
  attendees,
  attendanceCount
}: {
  attendees: string[];
  attendanceCount: number;
}) {
  const displayedCount = attendees.length > 0 ? attendees.length : attendanceCount;

  return (
    <div className="rounded-xl border border-white/40 bg-white/75 p-4 shadow-lg shadow-black/10">
      <div className="mb-2 flex items-center justify-between">
        <p className="inline-flex items-center gap-1.5 text-sm font-semibold text-foreground">
          <UsersRound className="h-4 w-4 text-actifyBlue" />
          Attendance
        </p>
        <Badge variant="outline" className="bg-white/80">
          {displayedCount} present
        </Badge>
      </div>
      {attendees.length === 0 ? (
        <p className="text-sm text-foreground/65">Attendance count was recorded without resident-level names.</p>
      ) : (
        <div className="flex max-h-40 flex-wrap gap-2 overflow-y-auto pr-1">
          {attendees.map((name) => (
            <Badge key={name} variant="outline" className="bg-white/85">
              {name}
            </Badge>
          ))}
        </div>
      )}
    </div>
  );
}
