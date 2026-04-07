import { ReportsWorkspace } from "@/components/reports/ReportsWorkspace";
import { getReportsWorkspaceData } from "@/app/app/reports/_lib";
import { requireModulePage } from "@/lib/page-guards";
import { canExportMonthlyReport } from "@/lib/permissions";
import { parseMonthParam } from "@/lib/reports";
import type { ReportTypeId } from "@/lib/reports/workspace-types";

type SearchParams = Record<string, string | string[] | undefined>;

const REPORT_TYPES: ReportTypeId[] = [
  "participation-summary",
  "resident-engagement",
  "monthly-activity-recap",
  "due-documentation",
  "follow-up"
];

function readSearchValue(source: SearchParams | undefined, key: string) {
  const value = source?.[key];
  if (Array.isArray(value)) return value[0] ?? null;
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function parseReportType(value: string | null): ReportTypeId {
  if (!value) return "monthly-activity-recap";
  return REPORT_TYPES.includes(value as ReportTypeId) ? (value as ReportTypeId) : "monthly-activity-recap";
}

export default async function ReportsPage({
  searchParams
}: {
  searchParams?: SearchParams;
}) {
  const context = await requireModulePage("reports");
  const monthToken = readSearchValue(searchParams, "month") ?? undefined;
  const reportType = parseReportType(readSearchValue(searchParams, "reportType"));
  const parsedMonth = parseMonthParam(monthToken);

  const data = await getReportsWorkspaceData({
    facilityId: context.facilityId,
    facilityName: context.facility.name,
    timeZone: context.timeZone,
    monthDate: parsedMonth,
    roleCanExport: canExportMonthlyReport(context.role)
  });

  return <ReportsWorkspace data={data} initialReportType={reportType} />;
}
