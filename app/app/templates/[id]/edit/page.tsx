import { notFound } from "next/navigation";

import { TemplateEditorPage } from "@/components/templates/TemplateEditorPage";
import { requireModulePage } from "@/lib/page-guards";
import { canWrite } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";
import { toUnifiedActivityTemplate, toUnifiedNoteTemplate } from "@/lib/templates/serializers";

export default async function EditTemplatePage({
  params
}: {
  params: {
    id: string;
  };
}) {
  const context = await requireModulePage("templates");

  const [activityTemplate, noteTemplate] = await Promise.all([
    prisma.activityTemplate.findFirst({
      where: {
        id: params.id,
        facilityId: context.facilityId
      }
    }),
    prisma.progressNoteTemplate.findFirst({
      where: {
        id: params.id,
        facilityId: context.facilityId
      }
    })
  ]);

  if (!activityTemplate && !noteTemplate) {
    notFound();
  }

  const initialTemplate = activityTemplate
    ? toUnifiedActivityTemplate(activityTemplate, 0)
    : toUnifiedNoteTemplate(noteTemplate!);

  return (
    <TemplateEditorPage
      mode="edit"
      canEdit={canWrite(context.role)}
      initialTemplate={initialTemplate}
    />
  );
}

