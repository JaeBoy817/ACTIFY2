import { notFound } from "next/navigation";

import { DocumentationEntryEditor } from "@/components/documentation/DocumentationEntryEditor";
import { DocumentationShell } from "@/components/documentation/DocumentationShell";
import { getDocumentationBaseContext, getDocumentationEntryForEditor } from "@/app/app/documentation/_lib";

export default async function ProgressNoteDetailPage({
  params
}: {
  params: { id: string };
}) {
  const { context, residents } = await getDocumentationBaseContext();
  const entry = await getDocumentationEntryForEditor({
    facilityId: context.facilityId,
    id: params.id,
    expectedKind: "PROGRESS",
    timeZone: context.timeZone
  });

  if (!entry) {
    notFound();
  }

  return (
    <DocumentationShell
      title="Progress Note Detail"
      description="Update narrative, due state, and structured participation details."
    >
      <DocumentationEntryEditor kind="PROGRESS" timeZone={context.timeZone} residents={residents} initial={entry} />
    </DocumentationShell>
  );
}
