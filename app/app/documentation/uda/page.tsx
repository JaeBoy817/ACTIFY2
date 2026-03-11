import Link from "next/link";
import { Plus } from "lucide-react";

import { ClinicalAssessmentQueue } from "@/components/documentation/clinical/ClinicalAssessmentQueue";
import { DocumentationShell } from "@/components/documentation/DocumentationShell";
import { getClinicalAssessmentQueueData, getDocumentationBaseContext } from "@/app/app/documentation/_lib";

export default async function UdaDocumentationPage() {
  const { context } = await getDocumentationBaseContext();
  const queue = await getClinicalAssessmentQueueData({
    facilityId: context.facilityId,
    kind: "UDA"
  });

  return (
    <DocumentationShell
      title="UDA Assessments"
      description="Activity annual and quarterly assessment workflow with due-date queueing, resident snapshots, and carry-forward review support."
      actions={
        <>
          <Link
            href="/app/documentation/uda/new?assessmentType=ANNUAL"
            className="inline-flex h-10 items-center gap-2 rounded-full border border-amber-300/45 bg-[linear-gradient(180deg,#6a4a1d_0%,#573b16_100%)] px-4 text-xs font-semibold text-amber-100"
          >
            <Plus className="h-3.5 w-3.5" />
            New Annual UDA
          </Link>
          <Link
            href="/app/documentation/uda/new?assessmentType=QUARTERLY"
            className="inline-flex h-10 items-center gap-2 rounded-full border border-amber-300/40 bg-[linear-gradient(180deg,#513615_0%,#3d280f_100%)] px-4 text-xs font-semibold text-amber-50"
          >
            <Plus className="h-3.5 w-3.5" />
            New Quarterly UDA
          </Link>
        </>
      }
    >
      <ClinicalAssessmentQueue
        kind="UDA"
        rows={queue.rows}
        unitOptions={queue.unitOptions}
        staffOptions={queue.staffOptions}
        newEntryHref="/app/documentation/uda/new"
        newAnnualHref="/app/documentation/uda/new"
        newQuarterlyHref="/app/documentation/uda/new"
      />
    </DocumentationShell>
  );
}
