import { DocumentationEntryEditor } from "@/components/documentation/DocumentationEntryEditor";
import { DocumentationShell } from "@/components/documentation/DocumentationShell";
import { getDefaultDocumentationEditorData, getDocumentationBaseContext } from "@/app/app/documentation/_lib";

export default async function NewProgressNotePage({
  searchParams
}: {
  searchParams?: { residentId?: string };
}) {
  const { context, residents } = await getDocumentationBaseContext();

  return (
    <DocumentationShell
      title="New Progress Note"
      description="Chart resident progress for activities with structured participation, mood, cues, and response fields."
    >
      <DocumentationEntryEditor
        kind="PROGRESS"
        timeZone={context.timeZone}
        residents={residents}
        initial={getDefaultDocumentationEditorData({
          kind: "PROGRESS",
          residentId: searchParams?.residentId,
          timeZone: context.timeZone
        })}
      />
    </DocumentationShell>
  );
}
