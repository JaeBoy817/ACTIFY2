import { auth, currentUser } from "@clerk/nextjs/server";
import { Prisma, Role } from "@prisma/client";
import { redirect } from "next/navigation";

import { defaultModuleFlags } from "@/lib/module-flags";
import { prisma } from "@/lib/prisma";
import { getRequestTimeZone } from "@/lib/request-timezone";
import { ensureSettingsForUserAndFacility } from "@/lib/settings/ensure";

export async function ensureUserAndFacility() {
  const { userId } = await auth();
  if (!userId) {
    redirect("/sign-in");
  }

  const existingUser = await prisma.user.findUnique({
    where: { clerkUserId: userId },
    include: {
      settings: { select: { id: true } },
      facility: {
        include: {
          settings: { select: { id: true } }
        }
      }
    }
  });

  if (existingUser) {
    // These settings records are needed only once. Avoid upsert writes on every request/action.
    if (!existingUser.settings || !existingUser.facility.settings) {
      await ensureSettingsForUserAndFacility({
        facilityId: existingUser.facilityId,
        userId: existingUser.id,
        timezone: existingUser.facility.timezone,
        moduleFlags: existingUser.facility.moduleFlags
      });
    }
    return existingUser;
  }

  const clerk = await currentUser();
  const email = clerk?.emailAddresses.find((item) => item.id === clerk.primaryEmailAddressId)?.emailAddress ?? "unknown@example.com";
  const name = [clerk?.firstName, clerk?.lastName].filter(Boolean).join(" ") || clerk?.username || "New User";

  try {
    await prisma.$transaction(async (tx) => {
      const facility = await tx.facility.create({
        data: {
          name: "My Facility",
          timezone: "America/New_York",
          moduleFlags: defaultModuleFlags
        }
      });

      return tx.user.create({
        data: {
          clerkUserId: userId,
          email,
          name,
          role: Role.ADMIN,
          facilityId: facility.id
        },
        include: { facility: true }
      });
    });
  } catch (error) {
    // Two parallel first-load requests can race; if user was created by another request, reuse it.
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      const existing = await prisma.user.findUnique({
        where: { clerkUserId: userId },
        include: {
          settings: { select: { id: true } },
          facility: {
            include: {
              settings: { select: { id: true } }
            }
          }
        }
      });
      if (existing) {
        if (!existing.settings || !existing.facility.settings) {
          await ensureSettingsForUserAndFacility({
            facilityId: existing.facilityId,
            userId: existing.id,
            timezone: existing.facility.timezone,
            moduleFlags: existing.facility.moduleFlags
          });
        }
        return existing;
      }
    }
    throw error;
  }

  const createdUser = await prisma.user.findUnique({
    where: { clerkUserId: userId },
    include: {
      settings: { select: { id: true } },
      facility: {
        include: {
          settings: { select: { id: true } }
        }
      }
    }
  });

  if (!createdUser) {
    throw new Error("User creation failed: unable to load newly created user.");
  }

  if (!createdUser.settings || !createdUser.facility.settings) {
    await ensureSettingsForUserAndFacility({
      facilityId: createdUser.facilityId,
      userId: createdUser.id,
      timezone: createdUser.facility.timezone,
      moduleFlags: createdUser.facility.moduleFlags
    });
  }

  return createdUser;
}

export async function requireUser() {
  const dbUser = await ensureUserAndFacility();
  return dbUser;
}

export async function getOptionalUser() {
  const { userId } = await auth();
  if (!userId) return null;
  return prisma.user.findUnique({ where: { clerkUserId: userId }, include: { facility: true } });
}

export async function requireFacilityContext() {
  const user = await requireUser();
  const timeZone = getRequestTimeZone(user.facility.timezone);
  return {
    user,
    facilityId: user.facilityId,
    role: user.role,
    facility: user.facility,
    timeZone
  };
}
