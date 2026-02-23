"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { Bell, CheckCheck, ChevronRight, Loader2, Trash2 } from "lucide-react";

import { useToast } from "@/lib/use-toast";
import { cachedFetchJson, invalidateClientCache } from "@/lib/perf/client-cache";
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

type NotificationsActionResponse = {
  ok: boolean;
  unreadCount: number;
  totalCount: number;
};

type NotificationsListResponse = {
  unreadCount: number;
  notifications: NotificationPreview[];
};

async function runNotificationAction(method: "PATCH" | "DELETE", payload: Record<string, string>) {
  const response = await fetch("/api/notifications", {
    method,
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify(payload)
  });

  const json = (await response.json().catch(() => null)) as NotificationsActionResponse | { error?: string } | null;
  if (!response.ok) {
    throw new Error((json && "error" in json && json.error) || "Notification update failed.");
  }

  return json as NotificationsActionResponse;
}

export function NotificationBellDropdown({
  viewerId,
  unreadCount,
  notifications = []
}: {
  viewerId?: string;
  unreadCount: number;
  notifications?: NotificationPreview[];
}) {
  const { toast } = useToast();
  const [items, setItems] = useState<NotificationPreview[]>(notifications);
  const [unread, setUnread] = useState(unreadCount);
  const [menuOpen, setMenuOpen] = useState(false);
  const [loadingItems, setLoadingItems] = useState(false);
  const [hasLoadedItems, setHasLoadedItems] = useState(notifications.length > 0);
  const [markingAll, setMarkingAll] = useState(false);
  const [clearingAll, setClearingAll] = useState(false);
  const [pendingIds, setPendingIds] = useState<Record<string, boolean>>({});

  const loadNotifications = useCallback(async () => {
    if (loadingItems) return;
    setLoadingItems(true);

    try {
      const data = await cachedFetchJson<NotificationsListResponse>(
        `notifications:${viewerId ?? "unknown"}:dropdown:list`,
        "/api/notifications?limit=10",
        { ttlMs: 10_000 }
      );
      setItems(data.notifications);
      setUnread(data.unreadCount);
      setHasLoadedItems(true);
    } catch (error) {
      toast({
        title: "Could not load notifications",
        description: error instanceof Error ? error.message : "Please try again.",
        variant: "destructive"
      });
    } finally {
      setLoadingItems(false);
    }
  }, [loadingItems, toast, viewerId]);

  useEffect(() => {
    if (!menuOpen || hasLoadedItems) return;
    void loadNotifications();
  }, [hasLoadedItems, loadNotifications, menuOpen]);

  async function handleMarkRead(notificationId: string) {
    const target = items.find((item) => item.id === notificationId);
    if (!target || target.readAt) return;

    const previousItems = items;
    const previousUnread = unread;
    const readAtIso = new Date().toISOString();

    setPendingIds((current) => ({ ...current, [notificationId]: true }));
    setItems((current) =>
      current.map((item) =>
        item.id === notificationId
          ? {
              ...item,
              readAt: readAtIso
            }
          : item
      )
    );
    setUnread((current) => Math.max(0, current - 1));

    try {
      const result = await runNotificationAction("PATCH", {
        action: "mark-read",
        notificationId
      });
      setUnread(result.unreadCount);
      invalidateClientCache("notifications:");
    } catch (error) {
      setItems(previousItems);
      setUnread(previousUnread);
      toast({
        title: "Could not mark notification read",
        description: error instanceof Error ? error.message : "Please try again.",
        variant: "destructive"
      });
    } finally {
      setPendingIds((current) => {
        const next = { ...current };
        delete next[notificationId];
        return next;
      });
    }
  }

  async function handleMarkAllRead() {
    if (markingAll || clearingAll || unread === 0) return;

    const previousItems = items;
    const previousUnread = unread;
    const readAtIso = new Date().toISOString();

    setMarkingAll(true);
    setItems((current) => current.map((item) => ({ ...item, readAt: item.readAt ?? readAtIso })));
    setUnread(0);

    try {
      const result = await runNotificationAction("PATCH", {
        action: "mark-all-read"
      });
      setUnread(result.unreadCount);
      invalidateClientCache("notifications:");
    } catch (error) {
      setItems(previousItems);
      setUnread(previousUnread);
      toast({
        title: "Could not mark notifications read",
        description: error instanceof Error ? error.message : "Please try again.",
        variant: "destructive"
      });
    } finally {
      setMarkingAll(false);
    }
  }

  async function handleClearAll() {
    if (clearingAll || items.length === 0) return;

    const previousItems = items;
    const previousUnread = unread;

    setClearingAll(true);
    setItems([]);
    setUnread(0);

    try {
      const result = await runNotificationAction("DELETE", {
        action: "clear-all"
      });
      setUnread(result.unreadCount);
      invalidateClientCache("notifications:");
      toast({
        title: "Notifications cleared"
      });
    } catch (error) {
      setItems(previousItems);
      setUnread(previousUnread);
      toast({
        title: "Could not clear notifications",
        description: error instanceof Error ? error.message : "Please try again.",
        variant: "destructive"
      });
    } finally {
      setClearingAll(false);
    }
  }

  return (
    <DropdownMenu
      onOpenChange={(open) => {
        setMenuOpen(open);
      }}
    >
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          className="relative inline-flex h-9 w-9 items-center justify-center rounded-xl border border-white/70 bg-white/80 text-foreground transition hover:bg-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          aria-label="Open notifications"
        >
          <Bell className="h-4 w-4" />
          {unread > 0 ? (
            <span className="absolute -right-1.5 -top-1.5 inline-flex min-h-5 min-w-5 items-center justify-center rounded-full bg-actifyBlue px-1 text-[10px] font-semibold text-white">
              {unread > 99 ? "99+" : unread}
            </span>
          ) : null}
        </button>
      </DropdownMenuTrigger>

      <DropdownMenuContent align="end" className="w-[380px] border-white/35 bg-white/92 p-0 backdrop-blur-md">
        <div className="flex items-center justify-between px-3 py-2.5">
          <DropdownMenuLabel className="p-0 text-sm">Notifications</DropdownMenuLabel>
          <div className="flex items-center gap-1.5">
            {loadingItems ? <Loader2 className="h-3.5 w-3.5 animate-spin text-muted-foreground" /> : null}
            <Badge variant="outline" className="border-white/50 bg-white/70 text-xs">
              {unread} unread
            </Badge>
            <button
              type="button"
              className="inline-flex items-center gap-1 rounded-lg border border-white/50 bg-white/70 px-2 py-1 text-[11px] font-medium text-foreground/85 transition hover:bg-white/85 disabled:cursor-not-allowed disabled:opacity-50"
              onClick={() => {
                void handleMarkAllRead();
              }}
              disabled={markingAll || clearingAll || unread === 0}
              aria-label="Mark all notifications as read"
            >
              {markingAll ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <CheckCheck className="h-3.5 w-3.5" />}
              Read all
            </button>
            <button
              type="button"
              className="inline-flex items-center gap-1 rounded-lg border border-white/50 bg-white/70 px-2 py-1 text-[11px] font-medium text-foreground/85 transition hover:bg-white/85 disabled:cursor-not-allowed disabled:opacity-50"
              onClick={() => {
                void handleClearAll();
              }}
              disabled={clearingAll || items.length === 0}
              aria-label="Clear all notifications"
            >
              {clearingAll ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Trash2 className="h-3.5 w-3.5" />}
              Clear
            </button>
          </div>
        </div>
        <DropdownMenuSeparator />

        {loadingItems && items.length === 0 ? (
          <div className="px-3 py-6 text-center text-sm text-muted-foreground">
            Loading notifications...
          </div>
        ) : items.length === 0 ? (
          <div className="px-3 py-6 text-center text-sm text-muted-foreground">
            No notifications yet.
          </div>
        ) : (
          <div className="max-h-[380px] overflow-auto p-1.5">
            {items.slice(0, 10).map((notification) => (
              <DropdownMenuItem key={notification.id} className="mb-1 h-auto items-start rounded-lg border border-transparent p-0 focus:bg-white/85">
                <div className="flex w-full items-start gap-2 p-2.5">
                  <Link
                    href={notification.actionUrl || "/app/notifications"}
                    className="block min-w-0 flex-1 space-y-1"
                    onClick={() => {
                      if (!notification.readAt) {
                        void handleMarkRead(notification.id);
                      }
                    }}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <p className="line-clamp-1 text-sm font-semibold leading-5">{notification.title}</p>
                      {!notification.readAt ? (
                        <span className="mt-1 inline-flex h-2 w-2 shrink-0 rounded-full bg-actifyBlue" aria-hidden="true" />
                      ) : null}
                    </div>
                    <p className="line-clamp-2 text-xs text-muted-foreground">{notification.body}</p>
                    <p className="text-[11px] text-muted-foreground/80">{formatDate(notification.createdAt)}</p>
                  </Link>
                  {!notification.readAt ? (
                    <button
                      type="button"
                      className="mt-0.5 inline-flex shrink-0 items-center gap-1 rounded-md border border-white/55 bg-white/80 px-2 py-1 text-[11px] font-medium text-foreground/85 transition hover:bg-white"
                      onClick={(event) => {
                        event.preventDefault();
                        event.stopPropagation();
                        void handleMarkRead(notification.id);
                      }}
                      disabled={Boolean(pendingIds[notification.id])}
                      aria-label={`Mark ${notification.title} as read`}
                    >
                      {pendingIds[notification.id] ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : "Read"}
                    </button>
                  ) : null}
                </div>
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
