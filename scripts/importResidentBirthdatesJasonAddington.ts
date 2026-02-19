import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient({
  datasources: {
    db: {
      url: process.env.DIRECT_URL || process.env.DATABASE_URL
    }
  }
});

type BirthdateImportRow = {
  name: string;
  location: string;
  dateOfBirth: string;
};

const birthdateRows: BirthdateImportRow[] = [
  { name: "Miller, Shirley (290455)", location: "1 1 - B", dateOfBirth: "Aug 06, 1947" },
  { name: "Carpenter, Thomas (291436)", location: "1 2 - B", dateOfBirth: "Aug 26, 1955" },
  { name: "Lloyd, Jay Jr (292038)", location: "1 4 - A", dateOfBirth: "Mar 19, 1961" },
  { name: "Starnes, Hubert (292165)", location: "1 4 - B", dateOfBirth: "Jun 13, 1952" },
  { name: "Hadeler, Melissa (292321)", location: "1 5 - B", dateOfBirth: "Feb 09, 1955" },
  { name: "Tackett, John (292276)", location: "1 6 - A", dateOfBirth: "Oct 10, 1942" },
  { name: "Power, Jeffrey (292082)", location: "1 6 - B", dateOfBirth: "Feb 26, 1951" },
  { name: "Eads, Richard (290205-01)", location: "1 8 - A", dateOfBirth: "May 13, 1955" },
  { name: "Gilliam, Tammy (292296)", location: "1 9 - B", dateOfBirth: "Nov 12, 1959" },
  { name: "Johnson, Alphonso (292287)", location: "1 11 - A", dateOfBirth: "Sep 12, 1962" },
  { name: "Salas, Jesus (292330)", location: "1 11 - B", dateOfBirth: "Jun 25, 1959" },
  { name: "Noel, Bradley (292256)", location: "1 12 - A", dateOfBirth: "Feb 16, 1971" },
  { name: "Thompson, Randall (292217)", location: "1 12 - B", dateOfBirth: "Feb 03, 1961" },
  { name: "Vickery, Jerry (292327)", location: "1 13 - A", dateOfBirth: "Mar 20, 1941" },
  { name: "Fay, Robert Jr (292199)", location: "1 13 - B", dateOfBirth: "Feb 26, 1943" },
  { name: "Lugo, Warren (292164)", location: "1 14 - A", dateOfBirth: "Mar 22, 1975" },
  { name: "Little, Raymond (292117)", location: "1 14 - B", dateOfBirth: "Sep 29, 1960" },
  { name: "Powell, Earl (291993)", location: "1 15 - B", dateOfBirth: "Feb 20, 1959" },
  { name: "Dunham, Edward (292319)", location: "1 17 - A", dateOfBirth: "Jun 10, 1961" },
  { name: "Bell, Allen (292118)", location: "1 17 - B", dateOfBirth: "Apr 03, 1989" },
  { name: "Spracklen, Laverne (291227)", location: "1 18 - A", dateOfBirth: "Oct 04, 1952" },
  { name: "Hook, Sharon (291505)", location: "1 18 - B", dateOfBirth: "Jul 12, 1945" },
  { name: "Meeks, Brenda (291682)", location: "1 20 - A", dateOfBirth: "Jun 14, 1965" },
  { name: "Freeman, Shirley (291167)", location: "1 20 - B", dateOfBirth: "Jul 24, 1950" },
  { name: "Herndon, Sandra (291979)", location: "1 22 - A", dateOfBirth: "Aug 12, 1957" },
  { name: "George, Tomma (292238)", location: "1 22 - B", dateOfBirth: "Mar 21, 1964" },
  { name: "YARRISH, BRUNO (292323)", location: "1 23 - A", dateOfBirth: "Oct 12, 1952" },
  { name: "Herring, Mark (292308)", location: "1 23 - B", dateOfBirth: "Jul 25, 1954" },
  { name: "Johnson, Vernell (292272)", location: "1 24 - A", dateOfBirth: "Nov 01, 1961" },
  { name: "Lopez, John II (292024)", location: "1 25 - A", dateOfBirth: "Feb 11, 1960" },
  { name: "Albaugh, Thomas Aust (291101)", location: "1 25 - B", dateOfBirth: "May 26, 1993" },
  { name: "Kumm, James (292013)", location: "1 26 - A", dateOfBirth: "Jun 06, 1941" },
  { name: "Cornell, Douglas (291965)", location: "1 26 - B", dateOfBirth: "Aug 23, 1963" },
  { name: "Torres, Elias Jr (292054)", location: "1 27 - B", dateOfBirth: "Aug 30, 1961" },
  { name: "Faraj, Roni (292230)", location: "1 28 - A", dateOfBirth: "Jul 27, 1980" },
  { name: "Myers, Starley (292255)", location: "1 29 - A", dateOfBirth: "Aug 02, 1950" },
  { name: "Stewart, Vick (291815)", location: "1 29 - B", dateOfBirth: "Aug 30, 1968" },
  { name: "Ray, Eleanor (292125)", location: "1 30 - A", dateOfBirth: "Sep 30, 1942" },
  { name: "Lewis, Alma (290944)", location: "1 30 - B", dateOfBirth: "Feb 05, 1929" },
  { name: "Wright, Ken (292274)", location: "1 31 - A", dateOfBirth: "Dec 08, 1969" },
  { name: "Harman, Paul (292147)", location: "1 31 - B", dateOfBirth: "Jan 23, 1969" },
  { name: "Wood, Lugene (292252)", location: "1 32 - A", dateOfBirth: "Mar 18, 1954" },
  { name: "Loyd, Deborah (291246)", location: "1 32 - B", dateOfBirth: "Jul 02, 1957" },
  { name: "Kupferle, Holt (291606)", location: "1 33 - B", dateOfBirth: "Aug 22, 1954" },
  { name: "Schneider, Richard (292292)", location: "1 34 - A", dateOfBirth: "May 18, 1956" },
  { name: "Bell, Dominque (291650)", location: "1 34 - B", dateOfBirth: "Oct 08, 1990" },
  { name: "Roberson, Kenneth (291992)", location: "1 35 - A", dateOfBirth: "Dec 19, 1955" },
  { name: "Walker, John (292298)", location: "1 35 - B", dateOfBirth: "Mar 29, 1950" },
  { name: "Green, Eddy (290225-01)", location: "1 36 - A", dateOfBirth: "Oct 20, 1975" },
  { name: "Manuel, Jeffrey (291813)", location: "1 36 - B", dateOfBirth: "Sep 13, 1979" },
  { name: "Stringer, Francis (291968)", location: "1 37 - A", dateOfBirth: "Oct 02, 1941" },
  { name: "Galvan Rodriguez, Sa (292080)", location: "1 37 - B", dateOfBirth: "Jul 23, 1957" },
  { name: "Lenington, Raymond (292052)", location: "1 38 - B", dateOfBirth: "Nov 24, 1990" },
  { name: "Fernandez, Linda (292162)", location: "1 39 - B", dateOfBirth: "May 01, 1971" },
  { name: "Jones, Bobanna (291739)", location: "1 40 - A", dateOfBirth: "Nov 12, 1945" },
  { name: "Sanchez, Maria (291052)", location: "1 40 - B", dateOfBirth: "Jul 13, 1945" },
  { name: "Rogers, James Jr (292063)", location: "1 41 - B", dateOfBirth: "Jan 12, 1954" },
  { name: "Burks, Cynthia (292066)", location: "1 42 - A", dateOfBirth: "Aug 02, 1957" },
  { name: "Brown, Sheila (292021)", location: "1 42 - B", dateOfBirth: "Feb 12, 1960" },
  { name: "Dvorak, Donald (291530)", location: "1 43 - A", dateOfBirth: "Aug 29, 1955" },
  { name: "Zimmons, Dietrich (292002)", location: "1 43 - B", dateOfBirth: "May 05, 1975" }
];

const MONTHS: Record<string, number> = {
  Jan: 0,
  Feb: 1,
  Mar: 2,
  Apr: 3,
  May: 4,
  Jun: 5,
  Jul: 6,
  Aug: 7,
  Sep: 8,
  Oct: 9,
  Nov: 10,
  Dec: 11
};

function normalizeName(value: string) {
  return value
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/\([^)]*\)/g, " ")
    .replace(/\b(jr|sr|ii|iii|iv|v)\b/g, " ")
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function roomFromLocation(location: string) {
  const match = location.match(/^\s*\d+\s+(\d+)\s*-\s*([a-z])\s*$/i);
  if (!match) return null;
  return `${Number.parseInt(match[1], 10)}${match[2].toUpperCase()}`;
}

function parseDateLabel(label: string) {
  const match = label.match(/^([A-Za-z]{3})\s+(\d{2}),\s+(\d{4})$/);
  if (!match) return null;
  const month = MONTHS[match[1]];
  if (month == null) return null;
  const day = Number.parseInt(match[2], 10);
  const year = Number.parseInt(match[3], 10);
  return new Date(Date.UTC(year, month, day, 12, 0, 0));
}

function dateKey(value: Date | null) {
  if (!value) return null;
  return value.toISOString().slice(0, 10);
}

function splitResidentName(input: string) {
  const noId = input.replace(/\s*\([^)]*\)\s*$/, "").trim();
  const [lastRaw, firstRaw = ""] = noId.split(",");
  return {
    firstName: firstRaw.trim(),
    lastName: lastRaw.trim()
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

async function main() {
  const jason = await findJasonScope();
  const residents = await prisma.resident.findMany({
    where: {
      facilityId: jason.facilityId
    },
    select: {
      id: true,
      firstName: true,
      lastName: true,
      room: true,
      birthDate: true
    }
  });

  const byRoom = new Map(residents.map((resident) => [resident.room.toUpperCase().trim(), resident]));
  const byName = new Map<string, typeof residents>();
  for (const resident of residents) {
    const key = `${normalizeName(resident.lastName)}|${normalizeName(resident.firstName)}`;
    const existing = byName.get(key) ?? [];
    existing.push(resident);
    byName.set(key, existing);
  }

  let updatedCount = 0;
  let unchangedCount = 0;
  const unmatched: Array<{ input: string; location: string; reason: string }> = [];
  const roomFallbackWarnings: Array<{ input: string; room: string; found: string }> = [];
  const roomMismatchResolvedByName: Array<{ input: string; inputRoom: string; matchedRoom: string; found: string }> = [];

  for (const row of birthdateRows) {
    const room = roomFromLocation(row.location);
    const parsedDate = parseDateLabel(row.dateOfBirth);
    const parsedName = splitResidentName(row.name);

    if (!parsedDate) {
      unmatched.push({ input: row.name, location: row.location, reason: `Invalid DOB: ${row.dateOfBirth}` });
      continue;
    }

    const firstKey = normalizeName(parsedName.firstName);
    const lastKey = normalizeName(parsedName.lastName);
    const keyed = byName.get(`${lastKey}|${firstKey}`) ?? [];

    let matchedResident = keyed.length === 1 ? keyed[0] : null;

    if (!matchedResident) {
      const fuzzyMatches = residents.filter((resident) => {
        const residentLast = normalizeName(resident.lastName);
        const residentFirst = normalizeName(resident.firstName);
        const lastMatch = residentLast === lastKey || residentLast.includes(lastKey) || lastKey.includes(residentLast);
        const firstMatch = residentFirst === firstKey || residentFirst.startsWith(firstKey) || firstKey.startsWith(residentFirst);
        return lastMatch && firstMatch;
      });
      if (fuzzyMatches.length === 1) {
        matchedResident = fuzzyMatches[0];
      }
    }

    if (!matchedResident && room) {
      matchedResident = byRoom.get(room) ?? null;
      if (matchedResident) {
        roomFallbackWarnings.push({
          input: row.name,
          room,
          found: `${matchedResident.lastName}, ${matchedResident.firstName}`
        });
      }
    }

    if (!matchedResident) {
      unmatched.push({ input: row.name, location: row.location, reason: "No resident match in Jason facility scope" });
      continue;
    }

    if (room && matchedResident.room.toUpperCase() !== room.toUpperCase()) {
      roomMismatchResolvedByName.push({
        input: row.name,
        inputRoom: room,
        matchedRoom: matchedResident.room,
        found: `${matchedResident.lastName}, ${matchedResident.firstName}`
      });
    }

    if (dateKey(matchedResident.birthDate) === dateKey(parsedDate)) {
      unchangedCount += 1;
      continue;
    }

    await prisma.resident.update({
      where: { id: matchedResident.id },
      data: { birthDate: parsedDate }
    });
    updatedCount += 1;
  }

  console.log(`Imported resident birthdays for ${jason.name} (${jason.email}) in facility "${jason.facility.name}".`);
  console.log(`Tenant scope facilityId: ${jason.facilityId}`);
  console.log(
    JSON.stringify(
      {
        rowsProvided: birthdateRows.length,
        residentsInFacility: residents.length,
        updatedCount,
        unchangedCount,
        unmatchedCount: unmatched.length,
        roomFallbackWarningCount: roomFallbackWarnings.length,
        roomMismatchResolvedByNameCount: roomMismatchResolvedByName.length
      },
      null,
      2
    )
  );

  if (roomFallbackWarnings.length > 0) {
    console.log("\nRows matched by room fallback:");
    for (const warning of roomFallbackWarnings) {
      console.log(`- Input "${warning.input}" matched room ${warning.room} resident "${warning.found}"`);
    }
  }

  if (roomMismatchResolvedByName.length > 0) {
    console.log("\nRows with room mismatch resolved by resident name:");
    for (const warning of roomMismatchResolvedByName) {
      console.log(`- Input "${warning.input}" room ${warning.inputRoom} matched "${warning.found}" in room ${warning.matchedRoom}`);
    }
  }

  if (unmatched.length > 0) {
    console.log("\nUnmatched rows:");
    for (const row of unmatched) {
      console.log(`- ${row.input} @ ${row.location}: ${row.reason}`);
    }
    process.exitCode = 1;
  }
}

main()
  .catch((error) => {
    console.error("Birthday import failed:", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
