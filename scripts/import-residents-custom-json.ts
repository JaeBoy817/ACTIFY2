import { readFile } from "node:fs/promises";
import path from "node:path";

import { PrismaClient, ResidentStatus } from "@prisma/client";
import { z } from "zod";

const prisma = new PrismaClient();

const residentSchema = z.object({
  room: z.string().min(1),
  residentName: z.string().min(1),
  status: z.string().min(1),
  notes: z.string()
});

const residentsSchema = z.array(residentSchema).min(1);

type ResidentInput = z.infer<typeof residentSchema>;

function parseResidentName(fullName: string) {
  const [lastRaw, ...firstParts] = fullName.split(",");
  const lastName = (lastRaw ?? "").trim();
  const firstName = firstParts.join(",").trim();

  if (!firstName || !lastName) {
    throw new Error(`Invalid residentName format: "${fullName}". Expected "Last, First".`);
  }

  return { firstName, lastName };
}

function mapStatus(status: string): ResidentStatus {
  const normalized = status.trim().toLowerCase();

  if (normalized === "active") return ResidentStatus.ACTIVE;
  if (normalized === "bed bound") return ResidentStatus.BED_BOUND;
  if (normalized === "discharged") return ResidentStatus.DISCHARGED;
  if (normalized === "hospitalized") return ResidentStatus.HOSPITALIZED;
  if (normalized === "on leave") return ResidentStatus.ON_LEAVE;
  if (normalized === "transferred") return ResidentStatus.TRANSFERRED;
  if (normalized === "deceased") return ResidentStatus.DECEASED;

  return ResidentStatus.OTHER;
}

function statusIsActive(status: ResidentStatus) {
  return status === ResidentStatus.ACTIVE || status === ResidentStatus.BED_BOUND;
}

async function loadResidents() {
  const filePath = path.join(process.cwd(), "prisma", "residents-custom.json");
  const raw = await readFile(filePath, "utf8");
  return residentsSchema.parse(JSON.parse(raw));
}

async function resolveFacilities() {
  const preferred = await prisma.facility.findFirst({
    where: { name: "Richland Hills Rehab" },
    select: { id: true, name: true }
  });

  if (preferred) return [preferred];

  return prisma.facility.findMany({
    select: { id: true, name: true }
  });
}

async function upsertResident(facilityId: string, resident: ResidentInput) {
  const { firstName, lastName } = parseResidentName(resident.residentName);
  const mappedStatus = mapStatus(resident.status);
  const existing = await prisma.resident.findFirst({
    where: {
      facilityId,
      firstName,
      lastName,
      room: resident.room
    },
    select: { id: true }
  });

  const data = {
    firstName,
    lastName,
    room: resident.room,
    status: mappedStatus,
    isActive: statusIsActive(mappedStatus),
    notes: resident.notes.trim() ? resident.notes.trim() : null
  };

  if (existing) {
    await prisma.resident.update({
      where: { id: existing.id },
      data
    });
    return "updated" as const;
  }

  await prisma.resident.create({
    data: {
      facilityId,
      ...data
    }
  });
  return "created" as const;
}

async function main() {
  const residents = await loadResidents();
  const facilities = await resolveFacilities();

  if (facilities.length === 0) {
    console.log("No facilities found. Create a facility first, then rerun.");
    return;
  }

  for (const facility of facilities) {
    let created = 0;
    let updated = 0;

    for (const resident of residents) {
      const result = await upsertResident(facility.id, resident);
      if (result === "created") created += 1;
      else updated += 1;
    }

    console.log(`Facility "${facility.name}": created ${created}, updated ${updated}.`);
  }
}

main()
  .catch((error) => {
    console.error("Resident import failed:", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
