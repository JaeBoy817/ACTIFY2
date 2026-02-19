"use client";

import { useMemo } from "react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

import { ANALYTICS_SECTION_LINKS, type AnalyticsSectionKey } from "@/components/analytics/section-links";
import { IconBadge } from "@/components/analytics/IconBadge";
import { cn } from "@/lib/utils";

export function AnalyticsSectionNav({ active }: { active: AnalyticsSectionKey }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const query = useMemo(() => {
    const next = new URLSearchParams(searchParams.toString());
    return next.toString();
  }, [searchParams]);

  return (
    <nav className="flex flex-wrap items-center gap-2" aria-label="Analytics sections">
      {ANALYTICS_SECTION_LINKS.map((item) => {
        const href = query ? `${item.href}?${query}` : item.href;
        const isActive = active === item.key || pathname === item.href;

        return (
          <Link
            key={item.key}
            href={href}
            prefetch
            onMouseEnter={() => router.prefetch(href)}
            onFocus={() => router.prefetch(href)}
            className={cn(
              "inline-flex items-center gap-2 rounded-xl border px-3 py-2 text-sm transition",
              "border-white/35 bg-white/65 backdrop-blur-sm hover:bg-white/80",
              isActive ? "ring-1 ring-[color:var(--actify-accent)]/45 bg-[color:var(--actify-accent)]/15" : ""
            )}
          >
            <IconBadge icon={item.icon} size="sm" className={cn("bg-gradient-to-br", item.accentClass)} />
            <span className="font-medium text-foreground">{item.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
