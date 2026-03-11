import { DocumentationEntryEditor } from "@/components/documentation/DocumentationEntryEditor";
import { DocumentationShell } from "@/components/documentation/DocumentationShell";
import { getDefaultDocumentationEditorData, getDocumentationBaseContext } from "@/app/app/documentation/_lib";

export default async function NewMdsPage({
  searchParams
}: {
  searchParams?: { residentId?: string };
}) {
  const { residents } = await getDocumentationBaseContext();

  return (
    <DocumentationShell
      title="New MDS Entry"
      description="Capture MDS support details with preference, social, and observed-response sections."
    >
      <DocumentationEntryEditor
        kind="MDS"
        residents={residents}
        initial={getDefaultDocumentationEditorData({
          kind: "MDS",
          residentId: searchParams?.residentId
        })}
      />
    </DocumentationShell>
  );
}
