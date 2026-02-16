import { PrismaClient, type ResidentStatus } from "@prisma/client";
import { z } from "zod";

const prisma = new PrismaClient({
  datasources: {
    db: {
      url: process.env.DIRECT_URL || process.env.DATABASE_URL
    }
  }
});

const residentSchema = z.object({
  room: z.string().min(1),
  firstName: z.string().min(1),
  lastName: z.string().min(1),
  status: z.enum(["Active", "Bed Bound", "Discharged", "Hospital"]),
  notes: z.string()
});

const residentsSchema = z.array(residentSchema).min(1);

const RESIDENT_STATUS = {
  ACTIVE: "ACTIVE",
  BED_BOUND: "BED_BOUND",
  DISCHARGED: "DISCHARGED",
  HOSPITALIZED: "HOSPITALIZED"
} as const;

const residentsInput = residentsSchema.parse([
  { "room": "1B", "lastName": "Miller", "firstName": "Shirley", "status": "Bed Bound", "notes": "1:1 Activities in Room (Therapy)" },
  { "room": "2B", "lastName": "Carpenter", "firstName": "Thomas", "status": "Active", "notes": "" },
  { "room": "3A", "lastName": "Martin", "firstName": "Valrae", "status": "Active", "notes": "" },
  { "room": "3B", "lastName": "Holman", "firstName": "Jamey", "status": "Active", "notes": "" },
  { "room": "4A", "lastName": "Lloyd", "firstName": "Jay", "status": "Bed Bound", "notes": "1:1 Activities in Room (Conversation)" },
  { "room": "4B", "lastName": "Starnes", "firstName": "Hubert", "status": "Active", "notes": "Bingo, Trivia" },
  { "room": "5B", "lastName": "Hadeler", "firstName": "Melissa", "status": "Active", "notes": "" },
  { "room": "6A", "lastName": "Tackett", "firstName": "John", "status": "Active", "notes": "Bingo, Trivia, Social Groups" },
  { "room": "6B", "lastName": "Power", "firstName": "Jeffrey", "status": "Active", "notes": "Bingo, Outside Lesiure" },
  { "room": "8A", "lastName": "Eads", "firstName": "Richard", "status": "Bed Bound", "notes": "1:1 Activities (Smoke Break, Conversation)" },
  { "room": "9B", "lastName": "Gilliam", "firstName": "Tammy", "status": "Active", "notes": "Bingo, Trivia, Social Groups" },
  { "room": "11A", "lastName": "Johnson", "firstName": "Alphonso", "status": "Active", "notes": "Bingo, Smoke Break" },
  { "room": "11B", "lastName": "Salas", "firstName": "Jesus", "status": "Active", "notes": "" },
  { "room": "12A", "lastName": "Noel", "firstName": "Bradley", "status": "Bed Bound", "notes": "1:1 Activities in Room (Sports)" },
  { "room": "12B", "lastName": "Thompson", "firstName": "Randall", "status": "Active", "notes": "Bingo, Outside Lesiure" },
  { "room": "13B", "lastName": "Fay", "firstName": "Robert", "status": "Active", "notes": "Bingo & Trivia" },
  { "room": "14A", "lastName": "Yarrish", "firstName": "Bruno", "status": "Active", "notes": "" },
  { "room": "15B", "lastName": "Powell", "firstName": "Earl", "status": "Active", "notes": "1:1 Conversations" },
  { "room": "16A", "lastName": "Antillon", "firstName": "Michelle", "status": "Hospital", "notes": "" },
  { "room": "16B", "lastName": "Benbrook", "firstName": "Rebecah", "status": "Discharged", "notes": "" },
  { "room": "17A", "lastName": "Dunham", "firstName": "Edward", "status": "Active", "notes": "" },
  { "room": "17B", "lastName": "Bell", "firstName": "Allen", "status": "Bed Bound", "notes": "1:1 Activities in Room (Conversation)" },
  { "room": "18A", "lastName": "Spracklen", "firstName": "Laverne", "status": "Bed Bound", "notes": "1:1 Activities in Room (Conversation)" },
  { "room": "18B", "lastName": "Hook", "firstName": "Sharon", "status": "Active", "notes": "1:1 Activities in Room" },
  { "room": "20A", "lastName": "Meeks", "firstName": "Brenda", "status": "Active", "notes": "Bingo, Trivia, Parties" },
  { "room": "20B", "lastName": "Freeman", "firstName": "Shirley", "status": "Bed Bound", "notes": "" },
  { "room": "22A", "lastName": "Herndon", "firstName": "Sandra", "status": "Active", "notes": "Smoke Break, Bingo" },
  { "room": "22B", "lastName": "George", "firstName": "Tomma", "status": "Active", "notes": "" },
  { "room": "23A", "lastName": "Little", "firstName": "Raymond \"Doug\"", "status": "Active", "notes": "Smoke Break" },
  { "room": "23B", "lastName": "Herring", "firstName": "Mark", "status": "Active", "notes": "Bingo, Puzzles" },
  { "room": "24A", "lastName": "Johnson", "firstName": "Vernell", "status": "Active", "notes": "Dominoes, Smoke Break" },
  { "room": "25A", "lastName": "Lopez", "firstName": "John", "status": "Active", "notes": "Bingo" },
  { "room": "25B", "lastName": "Albaugh", "firstName": "Tommy", "status": "Active", "notes": "Church/Bible Study Group" },
  { "room": "26A", "lastName": "Kumm", "firstName": "James", "status": "Bed Bound", "notes": "1:1 Activities (Smoke Break)" },
  { "room": "26B", "lastName": "Cornell", "firstName": "Douglas", "status": "Active", "notes": "Bingo" },
  { "room": "27B", "lastName": "Torres", "firstName": "Elias", "status": "Active", "notes": "Painting/Drawing, Arts and Crafts" },
  { "room": "28A", "lastName": "Faraj", "firstName": "Roni", "status": "Bed Bound", "notes": "" },
  { "room": "29A", "lastName": "Myers", "firstName": "Starley", "status": "Active", "notes": "" },
  { "room": "29B", "lastName": "Stewart", "firstName": "Vick", "status": "Active", "notes": "Bingo, Trivia, Parties, Arts & Crafts" },
  { "room": "30A", "lastName": "Ray", "firstName": "Eleanor", "status": "Active", "notes": "Bible Study Group" },
  { "room": "30B", "lastName": "Lewis", "firstName": "Alma", "status": "Active", "notes": "" },
  { "room": "31A", "lastName": "Wright", "firstName": "Ken", "status": "Bed Bound", "notes": "" },
  { "room": "31B", "lastName": "Harman", "firstName": "Paul", "status": "Active", "notes": "Conversations, Smoke Break" },
  { "room": "32A", "lastName": "Wood", "firstName": "Lugene", "status": "Active", "notes": "" },
  { "room": "32B", "lastName": "Loyd", "firstName": "Deborah", "status": "Active", "notes": "Bingo" },
  { "room": "33B", "lastName": "Kupferle", "firstName": "Holt", "status": "Active", "notes": "" },
  { "room": "34A", "lastName": "Schneider", "firstName": "Richard", "status": "Active", "notes": "" },
  { "room": "34B", "lastName": "Bell", "firstName": "Dominque", "status": "Bed Bound", "notes": "" },
  { "room": "35A", "lastName": "Roberson", "firstName": "Kenny", "status": "Active", "notes": "Bingo, Smoke Break, Social Group" },
  { "room": "35B", "lastName": "Walker", "firstName": "John", "status": "Active", "notes": "Bingo, Smoke Break" },
  { "room": "36A", "lastName": "Green", "firstName": "Eddy", "status": "Active", "notes": "Bingo, Domioes" },
  { "room": "36B", "lastName": "Manuel", "firstName": "Jeffrey", "status": "Bed Bound", "notes": "1:1 Activities in Room (Cars)" },
  { "room": "37A", "lastName": "Stringer", "firstName": "Francis", "status": "Active", "notes": "" },
  { "room": "37B", "lastName": "Galvan Rodriguez", "firstName": "Santiago", "status": "Bed Bound", "notes": "" },
  { "room": "38A", "lastName": "Lenington", "firstName": "Raymond", "status": "Active", "notes": "1:1 Sensory Activities" },
  { "room": "39A", "lastName": "Lugo", "firstName": "Warren", "status": "Active", "notes": "Bingo" },
  { "room": "39B", "lastName": "Fernandez", "firstName": "Linda", "status": "Active", "notes": "Bingo" },
  { "room": "40A", "lastName": "Jones", "firstName": "Bobanna", "status": "Bed Bound", "notes": "1:1 Activities in Room (Conversation)" },
  { "room": "40B", "lastName": "Sanchez", "firstName": "Maria", "status": "Active", "notes": "Bingo, Trivia, Conversations" },
  { "room": "41B", "lastName": "Rogers", "firstName": "James", "status": "Active", "notes": "" },
  { "room": "42A", "lastName": "Burks", "firstName": "Cynthia", "status": "Active", "notes": "Church Group" },
  { "room": "42B", "lastName": "Brown", "firstName": "Shiela", "status": "Active", "notes": "Bingo, Trivia, Smoke Break" },
  { "room": "43A", "lastName": "Dvorak", "firstName": "Donald", "status": "Bed Bound", "notes": "1:1 Activities (Conversation, Parties if possible)" },
  { "room": "43B", "lastName": "Zimmons", "firstName": "Dietrich", "status": "Active", "notes": "Bingo, Trivia, Parties" }
]);

function toDbResidentStatus(value: string): ResidentStatus {
  return value as ResidentStatus;
}

function isActiveResident(status: ResidentStatus) {
  return status === RESIDENT_STATUS.ACTIVE || status === RESIDENT_STATUS.BED_BOUND;
}

async function supportsHospitalizedStatus() {
  try {
    const rows = await prisma.$queryRaw<Array<{ enumlabel: string }>>`
      SELECT e.enumlabel
      FROM pg_type t
      JOIN pg_enum e ON t.oid = e.enumtypid
      WHERE t.typname = 'ResidentStatus'
    `;
    if (Array.isArray(rows) && rows.length > 0) {
      return rows.some((row) => row.enumlabel === RESIDENT_STATUS.HOSPITALIZED);
    }
  } catch {
    // Non-Postgres providers or missing enum metadata fall back to safe mapping below.
  }
  return false;
}

function mapStatusAndNotes(
  inputStatus: z.infer<typeof residentSchema>["status"],
  inputNotes: string,
  canStoreHospitalized: boolean
) {
  const notes = inputNotes.trim();

  if (inputStatus === "Active") {
    return {
      status: toDbResidentStatus(RESIDENT_STATUS.ACTIVE),
      notes: notes || null
    };
  }

  if (inputStatus === "Bed Bound") {
    return {
      status: toDbResidentStatus(RESIDENT_STATUS.BED_BOUND),
      notes: notes || null
    };
  }

  if (inputStatus === "Discharged") {
    return {
      status: toDbResidentStatus(RESIDENT_STATUS.DISCHARGED),
      notes: notes || null
    };
  }

  // Hospital mapping rule:
  // - If enum supports hospitalized, store it directly.
  // - Otherwise map to Active with "Hospital: " note prefix.
  if (canStoreHospitalized) {
    return {
      status: toDbResidentStatus(RESIDENT_STATUS.HOSPITALIZED),
      notes: notes || null
    };
  }

  return {
    status: toDbResidentStatus(RESIDENT_STATUS.ACTIVE),
    notes: notes ? `Hospital: ${notes}` : "Hospital: "
  };
}

async function findJasonScope() {
  const user = await prisma.user.findFirst({
    where: {
      OR: [
        { name: { equals: "Jason Addington", mode: "insensitive" } },
        { email: { contains: "jasonaddington817", mode: "insensitive" } },
        { email: { contains: "jaeboy", mode: "insensitive" } }
      ]
    },
    select: {
      id: true,
      name: true,
      email: true,
      facilityId: true,
      facility: {
        select: {
          name: true
        }
      }
    }
  });

  if (!user) {
    throw new Error('Could not find user "Jason Addington" (or matching email) to resolve tenant scope.');
  }

  return user;
}

async function upsertForRoom(
  facilityId: string,
  resident: z.infer<typeof residentSchema>,
  canStoreHospitalized: boolean
) {
  const mapped = mapStatusAndNotes(resident.status, resident.notes, canStoreHospitalized);
  const data = {
    firstName: resident.firstName,
    lastName: resident.lastName,
    room: resident.room,
    status: mapped.status,
    notes: mapped.notes,
    isActive: isActiveResident(mapped.status)
  };

  const existingByRoom = await prisma.resident.findFirst({
    where: {
      facilityId,
      room: resident.room
    },
    orderBy: {
      createdAt: "asc"
    }
  });

  const existing = existingByRoom
    ?? await prisma.resident.findFirst({
      where: {
        facilityId,
        firstName: resident.firstName,
        lastName: resident.lastName,
        room: resident.room
      }
    });

  if (!existing) {
    await prisma.resident.create({
      data: {
        facilityId,
        ...data
      }
    });
    return "created" as const;
  }

  const unchanged = existing.firstName === data.firstName
    && existing.lastName === data.lastName
    && existing.room === data.room
    && existing.status === data.status
    && (existing.notes ?? null) === data.notes
    && existing.isActive === data.isActive;

  if (unchanged) {
    return "unchanged" as const;
  }

  await prisma.resident.update({
    where: { id: existing.id },
    data
  });

  return "updated" as const;
}

async function main() {
  const jason = await findJasonScope();
  const canStoreHospitalized = await supportsHospitalizedStatus();

  let createdCount = 0;
  let updatedCount = 0;
  let unchangedCount = 0;

  for (const resident of residentsInput) {
    const result = await upsertForRoom(jason.facilityId, resident, canStoreHospitalized);
    if (result === "created") createdCount += 1;
    else if (result === "updated") updatedCount += 1;
    else unchangedCount += 1;
  }

  console.log(`Imported residents for ${jason.name} (${jason.email}) in facility "${jason.facility.name}".`);
  console.log(`Tenant scope facilityId: ${jason.facilityId}`);
  console.log(JSON.stringify({ createdCount, updatedCount, unchangedCount }, null, 2));
}

main()
  .catch((error) => {
    console.error("Resident import failed:", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
