"use client";

import Link from "next/link";
import { Bell, ChevronRight } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger
} from "@/components/ui/dropdown-menu";

type NotificationPreview = {
  id: string;
  title: string;
  body: string;
  actionUrl: string | null;
  kind: string;
  createdAt: string;
  readAt: string | null;
};

function formatDate(value: string) {
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return "";
  return new Intl.DateTimeFormat(undefined, {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit"
  }).format(parsed);
}

export function NotificationBellDropdown({
  unreadCount,
  notifications
}: {
  unreadCount: number;
  notifications: NotificationPreview[];
}) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          className="relative inline-flex h-9 w-9 items-center justify-center rounded-xl border border-white/70 bg-white/80 text-foreground transition hover:bg-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          aria-label="Open notifications"
        >
          <Bell className="h-4 w-4" />
          {unreadCount > 0 ? (
            <span className="absolute -right-1.5 -top-1.5 inline-flex min-h-5 min-w-5 items-center justify-center rounded-full bg-actifyBlue px-1 text-[10px] font-semibold text-white">
              {unreadCount > 99 ? "99+" : unreadCount}
            </span>
          ) : null}
        </button>
      </DropdownMenuTrigger>

      <DropdownMenuContent align="end" className="w-[380px] border-white/35 bg-white/92 p-0 backdrop-blur-md">
        <div className="flex items-center justify-between px-3 py-2.5">
          <DropdownMenuLabel className="p-0 text-sm">Notifications</DropdownMenuLabel>
          <Badge variant="outline" className="border-white/50 bg-white/70 text-xs">
            {unreadCount} unread
          </Badge>
        </div>
        <DropdownMenuSeparator />

        {notifications.length === 0 ? (
          <div className="px-3 py-6 text-center text-sm text-muted-foreground">
            No notifications yet.
          </div>
        ) : (
          <div className="max-h-[380px] overflow-auto p-1.5">
            {notifications.slice(0, 10).map((notification) => (
              <DropdownMenuItem
                key={notification.id}
                asChild
                className="mb-1 h-auto items-start rounded-lg border border-transparent p-2.5 focus:bg-white/85"
              >
                <Link href={notification.actionUrl || "/app/notifications"} className="block space-y-1">
                  <div className="flex items-start justify-between gap-2">
                    <p className="line-clamp-1 text-sm font-semibold leading-5">{notification.title}</p>
                    {!notification.readAt ? (
                      <span className="mt-1 inline-flex h-2 w-2 shrink-0 rounded-full bg-actifyBlue" aria-hidden="true" />
                    ) : null}
                  </div>
                  <p className="line-clamp-2 text-xs text-muted-foreground">{notification.body}</p>
                  <p className="text-[11px] text-muted-foreground/80">{formatDate(notification.createdAt)}</p>
                </Link>
              </DropdownMenuItem>
            ))}
          </div>
        )}

        <DropdownMenuSeparator />
        <DropdownMenuItem asChild className="m-1 rounded-lg px-2.5 py-2 text-sm font-medium">
          <Link href="/app/notifications" className="flex w-full items-center justify-between">
            Open Notifications Center
            <ChevronRight className="h-4 w-4" />
          </Link>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
