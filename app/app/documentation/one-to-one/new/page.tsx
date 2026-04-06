import { DocumentationEntryEditor } from "@/components/documentation/DocumentationEntryEditor";
import { DocumentationShell } from "@/components/documentation/DocumentationShell";
import { getDefaultDocumentationEditorData, getDocumentationBaseContext } from "@/app/app/documentation/_lib";

export default async function NewOneToOneNotePage({
  searchParams
}: {
  searchParams?: { residentId?: string; prefill?: string; title?: string; followUp?: string };
}) {
  const { context, residents } = await getDocumentationBaseContext();

  return (
    <DocumentationShell
      title="New 1:1 Note"
      description="Document individualized resident visits with completion tracking for monthly compliance."
    >
      <DocumentationEntryEditor
        kind="ONE_TO_ONE"
        timeZone={context.timeZone}
        residents={residents}
        initial={getDefaultDocumentationEditorData({
          kind: "ONE_TO_ONE",
          residentId: searchParams?.residentId,
          title: searchParams?.title,
          narrative: searchParams?.prefill,
          followUp: searchParams?.followUp,
          timeZone: context.timeZone
        })}
      />
    </DocumentationShell>
  );
}
