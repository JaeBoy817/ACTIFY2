import { MdsSectionFEditor } from "@/components/documentation/clinical/MdsSectionFEditor";
import { DocumentationShell } from "@/components/documentation/DocumentationShell";
import {
  getClinicalAssessmentHistoryForResident,
  getDefaultClinicalAssessmentEditorData,
  getDocumentationBaseContext
} from "@/app/app/documentation/_lib";

export default async function NewMdsPage({
  searchParams
}: {
  searchParams?: { residentId?: string };
}) {
  const { context, residents } = await getDocumentationBaseContext();
  const residentId = searchParams?.residentId;
  const history = residentId
    ? await getClinicalAssessmentHistoryForResident({
        facilityId: context.facilityId,
        residentId,
        kind: "MDS"
      })
    : [];

  return (
    <DocumentationShell
      title="New MDS Section F Entry"
      description="Structured MDS Section F support entry focused on preferences, routine, barriers, and observed response."
    >
      <MdsSectionFEditor
        timeZone={context.timeZone}
        residents={residents}
        history={history}
        initial={getDefaultClinicalAssessmentEditorData({
          kind: "MDS",
          residentId,
          timeZone: context.timeZone
        })}
      />
    </DocumentationShell>
  );
}
