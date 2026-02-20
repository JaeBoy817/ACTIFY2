"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useTransition } from "react";
import { BarChart3, ClipboardList, FileText, ListTodo } from "lucide-react";

import { Button } from "@/components/ui/button";
import type { ResidentCouncilView } from "@/lib/resident-council/types";
import { cn } from "@/lib/utils";

const tabItems: Array<{
  key: ResidentCouncilView;
  label: string;
  icon: typeof ClipboardList;
}> = [
  { key: "meetings", label: "Meetings", icon: ClipboardList },
  { key: "actions", label: "Action Items", icon: ListTodo },
  { key: "topics", label: "Topics Library", icon: FileText },
  { key: "reports", label: "Reports & Export", icon: BarChart3 }
];

export function GlassTabs({ currentView }: { currentView: ResidentCouncilView }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();

  function setView(view: ResidentCouncilView) {
    if (view === currentView) return;
    startTransition(() => {
      const params = new URLSearchParams(searchParams.toString());
      params.set("view", view);
      if (view !== "meetings") {
        params.delete("meetingId");
      }
      router.replace(`${pathname}?${params.toString()}`, { scroll: false });
    });
  }

  return (
    <div className="flex w-full flex-wrap gap-2 rounded-2xl border border-white/20 bg-white/60 p-1.5 shadow-xl shadow-black/10">
      {tabItems.map((item) => {
        const Icon = item.icon;
        const active = currentView === item.key;
        return (
          <Button
            key={item.key}
            type="button"
            variant={active ? "default" : "ghost"}
            size="sm"
            disabled={isPending}
            onClick={() => setView(item.key)}
            className={cn(
              "rounded-xl border px-3.5 py-2 shadow-lg transition",
              active
                ? "border-actifyBlue/40 bg-actifyBlue text-white shadow-actifyBlue/30"
                : "border-transparent bg-white/70 text-foreground hover:border-white/40 hover:bg-white/90"
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
