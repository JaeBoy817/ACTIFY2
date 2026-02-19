import { NotesShell } from "@/components/notes/NotesShell";
import { NotesTemplatesWorkspace } from "@/components/notes/NotesTemplatesWorkspace";
import { mapTemplateForBuilder } from "@/lib/notes/serializers";
import { requireModulePage } from "@/lib/page-guards";
import { canWrite } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";

export default async function NotesTemplatesPage() {
  const context = await requireModulePage("notes");
  const templates = await prisma.progressNoteTemplate.findMany({
    where: {
      facilityId: context.facilityId
    },
    orderBy: {
      createdAt: "desc"
    },
    select: {
      id: true,
      title: true,
      quickPhrases: true,
      bodyTemplate: true
    }
  });

  return (
    <NotesShell
      title="Note Templates"
      description="Keep note templates simple: starter narrative, quick interventions, and tags for fast application."
    >
      <NotesTemplatesWorkspace
        initialTemplates={templates.map(mapTemplateForBuilder)}
        canEdit={canWrite(context.role)}
      />
    </NotesShell>
  );
}
