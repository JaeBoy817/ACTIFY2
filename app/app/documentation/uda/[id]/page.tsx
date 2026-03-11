import { notFound } from "next/navigation";

import { UdaAssessmentEditor } from "@/components/documentation/clinical/UdaAssessmentEditor";
import { DocumentationShell } from "@/components/documentation/DocumentationShell";
import {
  getClinicalAssessmentEntryForEditor,
  getClinicalAssessmentHistoryForResident,
  getDocumentationBaseContext
} from "@/app/app/documentation/_lib";

export default async function UdaDetailPage({
  params
}: {
  params: { id: string };
}) {
  const { context, residents } = await getDocumentationBaseContext();
  const entry = await getClinicalAssessmentEntryForEditor({
    facilityId: context.facilityId,
    id: params.id,
    kind: "UDA"
  });

  if (!entry) {
    notFound();
  }

  const history = await getClinicalAssessmentHistoryForResident({
    facilityId: context.facilityId,
    residentId: entry.residentId,
    kind: "UDA"
  });

  return (
    <DocumentationShell
      title="UDA Assessment Detail"
      description="Review, update, and finalize annual or quarterly activity assessments with resident history context."
    >
      <UdaAssessmentEditor residents={residents} history={history} initial={entry} />
    </DocumentationShell>
  );
}
