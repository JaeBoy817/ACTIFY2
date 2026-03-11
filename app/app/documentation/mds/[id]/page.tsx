import { notFound } from "next/navigation";

import { MdsSectionFEditor } from "@/components/documentation/clinical/MdsSectionFEditor";
import { DocumentationShell } from "@/components/documentation/DocumentationShell";
import {
  getClinicalAssessmentEntryForEditor,
  getClinicalAssessmentHistoryForResident,
  getDocumentationBaseContext
} from "@/app/app/documentation/_lib";

export default async function MdsDetailPage({
  params
}: {
  params: { id: string };
}) {
  const { context, residents } = await getDocumentationBaseContext();
  const entry = await getClinicalAssessmentEntryForEditor({
    facilityId: context.facilityId,
    id: params.id,
    kind: "MDS"
  });

  if (!entry) {
    notFound();
  }

  const history = await getClinicalAssessmentHistoryForResident({
    facilityId: context.facilityId,
    residentId: entry.residentId,
    kind: "MDS"
  });

  return (
    <DocumentationShell
      title="MDS Section F Detail"
      description="Review, update, and finalize Section F activity preference support entries with resident history context."
    >
      <MdsSectionFEditor residents={residents} history={history} initial={entry} />
    </DocumentationShell>
  );
}
