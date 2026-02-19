"use client";

import Link from "next/link";
import { ClipboardPlus, Files, LayoutTemplate } from "lucide-react";
import { usePathname } from "next/navigation";

import { cn } from "@/lib/utils";

const items = [
  { href: "/app/notes", label: "Notes List", icon: Files },
  { href: "/app/notes/new", label: "Builder", icon: ClipboardPlus },
  { href: "/app/notes/templates", label: "Templates", icon: LayoutTemplate }
] as const;

export function NotesSubNav() {
  const pathname = usePathname();

  return (
    <nav className="flex flex-wrap items-center gap-2" aria-label="Notes navigation">
      {items.map((item) => {
        const Icon = item.icon;
        const active = pathname === item.href || pathname.startsWith(`${item.href}/`);

        return (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              "inline-flex items-center gap-2 rounded-xl border px-3 py-2 text-sm font-medium transition",
              "border-white/35 bg-white/70 hover:bg-white/85",
              active && "ring-1 ring-[color:var(--actify-accent)]/45 bg-[color:var(--actify-accent)]/12"
            )}
          >
            <span className={cn(
              "inline-flex h-6 w-6 items-center justify-center rounded-full",
              active ? "bg-[color:var(--actify-accent)] text-white" : "bg-pink-100 text-pink-700"
            )}>
              <Icon className="h-3.5 w-3.5" />
            </span>
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
