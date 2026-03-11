import { Download } from "lucide-react";

import { AttendanceQuickActionButton } from "@/components/attendance/v3/AttendanceQuickActionButton";

export function AttendanceExportButton({
  loading,
  onExport
}: {
  loading?: boolean;
  onExport: () => void;
}) {
  return (
    <AttendanceQuickActionButton
      label={loading ? "Exporting..." : "Export Attendance"}
      icon={Download}
      onClick={onExport}
      tone="violet"
      disabled={loading}
    />
  );
}

