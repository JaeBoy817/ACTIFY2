import { UdaAssessmentEditor } from "@/components/documentation/clinical/UdaAssessmentEditor";
import { DocumentationShell } from "@/components/documentation/DocumentationShell";
import {
  getClinicalAssessmentHistoryForResident,
  getDefaultClinicalAssessmentEditorData,
  getDocumentationBaseContext
} from "@/app/app/documentation/_lib";

export default async function NewUdaPage({
  searchParams
}: {
  searchParams?: {
    residentId?: string;
    assessmentType?: "ANNUAL" | "QUARTERLY";
  };
}) {
  const { context, residents } = await getDocumentationBaseContext();
  const residentId = searchParams?.residentId;
  const history = residentId
    ? await getClinicalAssessmentHistoryForResident({
        facilityId: context.facilityId,
        residentId,
        kind: "UDA"
      })
    : [];

  return (
    <DocumentationShell
      title="New UDA Assessment"
      description="Clinical UDA workflow for annual and quarterly assessment documentation with carry-forward history."
    >
      <UdaAssessmentEditor
        residents={residents}
        history={history}
        initial={getDefaultClinicalAssessmentEditorData({
          kind: "UDA",
          residentId,
          assessmentType: searchParams?.assessmentType
        })}
      />
    </DocumentationShell>
  );
}
