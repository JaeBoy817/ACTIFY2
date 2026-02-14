import { readFile } from "node:fs/promises";
import path from "node:path";

import { PrismaClient } from "@prisma/client";
import { z } from "zod";

const prisma = new PrismaClient();

const templateSchema = z.object({
  title: z.string().min(1),
  category: z.string().min(1),
  difficulty: z.enum(["Easy", "Moderate", "Hard"]),
  supplies: z.array(z.string().min(1)).min(1),
  setupSteps: z.array(z.string().min(1)).min(1),
  checklistItems: z.array(z.string().min(1)).min(1),
  bedBoundAdaptation: z.string().min(1),
  dementiaAdaptation: z.string().min(1),
  lowVisionAdaptation: z.string().min(1),
  oneToOneMiniAdaptation: z.string().min(1)
});

const templatesSchema = z.array(templateSchema).min(1);

type TemplateInput = z.infer<typeof templateSchema>;

function toDbTemplate(template: TemplateInput) {
  return {
    title: template.title,
    category: template.category,
    difficulty: template.difficulty,
    supplies: template.supplies.join(", "),
    setupSteps: template.setupSteps.join("\n"),
    adaptations: {
      bedBound: template.bedBoundAdaptation,
      dementiaFriendly: template.dementiaAdaptation,
      lowVisionHearing: template.lowVisionAdaptation,
      oneToOneMini: template.oneToOneMiniAdaptation
    },
    defaultChecklist: template.checklistItems
  };
}

async function loadTemplates() {
  const filePath = path.join(process.cwd(), "prisma", "activity-templates-custom.json");
  const raw = await readFile(filePath, "utf8");
  const parsed = templatesSchema.parse(JSON.parse(raw));

  const seen = new Set<string>();
  for (const template of parsed) {
    const normalized = template.title.trim().toLowerCase();
    if (seen.has(normalized)) {
      throw new Error(`Duplicate title in JSON: ${template.title}`);
    }
    seen.add(normalized);
  }

  return parsed;
}

async function main() {
  const templates = await loadTemplates();
  const facilities = await prisma.facility.findMany({
    select: { id: true, name: true }
  });

  if (facilities.length === 0) {
    console.log("No facilities found. Create a facility first, then rerun.");
    return;
  }

  let totalCreated = 0;
  let totalUpdated = 0;

  for (const facility of facilities) {
    let created = 0;
    let updated = 0;

    for (const template of templates) {
      const mapped = toDbTemplate(template);

      const existing = await prisma.activityTemplate.findFirst({
        where: {
          facilityId: facility.id,
          title: mapped.title
        },
        select: { id: true }
      });

      if (existing) {
        await prisma.activityTemplate.update({
          where: { id: existing.id },
          data: {
            category: mapped.category,
            difficulty: mapped.difficulty,
            supplies: mapped.supplies,
            setupSteps: mapped.setupSteps,
            adaptations: mapped.adaptations,
            defaultChecklist: mapped.defaultChecklist
          }
        });
        updated += 1;
      } else {
        await prisma.activityTemplate.create({
          data: {
            facilityId: facility.id,
            title: mapped.title,
            category: mapped.category,
            difficulty: mapped.difficulty,
            supplies: mapped.supplies,
            setupSteps: mapped.setupSteps,
            adaptations: mapped.adaptations,
            defaultChecklist: mapped.defaultChecklist
          }
        });
        created += 1;
      }
    }

    totalCreated += created;
    totalUpdated += updated;
    console.log(`Facility "${facility.name}": created ${created}, updated ${updated}.`);
  }

  console.log(`Done. Total created: ${totalCreated}. Total updated: ${totalUpdated}.`);
}

main()
  .catch((error) => {
    console.error("Import failed:", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
