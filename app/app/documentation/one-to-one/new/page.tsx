import { DocumentationEntryEditor } from "@/components/documentation/DocumentationEntryEditor";
import { DocumentationShell } from "@/components/documentation/DocumentationShell";
import { getDefaultDocumentationEditorData, getDocumentationBaseContext } from "@/app/app/documentation/_lib";

export default async function NewOneToOneNotePage({
  searchParams
}: {
  searchParams?: { residentId?: string };
}) {
  const { residents } = await getDocumentationBaseContext();

  return (
    <DocumentationShell
      title="New 1:1 Note"
      description="Document individualized resident visits with completion tracking for monthly compliance."
    >
      <DocumentationEntryEditor
        kind="ONE_TO_ONE"
        residents={residents}
        initial={getDefaultDocumentationEditorData({
          kind: "ONE_TO_ONE",
          residentId: searchParams?.residentId
        })}
      />
    </DocumentationShell>
  );
}
