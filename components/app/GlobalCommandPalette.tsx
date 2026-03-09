"use client";

import { useMemo, useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Command, Search } from "lucide-react";

import { MODULE_REGISTRY } from "@/lib/moduleRegistry";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type QuickAction = {
  id: string;
  title: string;
  href: string;
  subtitle: string;
};

const BASE_ACTIONS: QuickAction[] = [
  {
    id: "new-note",
    title: "New Note",
    href: "/app/notes/new?type=general",
    subtitle: "Start documentation quickly"
  },
  {
    id: "new-1to1",
    title: "New 1:1 Note",
    href: "/app/notes/new?type=1on1",
    subtitle: "Resident-focused note flow"
  },
  {
    id: "attendance-quick",
    title: "Quick Take Attendance",
    href: "/app/attendance",
    subtitle: "Mark attendance in 3 steps"
  },
  {
    id: "calendar-new",
    title: "Schedule Activity",
    href: "/app/calendar?view=week",
    subtitle: "Open calendar workspace"
  }
];

export function GlobalCommandPalette() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        setOpen((current) => !current);
      }
    };

    const onOpenPalette = () => setOpen(true);
    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("actify:open-command-palette", onOpenPalette);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("actify:open-command-palette", onOpenPalette);
    };
  }, []);

  const items = useMemo(() => {
    const moduleItems: QuickAction[] = MODULE_REGISTRY.map((module) => ({
      id: `module-${module.key}`,
      title: module.title,
      href: module.href,
      subtitle: module.description
    }));
    return [...BASE_ACTIONS, ...moduleItems];
  }, []);

  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase();
    if (!needle) return items.slice(0, 14);
    return items
      .filter((item) => `${item.title} ${item.subtitle}`.toLowerCase().includes(needle))
      .slice(0, 18);
  }, [items, query]);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="border-white/35 bg-white/92 backdrop-blur-md sm:max-w-xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <span className="inline-flex h-8 w-8 items-center justify-center rounded-xl border border-white/35 bg-white/80">
              <Command className="h-4 w-4 text-actifyBlue" />
            </span>
            Command Palette
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-3">
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-foreground/55" />
            <Input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Jump to module, note, or workflow"
              className="bg-white/80 pl-9"
            />
          </div>

          <div className="max-h-[52vh] space-y-1 overflow-auto pr-1">
            {filtered.length === 0 ? (
              <p className="rounded-xl border border-dashed border-white/35 bg-white/70 px-3 py-4 text-sm text-foreground/60">
                No matching actions.
              </p>
            ) : (
              filtered.map((item) => (
                <Button
                  key={item.id}
                  type="button"
                  variant="ghost"
                  className={cn(
                    "h-auto w-full justify-start rounded-xl border border-transparent px-3 py-2.5 text-left",
                    "hover:border-white/35 hover:bg-white/78"
                  )}
                  onClick={() => {
                    setOpen(false);
                    router.push(item.href);
                  }}
                >
                  <div>
                    <p className="text-sm font-semibold text-foreground">{item.title}</p>
                    <p className="text-xs text-foreground/65">{item.subtitle}</p>
                  </div>
                </Button>
              ))
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
