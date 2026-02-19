import { requireModulePage } from "@/lib/page-guards";
import { canWrite } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";
import { toUnifiedActivityTemplate, toUnifiedNoteTemplate } from "@/lib/templates/serializers";
import { TemplatesPageShell } from "@/components/templates/TemplatesPageShell";

export default async function TemplatesPage({
  searchParams
}: {
  searchParams?: {
    templateId?: string;
  };
}) {
  const context = await requireModulePage("templates");

  const [activityTemplates, noteTemplates, usageRows] = await Promise.all([
    prisma.activityTemplate.findMany({
      where: { facilityId: context.facilityId },
      orderBy: { createdAt: "desc" }
    }),
    prisma.progressNoteTemplate.findMany({
      where: { facilityId: context.facilityId },
      orderBy: { createdAt: "desc" }
    }),
    prisma.activityInstance.groupBy({
      by: ["templateId"],
      where: {
        facilityId: context.facilityId,
        templateId: { not: null }
      },
      _count: { _all: true }
    })
  ]);

  const usageByTemplateId = new Map<string, number>();
  for (const row of usageRows) {
    if (row.templateId) {
      usageByTemplateId.set(row.templateId, row._count._all);
    }
  }

  const templates = [
    ...activityTemplates.map((template) =>
      toUnifiedActivityTemplate(template, usageByTemplateId.get(template.id) ?? 0)
    ),
    ...noteTemplates.map((template) => toUnifiedNoteTemplate(template))
  ];

  const requestedTemplateId = searchParams?.templateId?.trim() || null;
  const initialSelectedId = requestedTemplateId && templates.some((template) => template.id === requestedTemplateId)
    ? requestedTemplateId
    : null;

  return (
    <TemplatesPageShell
      initialTemplates={templates}
      canEdit={canWrite(context.role)}
      initialSelectedId={initialSelectedId}
    />
  );
}

