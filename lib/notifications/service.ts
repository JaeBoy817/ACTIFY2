import { Prisma, ResidentStatus, type AppNotification } from "@prisma/client";

import { prisma } from "@/lib/prisma";
import { asNotificationDefaults, parseUserSettingsRow } from "@/lib/settings/defaults";
import { endOfZonedDay, formatInTimeZone, startOfZonedDay, startOfZonedWeek, zonedDateKey } from "@/lib/timezone";

type NotificationTriggerKey =
  | "oneToOneDueToday"
  | "newAdmitAdded"
  | "dischargePendingDocs"
  | "lowInventory"
  | "carePlanReviewDue"
  | "noteNeedsCosign";

type EnsureNotificationFeedInput = {
  userId: string;
  facilityId: string;
  timezone: string;
  now?: Date;
};

function parseTimeToMinutes(value: string) {
  const match = value.trim().match(/^(\d{2}):(\d{2})$/);
  if (!match) return 0;
  const hours = Number(match[1]);
  const minutes = Number(match[2]);
  if (!Number.isFinite(hours) || !Number.isFinite(minutes)) return 0;
  return Math.max(0, Math.min(23, hours)) * 60 + Math.max(0, Math.min(59, minutes));
}

function getLocalMinutes(date: Date, timezone: string) {
  const formatted = formatInTimeZone(date, timezone, {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false
  });
  return parseTimeToMinutes(formatted);
}

function getWeekdayToken(date: Date, timezone: string): "SUN" | "MON" | "TUE" | "WED" | "THU" | "FRI" | "SAT" {
  const short = formatInTimeZone(date, timezone, {
    weekday: "short"
  })
    .slice(0, 3)
    .toUpperCase();
  if (short === "MON" || short === "TUE" || short === "WED" || short === "THU" || short === "FRI" || short === "SAT") {
    return short;
  }
  return "SUN";
}

function isWithinQuietHours(nowMinutes: number, quietStart: string, quietEnd: string) {
  const start = parseTimeToMinutes(quietStart);
  const end = parseTimeToMinutes(quietEnd);
  if (start === end) return false;

  if (start < end) {
    return nowMinutes >= start && nowMinutes < end;
  }

  return nowMinutes >= start || nowMinutes < end;
}

function isTriggerEnabled(
  triggerKey: NotificationTriggerKey,
  baseSettings: ReturnType<typeof asNotificationDefaults>,
  userOverrides: Partial<Record<NotificationTriggerKey, boolean>>
) {
  const baseValue = baseSettings.triggers[triggerKey];
  const override = userOverrides[triggerKey];
  return typeof override === "boolean" ? override : baseValue;
}

function isMissingTableError(error: unknown, tableName: string) {
  if (!(error instanceof Prisma.PrismaClientKnownRequestError)) return false;
  if (error.code !== "P2021") return false;
  const metaTable =
    typeof error.meta?.table === "string"
      ? error.meta.table
      : typeof error.meta?.modelName === "string"
        ? error.meta.modelName
        : "";
  return metaTable.toLowerCase().includes(tableName.toLowerCase());
}

async function createNotificationIfMissing(params: {
  dedupeKey: string;
  userId: string;
  facilityId: string;
  kind: string;
  title: string;
  body: string;
  actionUrl?: string;
  payload?: Record<string, unknown>;
}) {
  await prisma.appNotification.upsert({
    where: { dedupeKey: params.dedupeKey },
    update: {},
    create: {
      dedupeKey: params.dedupeKey,
      userId: params.userId,
      facilityId: params.facilityId,
      kind: params.kind,
      title: params.title,
      body: params.body,
      actionUrl: params.actionUrl ?? null,
      payload: params.payload as Prisma.InputJsonValue | undefined
    }
  });
}

function isResidentActiveForNotifications(status: ResidentStatus) {
  return status !== ResidentStatus.DISCHARGED && status !== ResidentStatus.TRANSFERRED && status !== ResidentStatus.DECEASED;
}

async function getBirthdayCountForDate(args: { facilityId: string; timezone: string; now: Date }) {
  const residents = await prisma.resident.findMany({
    where: {
      facilityId: args.facilityId,
      birthDate: { not: null }
    },
    select: {
      birthDate: true,
      status: true
    }
  });

  const todayMonthDay = formatInTimeZone(args.now, args.timezone, { month: "2-digit", day: "2-digit" });

  return residents.filter((resident) => {
    if (!resident.birthDate || !isResidentActiveForNotifications(resident.status)) return false;
    const residentMonthDay = formatInTimeZone(resident.birthDate, args.timezone, { month: "2-digit", day: "2-digit" });
    return residentMonthDay === todayMonthDay;
  }).length;
}

export async function ensureUserNotificationFeed(input: EnsureNotificationFeedInput) {
  const now = input.now ?? new Date();
  const [facilitySettingsRow, userSettings] = await Promise.all([
    prisma.facilitySettings.findUnique({
      where: { facilityId: input.facilityId },
      select: {
        notificationDefaultsJson: true,
        timezone: true
      }
    }),
    prisma.userSettings.findUnique({
      where: { userId: input.userId }
    })
  ]);

  const timezone = facilitySettingsRow?.timezone ?? input.timezone;
  const notificationSettings = asNotificationDefaults(facilitySettingsRow?.notificationDefaultsJson);
  const userOverrides: Partial<Record<NotificationTriggerKey, boolean>> = userSettings
    ? parseUserSettingsRow(userSettings).personal.notifications.overrides
    : {};
  if (!notificationSettings.channels.inApp) {
    return;
  }

  const nowMinutes = getLocalMinutes(now, timezone);
  const dateKey = zonedDateKey(now, timezone);
  const weekKey = zonedDateKey(startOfZonedWeek(now, timezone, 1), timezone);
  const dayStart = startOfZonedDay(now, timezone);
  const dayEnd = endOfZonedDay(now, timezone);

  const [todaysActivities, pendingOneToOneQueue, inventoryLevels, prizeLevels, carePlanReviewsDue, birthdaysToday] =
    await Promise.all([
      prisma.activityInstance.count({
        where: {
          facilityId: input.facilityId,
          startAt: {
            gte: dayStart,
            lte: dayEnd
          }
        }
      }),
      prisma.dailyOneOnOneQueue.count({
        where: {
          facilityId: input.facilityId,
          queueDateKey: dateKey,
          completedAt: null,
          skippedAt: null
        }
      }),
      prisma.inventoryItem.findMany({
        where: {
          facilityId: input.facilityId
        },
        select: {
          onHand: true,
          reorderAt: true
        }
      }),
      prisma.prizeItem.findMany({
        where: {
          facilityId: input.facilityId
        },
        select: {
          onHand: true,
          reorderAt: true
        }
      }),
      (async () => {
        try {
          return await prisma.carePlan.count({
            where: {
              resident: {
                facilityId: input.facilityId
              },
              status: "ACTIVE",
              nextReviewDate: {
                lte: dayEnd
              }
            }
          });
        } catch (error) {
          // Keep notifications non-blocking during rollout before all schema changes are pushed.
          if (isMissingTableError(error, "CarePlan")) {
            return 0;
          }
          throw error;
        }
      })(),
      getBirthdayCountForDate({
        facilityId: input.facilityId,
        timezone,
        now
      })
    ]);

  const lowInventoryCount = inventoryLevels.filter((item) => item.onHand < item.reorderAt).length;
  const lowPrizeCount = prizeLevels.filter((item) => item.onHand < item.reorderAt).length;

  const quietHoursEnabled = notificationSettings.quietHours.enabled;
  const inQuietHours =
    quietHoursEnabled &&
    isWithinQuietHours(nowMinutes, notificationSettings.quietHours.start, notificationSettings.quietHours.end);

  const digestTargetMinutes = parseTimeToMinutes(notificationSettings.digest.time);
  const weekdayToken = getWeekdayToken(now, timezone);

  if (notificationSettings.digest.mode === "DAILY" && nowMinutes >= digestTargetMinutes) {
    await createNotificationIfMissing({
      dedupeKey: `digest:daily:${input.userId}:${dateKey}`,
      userId: input.userId,
      facilityId: input.facilityId,
      kind: "DIGEST_DAILY",
      title: "Daily Digest",
      body: `${todaysActivities} activities scheduled today • ${pendingOneToOneQueue} pending 1:1 queue items • ${birthdaysToday} birthday${birthdaysToday === 1 ? "" : "s"} today.`,
      actionUrl: "/app/notifications",
      payload: {
        todaysActivities,
        pendingOneToOneQueue,
        birthdaysToday,
        timezone,
        dateKey
      }
    });
  }

  if (
    notificationSettings.digest.mode === "WEEKLY" &&
    notificationSettings.weeklyDigestDay === weekdayToken &&
    nowMinutes >= digestTargetMinutes
  ) {
    await createNotificationIfMissing({
      dedupeKey: `digest:weekly:${input.userId}:${weekKey}`,
      userId: input.userId,
      facilityId: input.facilityId,
      kind: "DIGEST_WEEKLY",
      title: "Weekly Digest",
      body: `${todaysActivities} activities on today’s schedule • ${pendingOneToOneQueue} 1:1 items pending • ${birthdaysToday} birthdays today.`,
      actionUrl: "/app/notifications",
      payload: {
        todaysActivities,
        pendingOneToOneQueue,
        birthdaysToday,
        timezone,
        weekKey
      }
    });
  }

  if (inQuietHours) {
    return;
  }

  if (birthdaysToday > 0) {
    await createNotificationIfMissing({
      dedupeKey: `birthday:${input.userId}:${dateKey}`,
      userId: input.userId,
      facilityId: input.facilityId,
      kind: "BIRTHDAYS_TODAY",
      title: "Resident Birthdays Today",
      body: `${birthdaysToday} resident birthday${birthdaysToday === 1 ? "" : "s"} today.`,
      actionUrl: "/app/residents",
      payload: {
        birthdaysToday,
        timezone,
        dateKey
      }
    });
  }

  if (isTriggerEnabled("oneToOneDueToday", notificationSettings, userOverrides) && pendingOneToOneQueue > 0) {
    await createNotificationIfMissing({
      dedupeKey: `trigger:one-to-one:${input.userId}:${dateKey}`,
      userId: input.userId,
      facilityId: input.facilityId,
      kind: "ONE_TO_ONE_DUE",
      title: "1:1 Queue Due Today",
      body: `${pendingOneToOneQueue} residents are still pending in today’s 1:1 queue.`,
      actionUrl: "/app",
      payload: {
        pendingOneToOneQueue
      }
    });
  }

  const lowStockCount = lowInventoryCount + lowPrizeCount;
  if (isTriggerEnabled("lowInventory", notificationSettings, userOverrides) && lowStockCount > 0) {
    await createNotificationIfMissing({
      dedupeKey: `trigger:low-stock:${input.userId}:${dateKey}`,
      userId: input.userId,
      facilityId: input.facilityId,
      kind: "LOW_STOCK",
      title: "Low Stock Alert",
      body: `${lowStockCount} inventory/prize cart item${lowStockCount === 1 ? "" : "s"} are below reorder threshold.`,
      actionUrl: "/app/dashboard/budget-stock",
      payload: {
        lowInventoryCount,
        lowPrizeCount
      }
    });
  }

  if (isTriggerEnabled("carePlanReviewDue", notificationSettings, userOverrides) && carePlanReviewsDue > 0) {
    await createNotificationIfMissing({
      dedupeKey: `trigger:care-plan-review:${input.userId}:${dateKey}`,
      userId: input.userId,
      facilityId: input.facilityId,
      kind: "CARE_PLAN_REVIEW_DUE",
      title: "Care Plan Reviews Due",
      body: `${carePlanReviewsDue} care plan review${carePlanReviewsDue === 1 ? "" : "s"} due now.`,
      actionUrl: "/app/care-plans",
      payload: {
        carePlanReviewsDue
      }
    });
  }
}

export async function listUserNotifications(userId: string, limit = 30) {
  return prisma.appNotification.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
    take: limit
  });
}

export async function getUnreadNotificationCount(userId: string) {
  return prisma.appNotification.count({
    where: {
      userId,
      readAt: null
    }
  });
}

export async function markNotificationRead(args: { userId: string; notificationId: string }) {
  return prisma.appNotification.updateMany({
    where: {
      id: args.notificationId,
      userId: args.userId,
      readAt: null
    },
    data: {
      readAt: new Date()
    }
  });
}

export async function markAllNotificationsRead(userId: string) {
  return prisma.appNotification.updateMany({
    where: {
      userId,
      readAt: null
    },
    data: {
      readAt: new Date()
    }
  });
}

export async function clearAllNotifications(userId: string) {
  return prisma.appNotification.deleteMany({
    where: {
      userId
    }
  });
}

export async function clearReadNotifications(userId: string) {
  return prisma.appNotification.deleteMany({
    where: {
      userId,
      readAt: {
        not: null
      }
    }
  });
}

export type UserNotification = Pick<
  AppNotification,
  "id" | "kind" | "title" | "body" | "actionUrl" | "createdAt" | "readAt"
>;
