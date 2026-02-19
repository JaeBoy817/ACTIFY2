"use client";

import Link from "next/link";
import { useMemo } from "react";
import { useRouter, useSearchParams } from "next/navigation";

import { IconBadge } from "@/components/analytics/IconBadge";
import { ANALYTICS_SECTION_LINKS } from "@/components/analytics/section-links";

export function AnalyticsHubTiles() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const queryString = useMemo(() => searchParams.toString(), [searchParams]);

  return (
    <section className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
      {ANALYTICS_SECTION_LINKS.filter((section) => section.key !== "hub").map((section) => {
        const href = queryString ? `${section.href}?${queryString}` : section.href;
        return (
          <Link
            key={section.key}
            href={href}
            prefetch
            onMouseEnter={() => router.prefetch(href)}
            onFocus={() => router.prefetch(href)}
            className="glass-panel group rounded-2xl border-white/20 p-4 transition hover:-translate-y-0.5 hover:shadow-xl hover:shadow-black/15"
          >
            <div className="flex items-start justify-between gap-3">
              <IconBadge icon={section.icon} className={`bg-gradient-to-br ${section.accentClass}`} />
              <span className="rounded-full border border-white/40 bg-white/70 px-2 py-0.5 text-[11px] text-foreground/70">
                Open
              </span>
            </div>
            <p className="mt-3 font-[var(--font-display)] text-lg text-foreground">{section.label}</p>
            <p className="text-sm text-foreground/70">{section.description}</p>
          </Link>
        );
      })}
    </section>
  );
}
