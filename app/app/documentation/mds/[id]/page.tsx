import { notFound } from "next/navigation";

import { DocumentationEntryEditor } from "@/components/documentation/DocumentationEntryEditor";
import { DocumentationShell } from "@/components/documentation/DocumentationShell";
import { getDocumentationBaseContext, getDocumentationEntryForEditor } from "@/app/app/documentation/_lib";

export default async function MdsDetailPage({
  params
}: {
  params: { id: string };
}) {
  const { context, residents } = await getDocumentationBaseContext();
  const entry = await getDocumentationEntryForEditor({
    facilityId: context.facilityId,
    id: params.id,
    expectedKind: "MDS"
  });

  if (!entry) {
    notFound();
  }

  return (
    <DocumentationShell
      title="MDS Entry Detail"
      description="Review and finalize activity-focused MDS support documentation."
    >
      <DocumentationEntryEditor kind="MDS" residents={residents} initial={entry} />
    </DocumentationShell>
  );
}
