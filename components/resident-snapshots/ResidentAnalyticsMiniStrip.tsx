import type { ResidentSnapshot } from "@/components/resident-snapshots/types";
import { analyticsSummaryLabel } from "@/components/resident-snapshots/analytics";

export function ResidentAnalyticsMiniStrip({ resident }: { resident: ResidentSnapshot }) {
  return (
    <div className="mt-3 rounded-xl border border-slate-200 bg-slate-50/70 px-3 py-2.5">
      <p className="text-xs font-medium text-slate-600">{analyticsSummaryLabel(resident)}</p>
    </div>
  );
}
