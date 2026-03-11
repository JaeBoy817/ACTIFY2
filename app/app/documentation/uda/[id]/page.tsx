import { notFound } from "next/navigation";

import { DocumentationEntryEditor } from "@/components/documentation/DocumentationEntryEditor";
import { DocumentationShell } from "@/components/documentation/DocumentationShell";
import { getDocumentationBaseContext, getDocumentationEntryForEditor } from "@/app/app/documentation/_lib";

export default async function UdaDetailPage({
  params
}: {
  params: { id: string };
}) {
  const { context, residents } = await getDocumentationBaseContext();
  const entry = await getDocumentationEntryForEditor({
    facilityId: context.facilityId,
    id: params.id,
    expectedKind: "UDA"
  });

  if (!entry) {
    notFound();
  }

  return (
    <DocumentationShell
      title="UDA Detail"
      description="Update structured assessment sections and finalize the resident UDA entry."
    >
      <DocumentationEntryEditor kind="UDA" residents={residents} initial={entry} />
    </DocumentationShell>
  );
}
