import { AttendanceSubNav } from "@/components/attendance/AttendanceSubNav";
import { Card, CardContent } from "@/components/ui/card";

export default function AttendanceLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="space-y-4">
      <Card className="glass-panel rounded-2xl border-white/20">
        <CardContent className="space-y-4 p-4">
          <div className="space-y-1">
            <h1 className="font-[var(--font-display)] text-3xl text-foreground">Attendance Tracker</h1>
            <p className="text-sm text-muted-foreground">
              Fast 3-step flow: choose date and activity, mark residents, save.
            </p>
          </div>
          <AttendanceSubNav />
        </CardContent>
      </Card>
      {children}
    </div>
  );
}

