import { DocumentationCommandCenter } from "@/components/documentation/command-center/DocumentationCommandCenter";
import { getDocumentationBaseContext, getDocumentationOverviewData } from "@/app/app/documentation/_lib";
import { canWrite } from "@/lib/permissions";
import type { DocumentationKind } from "@/lib/documentation/types";

function normalizeTab(value?: string): DocumentationKind {
  if (value === "ONE_TO_ONE") return "ONE_TO_ONE";
  if (value === "UDA") return "UDA";
  if (value === "MDS") return "MDS";
  return "PROGRESS";
}

export default async function DocumentationOverviewPage({
  searchParams
}: {
  searchParams?: {
    tab?: string;
  };
}) {
  const { context, residents } = await getDocumentationBaseContext();
  const data = await getDocumentationOverviewData(context.facilityId, context.timeZone);

  return (
    <DocumentationCommandCenter
      rows={data.rows}
      residents={residents}
      timeZone={context.timeZone}
      initialTab={normalizeTab(searchParams?.tab)}
      canEdit={canWrite(context.role)}
    />
  );
}
