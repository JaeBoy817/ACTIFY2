import { PrismaClient, ResidentStatus } from "@prisma/client";
import { readFile } from "node:fs/promises";
import { z } from "zod";

const prisma = new PrismaClient({
  datasources: {
    db: {
      url: process.env.DIRECT_URL || process.env.DATABASE_URL
    }
  }
});

const importRowSchema = z.object({
  firstName: z.string().min(1),
  lastName: z.string().min(1),
  room: z.string().min(1),
  birthDate: z.date()
});

type ImportRow = z.infer<typeof importRowSchema>;

type ImportOptions = {
  filePath: string;
  dryRun: boolean;
  parseOnly: boolean;
};

function readArgs(): ImportOptions {
  const args = process.argv.slice(2);
  const dryRun = args.includes("--dry-run");
  const parseOnly = args.includes("--parse-only");
  const filePath = args.find((arg) => !arg.startsWith("--")) ?? process.env.RESIDENT_ROSTER_PATH;

  if (!filePath) {
    throw new Error(
      "Missing roster file path. Usage: npm run residents:import:roster -- /absolute/path/to/roster.txt"
    );
  }

  return { filePath, dryRun, parseOnly };
}

function isAllCapsName(value: string) {
  const letters = value.replace(/[^a-zA-Z]/g, "");
  return letters.length > 0 && letters === letters.toUpperCase();
}

function titleCaseToken(token: string) {
  return token
    .toLowerCase()
    .replace(/[a-zA-Z]+/g, (part) => part.charAt(0).toUpperCase() + part.slice(1));
}

function normalizeNamePart(value: string) {
  const trimmed = value.trim().replace(/\s+/g, " ");
  return isAllCapsName(trimmed) ? titleCaseToken(trimmed) : trimmed;
}

function parseResidentName(value: string) {
  const [lastRaw, ...firstParts] = value.split(",");
  const lastName = normalizeNamePart(lastRaw ?? "");
  const firstName = normalizeNamePart(firstParts.join(","));

  if (!firstName || !lastName) {
    throw new Error(`Invalid resident name "${value}". Expected "Last, First".`);
  }

  return { firstName, lastName };
}

function parseBirthDate(value: string) {
  const match = value.trim().match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (!match) {
    throw new Error(`Invalid birthday "${value}". Expected M/D/YYYY.`);
  }

  const month = Number(match[1]);
  const day = Number(match[2]);
  const year = Number(match[3]);
  const date = new Date(Date.UTC(year, month - 1, day, 12, 0, 0));

  if (
    Number.isNaN(date.getTime()) ||
    date.getUTCFullYear() !== year ||
    date.getUTCMonth() !== month - 1 ||
    date.getUTCDate() !== day
  ) {
    throw new Error(`Invalid birthday "${value}".`);
  }

  return date;
}

function parseMarkdownTable(raw: string) {
  const rows: ImportRow[] = [];
  const lines = raw.split(/\r?\n/);

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed.startsWith("|")) continue;
    if (/^\|\s*-+/.test(trimmed)) continue;
    if (/^\|\s*name\s*\|/i.test(trimmed)) continue;

    const columns = trimmed
      .split("|")
      .slice(1, -1)
      .map((column) => column.trim());

    if (columns.length < 3) continue;

    const [name, room, birthday] = columns;
    const parsedName = parseResidentName(name);
    rows.push(
      importRowSchema.parse({
        ...parsedName,
        room,
        birthDate: parseBirthDate(birthday)
      })
    );
  }

  if (rows.length === 0) {
    throw new Error("No resident rows were found in the roster table.");
  }

  return rows;
}

function dateKey(value: Date | null | undefined) {
  return value ? value.toISOString().slice(0, 10) : null;
}

function normalizeForLookup(value: string) {
  return value.trim().toLowerCase().replace(/\s+/g, " ");
}

async function resolveFacility() {
  const facilityId = process.env.ACTIFY_IMPORT_FACILITY_ID?.trim();
  if (facilityId) {
    const facility = await prisma.facility.findUnique({
      where: { id: facilityId },
      select: { id: true, name: true }
    });
    if (!facility) throw new Error(`No facility found for ACTIFY_IMPORT_FACILITY_ID=${facilityId}`);
    return facility;
  }

  const facilityName = process.env.ACTIFY_IMPORT_FACILITY_NAME?.trim() || "Richland Hills Rehab";
  const namedFacility = await prisma.facility.findFirst({
    where: { name: { equals: facilityName, mode: "insensitive" } },
    select: { id: true, name: true }
  });
  if (namedFacility) return namedFacility;

  const userEmail = process.env.ACTIFY_IMPORT_USER_EMAIL?.trim();
  if (userEmail) {
    const user = await prisma.user.findFirst({
      where: { email: { equals: userEmail, mode: "insensitive" } },
      select: { facility: { select: { id: true, name: true } } }
    });
    if (user?.facility) return user.facility;
    throw new Error(`No user/facility found for ACTIFY_IMPORT_USER_EMAIL=${userEmail}`);
  }

  const facilities = await prisma.facility.findMany({
    select: { id: true, name: true },
    orderBy: { createdAt: "asc" }
  });

  if (facilities.length === 1) return facilities[0];
  if (facilities.length === 0) {
    throw new Error("No facilities found. Sign in to Actify first so a facility exists, then rerun the import.");
  }

  throw new Error(
    `Multiple facilities found (${facilities.map((facility) => facility.name).join(", ")}). Set ACTIFY_IMPORT_FACILITY_ID before importing.`
  );
}

async function findExistingResident(facilityId: string, row: ImportRow) {
  const sameNameResidents = await prisma.resident.findMany({
    where: {
      facilityId,
      firstName: { equals: row.firstName, mode: "insensitive" },
      lastName: { equals: row.lastName, mode: "insensitive" }
    },
    select: {
      id: true,
      firstName: true,
      lastName: true,
      room: true,
      birthDate: true,
      status: true,
      isActive: true
    },
    orderBy: { createdAt: "asc" }
  });

  const birthDateKey = dateKey(row.birthDate);
  return (
    sameNameResidents.find((resident) => dateKey(resident.birthDate) === birthDateKey) ??
    sameNameResidents.find((resident) => !resident.birthDate) ??
    null
  );
}

async function upsertResident(facilityId: string, row: ImportRow, dryRun: boolean) {
  const existing = await findExistingResident(facilityId, row);
  const data = {
    firstName: row.firstName,
    lastName: row.lastName,
    room: row.room,
    birthDate: row.birthDate,
    status: ResidentStatus.ACTIVE,
    isActive: true
  };

  if (!existing) {
    if (!dryRun) {
      await prisma.resident.create({
        data: {
          facilityId,
          ...data
        }
      });
    }
    return "created" as const;
  }

  const unchanged =
    normalizeForLookup(existing.firstName) === normalizeForLookup(data.firstName) &&
    normalizeForLookup(existing.lastName) === normalizeForLookup(data.lastName) &&
    existing.room === data.room &&
    dateKey(existing.birthDate) === dateKey(data.birthDate) &&
    existing.status === data.status &&
    existing.isActive === data.isActive;

  if (unchanged) return "unchanged" as const;

  if (!dryRun) {
    await prisma.resident.update({
      where: { id: existing.id },
      data
    });
  }
  return "updated" as const;
}

async function main() {
  const options = readArgs();
  const raw = await readFile(options.filePath, "utf8");
  const rows = parseMarkdownTable(raw);

  console.log(`Parsed ${rows.length} residents from ${options.filePath}.`);
  console.log(`First row preview: ${rows[0].firstName} ${rows[0].lastName}, room ${rows[0].room}.`);

  if (options.parseOnly) return;

  const facility = await resolveFacility();
  let created = 0;
  let updated = 0;
  let unchanged = 0;

  for (const row of rows) {
    const result = await upsertResident(facility.id, row, options.dryRun);
    if (result === "created") created += 1;
    if (result === "updated") updated += 1;
    if (result === "unchanged") unchanged += 1;
  }

  console.log(
    `${options.dryRun ? "Dry run for" : "Imported into"} "${facility.name}": ${created} created, ${updated} updated, ${unchanged} unchanged.`
  );
}

main()
  .catch((error) => {
    console.error("Resident roster import failed:", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

