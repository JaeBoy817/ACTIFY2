import { revalidateTag, unstable_cache } from "next/cache";
import { Prisma } from "@prisma/client";

import { prisma } from "@/lib/prisma";
import { toUnifiedActivityTemplate, toUnifiedNoteTemplate } from "@/lib/templates/serializers";
import type { UnifiedTemplate } from "@/lib/templates/types";

const activityTemplateListQuery = Prisma.validator<Prisma.ActivityTemplateDefaultArgs>()({
  select: {
    id: true,
    facilityId: true,
    title: true,
    category: true,
    supplies: true,
    setupSteps: true,
    difficulty: true,
    defaultChecklist: true,
    adaptations: true,
    createdAt: true
  }
});

const noteTemplateListQuery = Prisma.validator<Prisma.ProgressNoteTemplateDefaultArgs>()({
  select: {
    id: true,
    facilityId: true,
    title: true,
    quickPhrases: true,
    bodyTemplate: true,
    createdAt: true
  }
});

function getTemplatesLibraryCacheTag(facilityId: string) {
  return `templates:library:${facilityId}`;
}

async function computeTemplatesLibrarySnapshot(facilityId: string): Promise<UnifiedTemplate[]> {
  const [activityTemplates, noteTemplates, usageRows] = await Promise.all([
    prisma.activityTemplate.findMany({
      where: { facilityId },
      ...activityTemplateListQuery,
      orderBy: { createdAt: "desc" }
    }),
    prisma.progressNoteTemplate.findMany({
      where: { facilityId },
      ...noteTemplateListQuery,
      orderBy: { createdAt: "desc" }
    }),
    prisma.activityInstance.groupBy({
      by: ["templateId"],
      where: {
        facilityId,
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

  return [
    ...activityTemplates.map((template) =>
      toUnifiedActivityTemplate(template, usageByTemplateId.get(template.id) ?? 0)
    ),
    ...noteTemplates.map((template) => toUnifiedNoteTemplate(template))
  ];
}

function getCachedTemplatesLibrarySnapshotByFacility(facilityId: string) {
  return unstable_cache(
    async () => computeTemplatesLibrarySnapshot(facilityId),
    ["templates-library-v1", facilityId],
    {
      revalidate: 60,
      tags: [getTemplatesLibraryCacheTag(facilityId)]
    }
  );
}

export async function getTemplatesLibrarySnapshot(params: {
  facilityId: string;
  fresh?: boolean;
}): Promise<UnifiedTemplate[]> {
  if (params.fresh) {
    return computeTemplatesLibrarySnapshot(params.facilityId);
  }
  return getCachedTemplatesLibrarySnapshotByFacility(params.facilityId)();
}

export function revalidateTemplatesLibrary(facilityId: string) {
  revalidateTag(getTemplatesLibraryCacheTag(facilityId));
}
