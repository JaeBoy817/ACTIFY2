import { DocumentationEntryEditor } from "@/components/documentation/DocumentationEntryEditor";
import { DocumentationShell } from "@/components/documentation/DocumentationShell";
import { getDefaultDocumentationEditorData, getDocumentationBaseContext } from "@/app/app/documentation/_lib";

export default async function NewUdaPage({
  searchParams
}: {
  searchParams?: { residentId?: string };
}) {
  const { residents } = await getDocumentationBaseContext();

  return (
    <DocumentationShell
      title="New UDA"
      description="Build structured activity assessment documentation with section-level progress."
    >
      <DocumentationEntryEditor
        kind="UDA"
        residents={residents}
        initial={getDefaultDocumentationEditorData({
          kind: "UDA",
          residentId: searchParams?.residentId
        })}
      />
    </DocumentationShell>
  );
}
