import { auth } from "@clerk/nextjs/server";
import { z } from "zod";

import { prisma } from "@/lib/prisma";
import {
  clearAllNotifications,
  clearReadNotifications,
  getUnreadNotificationCount,
  markAllNotificationsRead,
  markNotificationRead
} from "@/lib/notifications/service";

const patchPayloadSchema = z.discriminatedUnion("action", [
  z.object({
    action: z.literal("mark-all-read")
  }),
  z.object({
    action: z.literal("mark-read"),
    notificationId: z.string().trim().min(1)
  })
]);

const deletePayloadSchema = z.object({
  action: z.enum(["clear-all", "clear-read"]).default("clear-all")
});

type ApiUser = {
  id: string;
};

async function requireNotificationsApiUser(): Promise<ApiUser> {
  const { userId } = await auth();
  if (!userId) {
    throw new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401 });
  }

  const user = await prisma.user.findUnique({
    where: {
      clerkUserId: userId
    },
    select: {
      id: true
    }
  });

  if (!user) {
    throw new Response(JSON.stringify({ error: "User not found" }), { status: 404 });
  }

  return user;
}

async function getCounts(userId: string) {
  const [unreadCount, totalCount] = await Promise.all([
    getUnreadNotificationCount(userId),
    prisma.appNotification.count({
      where: {
        userId
      }
    })
  ]);

  return {
    unreadCount,
    totalCount
  };
}

export async function PATCH(request: Request) {
  try {
    const user = await requireNotificationsApiUser();
    const payload = await request.json().catch(() => null);
    const parsed = patchPayloadSchema.safeParse(payload);

    if (!parsed.success) {
      return Response.json(
        {
          error: "Invalid request payload.",
          details: parsed.error.flatten()
        },
        { status: 400 }
      );
    }

    if (parsed.data.action === "mark-all-read") {
      await markAllNotificationsRead(user.id);
    } else {
      await markNotificationRead({
        userId: user.id,
        notificationId: parsed.data.notificationId
      });
    }

    const counts = await getCounts(user.id);
    return Response.json({
      ok: true,
      ...counts
    });
  } catch (error) {
    if (error instanceof Response) {
      return error;
    }

    const message = error instanceof Error ? error.message : "Unexpected notifications error.";
    return Response.json({ error: message }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    const user = await requireNotificationsApiUser();
    const payload = await request.json().catch(() => ({}));
    const parsed = deletePayloadSchema.safeParse(payload);

    if (!parsed.success) {
      return Response.json(
        {
          error: "Invalid request payload.",
          details: parsed.error.flatten()
        },
        { status: 400 }
      );
    }

    if (parsed.data.action === "clear-read") {
      await clearReadNotifications(user.id);
    } else {
      await clearAllNotifications(user.id);
    }

    const counts = await getCounts(user.id);
    return Response.json({
      ok: true,
      ...counts
    });
  } catch (error) {
    if (error instanceof Response) {
      return error;
    }

    const message = error instanceof Error ? error.message : "Unexpected notifications error.";
    return Response.json({ error: message }, { status: 500 });
  }
}
