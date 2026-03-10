"use client";

import Link from "next/link";
import { LifeBuoy, LogOut, Settings } from "lucide-react";
import { SignOutButton } from "@clerk/nextjs";

import { SidebarNavItem } from "@/components/app/sidepanel/SidebarNavItem";
import type { SidebarLink } from "@/components/app/sidepanel/types";
import { isClerkConfigured } from "@/lib/clerk-config";

const settingsLink: SidebarLink = {
  href: "/app/settings",
  label: "Settings",
  icon: Settings,
  accentGradientClasses: "from-zinc-200 to-zinc-400 text-zinc-900"
};

const helpLink: SidebarLink = {
  href: "/contact",
  label: "Help & Support",
  icon: LifeBuoy,
  accentGradientClasses: "from-sky-300 to-blue-500 text-zinc-950"
};

export function SidebarUtilitySection({
  pathname,
  onPrefetch,
  onNavigate
}: {
  pathname: string;
  onPrefetch?: (href: string) => void;
  onNavigate?: (href: string) => void;
}) {
  return (
    <section className="space-y-1.5 border-t border-emerald-800/60 pt-3">
      <p className="px-2 text-[10px] font-semibold uppercase tracking-[0.16em] text-emerald-200/55">
        Utility
      </p>
      <SidebarNavItem
        link={settingsLink}
        active={pathname === "/app/settings" || pathname.startsWith("/app/settings/")}
        onPrefetch={onPrefetch}
        onNavigate={onNavigate}
      />
      <SidebarNavItem
        link={helpLink}
        active={pathname === "/contact"}
        onPrefetch={onPrefetch}
        onNavigate={onNavigate}
      />
      {isClerkConfigured ? (
        <SignOutButton redirectUrl="/signed-out">
          <button
            type="button"
            className="group relative flex h-11 w-full items-center gap-2 rounded-full border border-transparent bg-transparent pl-9 pr-3 text-left text-sm font-medium text-emerald-100/80 transition hover:border-emerald-700/50 hover:bg-[#133326] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-300/50"
          >
            <span className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-gradient-to-br from-rose-300 to-rose-500">
              <LogOut className="h-3.5 w-3.5 text-zinc-950" />
            </span>
            <span>Sign Out</span>
          </button>
        </SignOutButton>
      ) : (
        <Link
          href="/signed-out"
          className="group relative flex h-11 w-full items-center gap-2 rounded-full border border-transparent bg-transparent pl-9 pr-3 text-left text-sm font-medium text-emerald-100/80 transition hover:border-emerald-700/50 hover:bg-[#133326] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-300/50"
        >
          <span className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-gradient-to-br from-rose-300 to-rose-500">
            <LogOut className="h-3.5 w-3.5 text-zinc-950" />
          </span>
          <span>Sign Out</span>
        </Link>
      )}
    </section>
  );
}
