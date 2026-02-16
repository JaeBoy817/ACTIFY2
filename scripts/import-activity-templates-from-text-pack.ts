import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";

import { PrismaClient } from "@prisma/client";

type Difficulty = "Easy" | "Moderate" | "Hard";

type TemplateRecord = {
  title: string;
  category: string;
  difficulty: Difficulty;
  supplies: string[];
  setupSteps: string[];
  checklistItems: string[];
  bedBoundAdaptation: string;
  dementiaAdaptation: string;
  lowVisionAdaptation: string;
  oneToOneMiniAdaptation: string;
};

const prisma = new PrismaClient();

const TEXT_INPUT_PATH = path.join(process.cwd(), "prisma", "activity-templates-user-pack.txt");
const CUSTOM_JSON_PATH = path.join(process.cwd(), "prisma", "activity-templates-custom.json");

function normalizeTitle(title: string): string {
  return title.trim().toLowerCase();
}

function splitCommaList(input: string): string[] {
  const output: string[] = [];
  let current = "";
  let depth = 0;

  for (const char of input) {
    if (char === "," && depth === 0) {
      const cleaned = current.trim();
      if (cleaned) output.push(cleaned);
      current = "";
      continue;
    }
    if (char === "(") depth += 1;
    if (char === ")" && depth > 0) depth -= 1;
    current += char;
  }

  const cleaned = current.trim();
  if (cleaned) output.push(cleaned);

  return output;
}

function normalizeDifficulty(input: string): Difficulty {
  const value = input.trim().toLowerCase();
  if (value.includes("hard")) return "Hard";
  if (value.includes("moderate")) return "Moderate";
  return "Easy";
}

function stripChecklistPrefix(input: string): string {
  return input
    .replace(/^☐\s*/, "")
    .replace(/^\[\s*\]\s*/, "")
    .replace(/^[-•]\s*/, "")
    .trim();
}

function stripStepPrefix(input: string): string {
  return input
    .replace(/^\d+\)\s*/, "")
    .replace(/^[-•]\s*/, "")
    .trim();
}

function parseTemplateText(raw: string): TemplateRecord[] {
  type MutableTemplate = Omit<TemplateRecord, "difficulty"> & {
    difficulty?: Difficulty;
  };

  const lines = raw.split(/\r?\n/);
  const templates: TemplateRecord[] = [];
  let current: MutableTemplate | null = null;
  let section: "setupSteps" | "checklistItems" | null = null;

  const pushCurrent = () => {
    if (!current) return;

    const requiredFields: Array<keyof TemplateRecord> = [
      "title",
      "category",
      "difficulty",
      "supplies",
      "setupSteps",
      "checklistItems",
      "bedBoundAdaptation",
      "dementiaAdaptation",
      "lowVisionAdaptation",
      "oneToOneMiniAdaptation"
    ];

    for (const field of requiredFields) {
      const value = current[field as keyof MutableTemplate];
      if (typeof value === "string" && value.trim().length === 0) {
        throw new Error(`Template "${current.title || "unknown"}" missing ${field}`);
      }
      if (Array.isArray(value) && value.length === 0) {
        throw new Error(`Template "${current.title || "unknown"}" missing ${field}`);
      }
      if (typeof value === "undefined") {
        throw new Error(`Template "${current.title || "unknown"}" missing ${field}`);
      }
    }

    templates.push({
      title: current.title.trim(),
      category: current.category.trim(),
      difficulty: current.difficulty as Difficulty,
      supplies: current.supplies.map((item) => item.trim()).filter(Boolean),
      setupSteps: current.setupSteps.map((item) => item.trim()).filter(Boolean),
      checklistItems: current.checklistItems.map((item) => item.trim()).filter(Boolean),
      bedBoundAdaptation: current.bedBoundAdaptation.trim(),
      dementiaAdaptation: current.dementiaAdaptation.trim(),
      lowVisionAdaptation: current.lowVisionAdaptation.trim(),
      oneToOneMiniAdaptation: current.oneToOneMiniAdaptation.trim()
    });
  };

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) continue;

    if (trimmed.startsWith("TITLE:")) {
      pushCurrent();
      current = {
        title: trimmed.replace(/^TITLE:\s*/, ""),
        category: "",
        supplies: [],
        setupSteps: [],
        checklistItems: [],
        bedBoundAdaptation: "",
        dementiaAdaptation: "",
        lowVisionAdaptation: "",
        oneToOneMiniAdaptation: ""
      };
      section = null;
      continue;
    }

    if (!current) continue;

    if (trimmed.startsWith("CATEGORY:")) {
      current.category = trimmed.replace(/^CATEGORY:\s*/, "");
      section = null;
      continue;
    }

    if (trimmed.startsWith("DIFFICULTY:")) {
      current.difficulty = normalizeDifficulty(trimmed.replace(/^DIFFICULTY:\s*/, ""));
      section = null;
      continue;
    }

    if (trimmed.startsWith("SUPPLIES:")) {
      const suppliesText = trimmed.replace(/^SUPPLIES:\s*/, "");
      current.supplies = splitCommaList(suppliesText);
      section = null;
      continue;
    }

    if (/^SET UP STEPS:/i.test(trimmed)) {
      section = "setupSteps";
      continue;
    }

    if (/^CHECKLIST:/i.test(trimmed)) {
      section = "checklistItems";
      continue;
    }

    if (trimmed.startsWith("BED-BOUND ADAPTATION:")) {
      current.bedBoundAdaptation = trimmed.replace(/^BED-BOUND ADAPTATION:\s*/, "");
      section = null;
      continue;
    }

    if (trimmed.startsWith("DEMENTIA ADAPTATION:")) {
      current.dementiaAdaptation = trimmed.replace(/^DEMENTIA ADAPTATION:\s*/, "");
      section = null;
      continue;
    }

    if (trimmed.startsWith("LOW-VISION ADAPTATION:")) {
      current.lowVisionAdaptation = trimmed.replace(/^LOW-VISION ADAPTATION:\s*/, "");
      section = null;
      continue;
    }

    if (trimmed.startsWith("1:1 MINI ADAPTATION:")) {
      current.oneToOneMiniAdaptation = trimmed.replace(/^1:1 MINI ADAPTATION:\s*/, "");
      section = null;
      continue;
    }

    if (trimmed.startsWith("---") || /^=+$/.test(trimmed) || trimmed.startsWith("MORE ACTIVITIES")) {
      section = null;
      continue;
    }

    if (section === "setupSteps") {
      const step = stripStepPrefix(trimmed);
      if (step) current.setupSteps.push(step);
      continue;
    }

    if (section === "checklistItems") {
      const item = stripChecklistPrefix(trimmed);
      if (item) current.checklistItems.push(item);
      continue;
    }
  }

  pushCurrent();

  const deduped = new Map<string, TemplateRecord>();
  for (const template of templates) {
    deduped.set(normalizeTitle(template.title), template);
  }

  return [...deduped.values()];
}

async function mergeIntoCustomJson(incoming: TemplateRecord[]) {
  const existingRaw = await readFile(CUSTOM_JSON_PATH, "utf8");
  const existing = JSON.parse(existingRaw) as TemplateRecord[];
  const byTitle = new Map<string, number>();

  for (const [index, template] of existing.entries()) {
    byTitle.set(normalizeTitle(template.title), index);
  }

  let addedToJson = 0;
  let updatedInJson = 0;

  for (const template of incoming) {
    const key = normalizeTitle(template.title);
    const existingIndex = byTitle.get(key);
    if (typeof existingIndex === "number") {
      existing[existingIndex] = template;
      updatedInJson += 1;
    } else {
      existing.push(template);
      byTitle.set(key, existing.length - 1);
      addedToJson += 1;
    }
  }

  existing.sort((a, b) => a.title.localeCompare(b.title));
  await writeFile(CUSTOM_JSON_PATH, `${JSON.stringify(existing, null, 2)}\n`, "utf8");

  return { addedToJson, updatedInJson, totalJsonTemplates: existing.length };
}

async function importIntoDb(templates: TemplateRecord[]) {
  const facilities = await prisma.facility.findMany({
    select: { id: true, name: true }
  });

  if (facilities.length === 0) {
    console.log("No facilities found. JSON was updated, but DB import was skipped.");
    return { totalCreated: 0, totalUpdated: 0 };
  }

  let totalCreated = 0;
  let totalUpdated = 0;

  for (const facility of facilities) {
    let created = 0;
    let updated = 0;

    for (const template of templates) {
      const existing = await prisma.activityTemplate.findFirst({
        where: {
          facilityId: facility.id,
          title: template.title
        },
        select: { id: true }
      });

      const data = {
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

      if (existing) {
        await prisma.activityTemplate.update({
          where: { id: existing.id },
          data
        });
        updated += 1;
      } else {
        await prisma.activityTemplate.create({
          data: {
            facilityId: facility.id,
            title: template.title,
            ...data
          }
        });
        created += 1;
      }
    }

    totalCreated += created;
    totalUpdated += updated;
    console.log(`Facility "${facility.name}": created ${created}, updated ${updated}.`);
  }

  return { totalCreated, totalUpdated };
}

async function main() {
  const raw = await readFile(TEXT_INPUT_PATH, "utf8");
  const parsed = parseTemplateText(raw);
  const jsonSummary = await mergeIntoCustomJson(parsed);
  const dbSummary = await importIntoDb(parsed);

  console.log(
    `Parsed ${parsed.length} template(s). JSON added ${jsonSummary.addedToJson}, updated ${jsonSummary.updatedInJson}, total ${jsonSummary.totalJsonTemplates}. DB created ${dbSummary.totalCreated}, updated ${dbSummary.totalUpdated}.`
  );
}

main()
  .catch((error) => {
    console.error("Import failed:", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
