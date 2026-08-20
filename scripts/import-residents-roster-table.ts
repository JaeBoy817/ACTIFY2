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

const ARCHIVED_STATUSES = [ResidentStatus.DISCHARGED, ResidentStatus.TRANSFERRED, ResidentStatus.DECEASED];
const WRITE_BATCH_SIZE = 25;

const importRowSchema = z.object({
  firstName: z.string().min(1),
  lastName: z.string().min(1),
  room: z.string().min(1),
  birthDate: z.date()
});

type ImportRow = z.infer<typeof importRowSchema>;

type ExistingResident = {
  id: string;
  firstName: string;
  lastName: string;
  room: string;
  birthDate: Date | null;
  status: ResidentStatus;
  isActive: boolean;
};

type ImportOptions = {
  filePath: string;
  dryRun: boolean;
  parseOnly: boolean;
  replaceActiveRoster: boolean;
};

function readArgs(): ImportOptions {
  const args = process.argv.slice(2);
  const dryRun = args.includes("--dry-run");
  const parseOnly = args.includes("--parse-only");
  const replaceActiveRoster = args.includes("--replace-active-roster");
  const filePath = args.find((arg) => !arg.startsWith("--")) ?? process.env.RESIDENT_ROSTER_PATH;

  if (!filePath) {
    throw new Error(
      "Missing roster file path. Usage: npm run residents:import:roster -- /absolute/path/to/roster.txt"
    );
  }

  return { filePath, dryRun, parseOnly, replaceActiveRoster };
}

function isAllCapsName(value: string) {
  const letters = value.replace(/[^a-zA-Z]/g, "");
  return letters.length > 0 && letters === letters.toUpperCase();
}

function titleCaseToken(token: string) {
  return token.toLowerCase().replace(/[a-zA-Z]+/g, (part) => part.charAt(0).toUpperCase() + part.slice(1));
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

function residentLookupKey(firstName: string, lastName: string) {
  return `${normalizeForLookup(lastName)}|${normalizeForLookup(firstName)}`;
}

function chunk<T>(items: T[], size: number) {
  const chunks: T[][] = [];
  for (let index = 0; index < items.length; index += size) {
    chunks.push(items.slice(index, index + size));
  }
  return chunks;
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

async function loadExistingResidents(facilityId: string) {
  return prisma.resident.findMany({
    where: { facilityId },
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
}

function findExistingResident(existingResidents: ExistingResident[], row: ImportRow, claimedIds: Set<string>) {
  const sameNameResidents = existingResidents.filter(
    (resident) => residentLookupKey(resident.firstName, resident.lastName) === residentLookupKey(row.firstName, row.lastName)
  );
  const birthDateKey = dateKey(row.birthDate);

  return (
    sameNameResidents.find((resident) => !claimedIds.has(resident.id) && dateKey(resident.birthDate) === birthDateKey) ??
    sameNameResidents.find((resident) => !claimedIds.has(resident.id) && !resident.birthDate) ??
    null
  );
}

function residentMatchesRosterRow(resident: ExistingResident, row: ImportRow) {
  const sameName = residentLookupKey(resident.firstName, resident.lastName) === residentLookupKey(row.firstName, row.lastName);
  if (!sameName) return false;

  // Keep existing records with the same resident name even if a previous
  // import did not have DOB yet; the upsert below will fill birthday/room.
  return !resident.birthDate || dateKey(resident.birthDate) === dateKey(row.birthDate);
}

function isCurrentlyActiveResident(resident: ExistingResident) {
  return resident.isActive && !ARCHIVED_STATUSES.includes(resident.status);
}

function getResidentsToArchive(existingResidents: ExistingResident[], rows: ImportRow[]) {
  return existingResidents.filter(
    (resident) => isCurrentlyActiveResident(resident) && !rows.some((row) => residentMatchesRosterRow(resident, row))
  );
}

function getResidentWritePlan(existingResidents: ExistingResident[], rows: ImportRow[]) {
  const claimedIds = new Set<string>();
  const creates: Array<ImportRow> = [];
  const updates: Array<{ id: string; row: ImportRow }> = [];
  let unchanged = 0;

  for (const row of rows) {
    const existing = findExistingResident(existingResidents, row, claimedIds);
    if (!existing) {
      creates.push(row);
      continue;
    }

    claimedIds.add(existing.id);
    const unchangedResident =
      normalizeForLookup(existing.firstName) === normalizeForLookup(row.firstName) &&
      normalizeForLookup(existing.lastName) === normalizeForLookup(row.lastName) &&
      existing.room === row.room &&
      dateKey(existing.birthDate) === dateKey(row.birthDate) &&
      existing.status === ResidentStatus.ACTIVE &&
      existing.isActive;

    if (unchangedResident) {
      unchanged += 1;
    } else {
      updates.push({ id: existing.id, row });
    }
  }

  return { creates, updates, unchanged };
}

function createData(facilityId: string, row: ImportRow) {
  return {
    facilityId,
    firstName: row.firstName,
    lastName: row.lastName,
    room: row.room,
    birthDate: row.birthDate,
    status: ResidentStatus.ACTIVE,
    isActive: true
  };
}

function updateData(row: ImportRow) {
  return {
    firstName: row.firstName,
    lastName: row.lastName,
    room: row.room,
    birthDate: row.birthDate,
    status: ResidentStatus.ACTIVE,
    isActive: true
  };
}

async function writePlan(params: {
  facilityId: string;
  creates: ImportRow[];
  updates: Array<{ id: string; row: ImportRow }>;
  residentsToArchive: ExistingResident[];
}) {
  const { facilityId, creates, updates, residentsToArchive } = params;

  if (residentsToArchive.length > 0) {
    await prisma.resident.updateMany({
      where: {
        facilityId,
        id: { in: residentsToArchive.map((resident) => resident.id) }
      },
      data: {
        status: ResidentStatus.DISCHARGED,
        isActive: false
      }
    });
    console.log(`Archived ${residentsToArchive.length} residents not present in roster.`);
  }

  let writtenUpdates = 0;
  for (const updateBatch of chunk(updates, WRITE_BATCH_SIZE)) {
    await prisma.$transaction(
      updateBatch.map((entry) =>
        prisma.resident.update({
          where: { id: entry.id },
          data: updateData(entry.row)
        })
      )
    );
    writtenUpdates += updateBatch.length;
    console.log(`Updated ${writtenUpdates}/${updates.length} residents.`);
  }

  let writtenCreates = 0;
  for (const createBatch of chunk(creates, WRITE_BATCH_SIZE)) {
    await prisma.$transaction(
      createBatch.map((row) =>
        prisma.resident.create({
          data: createData(facilityId, row)
        })
      )
    );
    writtenCreates += createBatch.length;
    console.log(`Created ${writtenCreates}/${creates.length} residents.`);
  }
}

async function main() {
  const options = readArgs();
  const raw = await readFile(options.filePath, "utf8");
  const rows = parseMarkdownTable(raw);

  console.log(`Parsed ${rows.length} residents from ${options.filePath}.`);
  console.log(`First row preview: ${rows[0].firstName} ${rows[0].lastName}, room ${rows[0].room}.`);

  if (options.parseOnly) return;

  const facility = await resolveFacility();
  const existingResidents = await loadExistingResidents(facility.id);
  const residentsToArchive = options.replaceActiveRoster ? getResidentsToArchive(existingResidents, rows) : [];
  const plan = getResidentWritePlan(existingResidents, rows);

  console.log(
    `${options.dryRun ? "Dry run for" : "Import plan for"} "${facility.name}": ${plan.creates.length} created, ${plan.updates.length} updated, ${plan.unchanged} unchanged, ${residentsToArchive.length} archived.`
  );

  if (!options.dryRun) {
    await writePlan({
      facilityId: facility.id,
      creates: plan.creates,
      updates: plan.updates,
      residentsToArchive
    });
    console.log(
      `Imported into "${facility.name}": ${plan.creates.length} created, ${plan.updates.length} updated, ${plan.unchanged} unchanged, ${residentsToArchive.length} archived.`
    );
  }
}

main()
  .catch((error) => {
    console.error("Resident roster import failed:", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
