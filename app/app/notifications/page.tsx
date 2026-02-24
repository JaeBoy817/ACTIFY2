import Link from "next/link";
import { revalidatePath } from "next/cache";
import { Bell, CheckCheck, Trash2 } from "lucide-react";

import { GlassButton } from "@/components/glass/GlassButton";
import { GlassCard } from "@/components/glass/GlassCard";
import { GlassPanel } from "@/components/glass/GlassPanel";
import { Badge } from "@/components/ui/badge";
import { requireFacilityContext } from "@/lib/auth";
import {
  clearAllNotifications,
  ensureUserNotificationFeed,
  listUserNotifications,
  markAllNotificationsRead,
  markNotificationRead
} from "@/lib/notifications/service";
import { formatInTimeZone } from "@/lib/timezone";

export default async function NotificationsPage() {
  const context = await requireFacilityContext();

  await ensureUserNotificationFeed({
    userId: context.user.id,
    facilityId: context.facilityId,
    timezone: context.timeZone
  });

  const notifications = await listUserNotifications(context.user.id, 60);

  async function onMarkAllRead() {
    "use server";

    const scoped = await requireFacilityContext();
    await markAllNotificationsRead(scoped.user.id);
    revalidatePath("/app/notifications");
    revalidatePath("/app");
  }

  async function onClearAll() {
    "use server";

    const scoped = await requireFacilityContext();
    await clearAllNotifications(scoped.user.id);
    revalidatePath("/app/notifications");
    revalidatePath("/app");
  }

  async function onMarkRead(formData: FormData) {
    "use server";

    const scoped = await requireFacilityContext();
    const notificationId = String(formData.get("notificationId") ?? "");
    if (!notificationId) return;

    await markNotificationRead({
      userId: scoped.user.id,
      notificationId
    });

    revalidatePath("/app/notifications");
    revalidatePath("/app");
  }

  return (
    <div className="space-y-5">
      <GlassPanel variant="warm" className="space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="font-[var(--font-display)] text-3xl text-foreground">Notifications</h1>
            <p className="text-sm text-foreground/70">
              Daily digest and live operational alerts based on your settings.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <form action={onMarkAllRead}>
              <GlassButton type="submit" size="sm" variant="dense">
                <CheckCheck className="mr-1.5 h-4 w-4" />
                Mark all read
              </GlassButton>
            </form>
            <form action={onClearAll}>
              <GlassButton type="submit" size="sm" variant="dense" className="bg-white/65">
                <Trash2 className="mr-1.5 h-4 w-4" />
                Clear all
              </GlassButton>
            </form>
          </div>
        </div>
      </GlassPanel>

      <div className="space-y-3">
        {notifications.length === 0 ? (
          <GlassCard className="p-6 text-sm text-foreground/70">
            No notifications yet. Once digest time is reached, updates will appear here.
          </GlassCard>
        ) : (
          notifications.map((notification) => (
            <GlassCard key={notification.id} className="space-y-3 p-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="space-y-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="text-base font-semibold text-foreground">{notification.title}</p>
                    <Badge variant={notification.readAt ? "outline" : "secondary"}>
                      {notification.readAt ? "Read" : "Unread"}
                    </Badge>
                    <Badge variant="outline">{notification.kind.replaceAll("_", " ")}</Badge>
                  </div>
                  <p className="text-sm text-foreground/75">{notification.body}</p>
                  <p className="text-xs text-foreground/60">
                    {formatInTimeZone(notification.createdAt, context.timeZone, {
                      month: "short",
                      day: "numeric",
                      hour: "numeric",
                      minute: "2-digit"
                    })}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  {notification.actionUrl ? (
                    <GlassButton asChild size="sm" variant="dense">
                      <Link href={notification.actionUrl}>Open</Link>
                    </GlassButton>
                  ) : null}
                  {!notification.readAt ? (
                    <form action={onMarkRead}>
                      <input type="hidden" name="notificationId" value={notification.id} />
                      <GlassButton type="submit" size="sm" variant="dense">
                        <Bell className="mr-1.5 h-4 w-4" />
                        Mark read
                      </GlassButton>
                    </form>
                  ) : null}
                </div>
              </div>
            </GlassCard>
          ))
        )}
      </div>
    </div>
  );
}
