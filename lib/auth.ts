import { randomUUID } from "crypto";

import { auth, currentUser } from "@clerk/nextjs/server";
import { Prisma, Role } from "@prisma/client";
import { redirect } from "next/navigation";

import { AppAccessError, requireAppAccessForUser } from "@/lib/access-control";
import { defaultModuleFlags } from "@/lib/module-flags";
import { prisma } from "@/lib/prisma";
import { getRequestTimeZone } from "@/lib/request-timezone";
import { ensureSettingsForUserAndFacility } from "@/lib/settings/ensure";

const userWithFacilitySelect = Prisma.validator<Prisma.UserSelect>()({
  id: true,
  clerkUserId: true,
  email: true,
  name: true,
  role: true,
  facilityId: true,
  facility: {
    select: {
      id: true,
      name: true,
      timezone: true,
      moduleFlags: true
    }
  }
});

const legacyUserWithFacilitySelect = Prisma.validator<Prisma.UserSelect>()({
  id: true,
  clerkUserId: true,
  email: true,
  name: true,
  role: true,
  facilityId: true,
  facility: {
    select: {
      id: true,
      name: true,
      timezone: true
    }
  }
});

const userCoreSelect = Prisma.validator<Prisma.UserSelect>()({
  id: true,
  clerkUserId: true,
  email: true,
  name: true,
  role: true,
  facilityId: true
});

type UserWithFacilityRow = Prisma.UserGetPayload<{ select: typeof userWithFacilitySelect }>;
type LegacyUserWithFacilityRow = Prisma.UserGetPayload<{ select: typeof legacyUserWithFacilitySelect }>;
type UserCoreRow = Prisma.UserGetPayload<{ select: typeof userCoreSelect }>;

type AuthenticatedUserWithFacility = UserCoreRow & {
  facility: {
    id: string;
    name: string;
    timezone: string;
    moduleFlags: Prisma.JsonValue;
  };
};

function isMissingColumnError(error: unknown) {
  if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2022") {
    return true;
  }

  if (error instanceof Error) {
    return /column .* does not exist/i.test(error.message) || /Unknown arg .*moduleFlags/i.test(error.message);
  }

  return false;
}

function withDefaultModuleFlags(row: UserWithFacilityRow | LegacyUserWithFacilityRow | null) {
  if (!row?.facility) return null;

  return {
    ...row,
    facility: {
      ...row.facility,
      moduleFlags: "moduleFlags" in row.facility && row.facility.moduleFlags ? row.facility.moduleFlags : defaultModuleFlags
    }
  } satisfies AuthenticatedUserWithFacility;
}

async function findUserWithFacilityByClerkId(clerkUserId: string) {
  try {
    const row = await prisma.user.findUnique({
      where: { clerkUserId },
      select: userWithFacilitySelect
    });
    return withDefaultModuleFlags(row);
  } catch (error) {
    if (!isMissingColumnError(error)) throw error;

    console.error("[auth] falling back to legacy facility lookup", error);
    const row = await prisma.user.findUnique({
      where: { clerkUserId },
      select: legacyUserWithFacilitySelect
    });
    return withDefaultModuleFlags(row);
  }
}

async function getClerkProfileFallback() {
  const clerk = await currentUser().catch((error) => {
    console.error("[auth] clerk profile lookup skipped", error);
    return null;
  });

  const primaryEmail =
    clerk?.emailAddresses.find((item) => item.id === clerk.primaryEmailAddressId)?.emailAddress ??
    clerk?.emailAddresses[0]?.emailAddress ??
    "unknown@example.com";
  const name = [clerk?.firstName, clerk?.lastName].filter(Boolean).join(" ") || clerk?.username || "New User";

  return { email: primaryEmail, name };
}

async function createUserAndFacility(input: { clerkUserId: string; email: string; name: string }) {
  try {
    const row = await prisma.$transaction(async (tx) => {
      const facility = await tx.facility.create({
        data: {
          name: "My Facility",
          timezone: "America/New_York",
          moduleFlags: defaultModuleFlags
        },
        select: { id: true }
      });

      return tx.user.create({
        data: {
          clerkUserId: input.clerkUserId,
          email: input.email,
          name: input.name,
          role: Role.ADMIN,
          facilityId: facility.id
        },
        select: userWithFacilitySelect
      });
    });

    return withDefaultModuleFlags(row);
  } catch (error) {
    if (!isMissingColumnError(error)) throw error;

    console.error("[auth] creating user with legacy facility schema fallback", error);
    const row = await prisma.$transaction(async (tx) => {
      const facilityId = randomUUID();

      await tx.$executeRaw`
        INSERT INTO "Facility" ("id", "name", "timezone")
        VALUES (${facilityId}, ${"My Facility"}, ${"America/New_York"})
      `;

      return tx.user.create({
        data: {
          clerkUserId: input.clerkUserId,
          email: input.email,
          name: input.name,
          role: Role.ADMIN,
          facilityId
        },
        select: legacyUserWithFacilitySelect
      });
    });

    return withDefaultModuleFlags(row);
  }
}

async function repairMissingFacilityForUser(user: UserCoreRow) {
  try {
    const repaired = await prisma.$transaction(async (tx) => {
      const facility = await tx.facility.create({
        data: {
          name: "My Facility",
          timezone: "America/New_York",
          moduleFlags: defaultModuleFlags
        },
        select: { id: true }
      });

      return tx.user.update({
        where: { id: user.id },
        data: { facilityId: facility.id },
        select: userWithFacilitySelect
      });
    });

    return withDefaultModuleFlags(repaired);
  } catch (error) {
    if (!isMissingColumnError(error)) throw error;

    console.error("[auth] repairing user with legacy facility schema fallback", error);
    const repaired = await prisma.$transaction(async (tx) => {
      const facilityId = randomUUID();

      await tx.$executeRaw`
        INSERT INTO "Facility" ("id", "name", "timezone")
        VALUES (${facilityId}, ${"My Facility"}, ${"America/New_York"})
      `;

      return tx.user.update({
        where: { id: user.id },
        data: { facilityId },
        select: legacyUserWithFacilitySelect
      });
    });

    return withDefaultModuleFlags(repaired);
  }
}

async function findUserCoreByClerkId(clerkUserId: string) {
  return prisma.user.findUnique({ where: { clerkUserId }, select: userCoreSelect });
}

function ensureSettingsForAuthenticatedUser(user: AuthenticatedUserWithFacility, label: string) {
  // Settings are helpful defaults, but they should never block the app from opening after sign-in.
  ensureSettingsForUserAndFacility({
    facilityId: user.facilityId,
    userId: user.id,
    timezone: user.facility.timezone,
    moduleFlags: user.facility.moduleFlags
  }).catch((error) => {
    console.error(`[auth] ensure settings skipped ${label}`, error);
  });
}

export async function ensureUserAndFacility() {
  const { userId } = await auth();
  if (!userId) {
    redirect("/sign-in");
  }

  const existingUser = await findUserWithFacilityByClerkId(userId);

  if (existingUser) {
    ensureSettingsForAuthenticatedUser(existingUser, "for existing user");
    return existingUser;
  }

  const { email, name } = await getClerkProfileFallback();

  try {
    const createdUser = await createUserAndFacility({ clerkUserId: userId, email, name });
    if (!createdUser) {
      throw new Error("User creation failed: unable to load newly created user.");
    }

    ensureSettingsForAuthenticatedUser(createdUser, "for newly created user");
    return createdUser;
  } catch (error) {
    // Two parallel first-load requests can race; if user was created by another request, reuse it.
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      const existing = await findUserWithFacilityByClerkId(userId);
      if (existing) {
        ensureSettingsForAuthenticatedUser(existing, "after race fallback");
        return existing;
      }

      const coreUser = await findUserCoreByClerkId(userId);
      if (coreUser) {
        const repaired = await repairMissingFacilityForUser(coreUser);
        if (repaired) {
          ensureSettingsForAuthenticatedUser(repaired, "after facility repair");
          return repaired;
        }
      }
    }
    throw error;
  }
}

export async function requireUser() {
  const dbUser = await ensureUserAndFacility();
  return dbUser;
}

export async function getOptionalUser() {
  const { userId } = await auth();
  if (!userId) return null;
  return findUserWithFacilityByClerkId(userId);
}

export async function requireFacilityContext() {
  const user = await requireUser();
  try {
    await requireAppAccessForUser(user);
  } catch (error) {
    if (error instanceof AppAccessError) {
      if (error.status === 401) {
        redirect("/sign-in");
      }
      redirect("/subscribe");
    }
    throw error;
  }

  const timeZone = getRequestTimeZone(user.facility.timezone);
  return {
    user,
    facilityId: user.facilityId,
    role: user.role,
    facility: user.facility,
    timeZone
  };
}
