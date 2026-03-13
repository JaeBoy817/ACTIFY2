import Link from "next/link";
import { Plus } from "lucide-react";

import { ClinicalAssessmentQueue } from "@/components/documentation/clinical/ClinicalAssessmentQueue";
import { DocumentationShell } from "@/components/documentation/DocumentationShell";
import { getClinicalAssessmentQueueData, getDocumentationBaseContext } from "@/app/app/documentation/_lib";

export default async function MdsDocumentationPage() {
  const { context } = await getDocumentationBaseContext();
  const queue = await getClinicalAssessmentQueueData({
    facilityId: context.facilityId,
    kind: "MDS",
    timeZone: context.timeZone
  });

  return (
    <DocumentationShell
      title="MDS Section F"
      description="Activity preferences, routine, and participation support workflow for Section F-aligned documentation."
      actions={
        <Link
          href="/app/documentation/mds/new"
          className="inline-flex h-10 items-center gap-2 rounded-full border border-emerald-300/45 bg-[linear-gradient(180deg,#0f4a3b_0%,#113a31_100%)] px-4 text-xs font-semibold text-emerald-100"
        >
          <Plus className="h-3.5 w-3.5" />
          New MDS Entry
        </Link>
      }
    >
      <ClinicalAssessmentQueue
        kind="MDS"
        rows={queue.rows}
        unitOptions={queue.unitOptions}
        staffOptions={queue.staffOptions}
        newEntryHref="/app/documentation/mds/new"
      />
    </DocumentationShell>
  );
}
