"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useTransition } from "react";
import { CalendarCheck2, History, ListTodo, NotebookText } from "lucide-react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export type MeetingDetailTab = "minutes" | "actions" | "attendance" | "history";

const TAB_ITEMS: Array<{ key: MeetingDetailTab; label: string; icon: typeof NotebookText }> = [
  { key: "minutes", label: "Minutes", icon: NotebookText },
  { key: "actions", label: "Action Items", icon: ListTodo },
  { key: "attendance", label: "Attendance", icon: CalendarCheck2 },
  { key: "history", label: "History", icon: History }
];

export function MeetingTabs({
  currentTab
}: {
  currentTab: MeetingDetailTab;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();

  return (
    <div className="flex flex-wrap gap-2 rounded-xl border border-white/30 bg-white/55 p-1.5">
      {TAB_ITEMS.map((item) => {
        const Icon = item.icon;
        const active = item.key === currentTab;
        return (
          <Button
            key={item.key}
            type="button"
            size="sm"
            variant={active ? "default" : "ghost"}
            disabled={isPending}
            onClick={() => {
              startTransition(() => {
                const next = new URLSearchParams(searchParams.toString());
                next.set("tab", item.key);
                router.replace(`${pathname}?${next.toString()}`, { scroll: false });
              });
            }}
            className={cn(
              "rounded-lg border px-3",
              active
                ? "border-actifyBlue/45 bg-actifyBlue text-white shadow-md shadow-actifyBlue/25"
                : "border-transparent bg-white/60 text-foreground hover:border-white/35 hover:bg-white/85"
            )}
          >
            <Icon className={cn("mr-1.5 h-4 w-4", active ? "text-white" : "text-actifyBlue")} />
            {item.label}
          </Button>
        );
      })}
    </div>
  );
}
