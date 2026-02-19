import { AttendanceReportsWorkspace } from "@/components/attendance/AttendanceReportsWorkspace";
import { getMonthlyAttendanceReport } from "@/lib/attendance-tracker/service";
import { requireModulePage } from "@/lib/page-guards";
import { endOfZonedDay, startOfZonedMonth, zonedDateKey, zonedDateStringToUtcStart } from "@/lib/timezone";

function resolveMonthKey(rawMonth: string | undefined, timeZone: string) {
  if (rawMonth && /^\d{4}-\d{2}$/.test(rawMonth)) {
    return rawMonth;
  }
  return zonedDateKey(startOfZonedMonth(new Date(), timeZone), timeZone).slice(0, 7);
}

export default async function AttendanceReportsPage({
  searchParams
}: {
  searchParams?: {
    month?: string;
  };
}) {
  const context = await requireModulePage("attendanceTracking");
  const timeZone = context.facility.timezone;

  const monthKey = resolveMonthKey(searchParams?.month, timeZone);
  const monthStart = zonedDateStringToUtcStart(`${monthKey}-01`, timeZone) ?? startOfZonedMonth(new Date(), timeZone);
  const nextMonth = new Date(monthStart);
  nextMonth.setUTCMonth(nextMonth.getUTCMonth() + 1);
  const monthEnd = endOfZonedDay(new Date(nextMonth.getTime() - 1), timeZone);

  const initialData = await getMonthlyAttendanceReport({
    facilityId: context.facilityId,
    timeZone,
    monthStart,
    monthEnd
  });

  return (
    <div className="space-y-4">
      <AttendanceReportsWorkspace initialMonth={monthKey} initialData={initialData} />
    </div>
  );
}
