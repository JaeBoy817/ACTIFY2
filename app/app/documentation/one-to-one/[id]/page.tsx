import { notFound } from "next/navigation";

import { DocumentationEntryEditor } from "@/components/documentation/DocumentationEntryEditor";
import { DocumentationShell } from "@/components/documentation/DocumentationShell";
import { getDocumentationBaseContext, getDocumentationEntryForEditor } from "@/app/app/documentation/_lib";

export default async function OneToOneDetailPage({
  params
}: {
  params: { id: string };
}) {
  const { context, residents } = await getDocumentationBaseContext();
  const entry = await getDocumentationEntryForEditor({
    facilityId: context.facilityId,
    id: params.id,
    expectedKind: "ONE_TO_ONE",
    timeZone: context.timeZone
  });

  if (!entry) {
    notFound();
  }

  return (
    <DocumentationShell
      title="1:1 Note Detail"
      description="Update resident visit details, follow-up, and completion status."
    >
      <DocumentationEntryEditor kind="ONE_TO_ONE" timeZone={context.timeZone} residents={residents} initial={entry} />
    </DocumentationShell>
  );
}
