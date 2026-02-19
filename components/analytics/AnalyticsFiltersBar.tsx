"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { FilterX, Loader2 } from "lucide-react";
import { usePathname, useRouter } from "next/navigation";

import type { AnalyticsFilterOptions, AnalyticsFilters, AnalyticsRangePreset } from "@/lib/analytics/types";
import { analyticsFiltersToQueryString } from "@/lib/analytics/filters";
import { Button } from "@/components/ui/button";

const RANGE_OPTIONS: Array<{ value: AnalyticsRangePreset; label: string }> = [
  { value: "today", label: "Today" },
  { value: "7d", label: "7D" },
  { value: "30d", label: "30D" },
  { value: "custom", label: "Custom" }
];

export function AnalyticsFiltersBar({
  filters,
  options
}: {
  filters: AnalyticsFilters;
  options: AnalyticsFilterOptions;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const [isPending, startTransition] = useTransition();
  const [draft, setDraft] = useState<AnalyticsFilters>(filters);

  useEffect(() => {
    setDraft(filters);
  }, [filters]);

  const queryString = useMemo(() => analyticsFiltersToQueryString(draft), [draft]);
  const href = useMemo(() => (queryString ? `${pathname}?${queryString}` : pathname), [pathname, queryString]);
  const incomingQueryString = useMemo(() => analyticsFiltersToQueryString(filters), [filters]);
  const incomingHref = useMemo(
    () => (incomingQueryString ? `${pathname}?${incomingQueryString}` : pathname),
    [incomingQueryString, pathname]
  );

  useEffect(() => {
    if (href === incomingHref) {
      return;
    }

    const timer = window.setTimeout(() => {
      startTransition(() => {
        router.replace(href, { scroll: false });
      });
    }, 300);

    return () => window.clearTimeout(timer);
  }, [href, incomingHref, router]);

  return (
    <div className="sticky top-3 z-20 rounded-2xl border border-white/35 bg-white/70 p-3 backdrop-blur-md">
      <div className="grid gap-2 md:grid-cols-6 xl:grid-cols-8">
        <label className="space-y-1 text-xs font-medium uppercase tracking-wide text-foreground/65">
          Date Range
          <select
            value={draft.range}
            onChange={(event) => {
              const nextRange = event.target.value as AnalyticsRangePreset;
              setDraft((current) => ({
                ...current,
                range: nextRange,
                ...(nextRange !== "custom" ? { from: null, to: null } : {})
              }));
            }}
            className="h-10 w-full rounded-lg border border-white/35 bg-white/85 px-3 text-sm normal-case text-foreground"
          >
            {RANGE_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </label>

        {draft.range === "custom" ? (
          <>
            <label className="space-y-1 text-xs font-medium uppercase tracking-wide text-foreground/65">
              From
              <input
                type="date"
                value={draft.from ?? ""}
                onChange={(event) => setDraft((current) => ({ ...current, from: event.target.value || null }))}
                className="h-10 w-full rounded-lg border border-white/35 bg-white/85 px-3 text-sm normal-case text-foreground"
              />
            </label>
            <label className="space-y-1 text-xs font-medium uppercase tracking-wide text-foreground/65">
              To
              <input
                type="date"
                value={draft.to ?? ""}
                onChange={(event) => setDraft((current) => ({ ...current, to: event.target.value || null }))}
                className="h-10 w-full rounded-lg border border-white/35 bg-white/85 px-3 text-sm normal-case text-foreground"
              />
            </label>
          </>
        ) : null}

        <label className="space-y-1 text-xs font-medium uppercase tracking-wide text-foreground/65">
          Unit
          <select
            value={draft.unitId ?? ""}
            onChange={(event) => setDraft((current) => ({ ...current, unitId: event.target.value || null }))}
            className="h-10 w-full rounded-lg border border-white/35 bg-white/85 px-3 text-sm normal-case text-foreground"
          >
            <option value="">All units</option>
            {options.units.map((unit) => (
              <option key={unit.id} value={unit.id}>
                {unit.label}
              </option>
            ))}
          </select>
        </label>

        <label className="space-y-1 text-xs font-medium uppercase tracking-wide text-foreground/65">
          Resident
          <select
            value={draft.residentId ?? ""}
            onChange={(event) => setDraft((current) => ({ ...current, residentId: event.target.value || null }))}
            className="h-10 w-full rounded-lg border border-white/35 bg-white/85 px-3 text-sm normal-case text-foreground"
          >
            <option value="">All residents</option>
            {options.residents.map((resident) => (
              <option key={resident.id} value={resident.id}>
                {resident.label} · Room {resident.room}
              </option>
            ))}
          </select>
        </label>

        <label className="space-y-1 text-xs font-medium uppercase tracking-wide text-foreground/65">
          Category
          <select
            value={draft.category ?? ""}
            onChange={(event) => setDraft((current) => ({ ...current, category: event.target.value || null }))}
            className="h-10 w-full rounded-lg border border-white/35 bg-white/85 px-3 text-sm normal-case text-foreground"
          >
            <option value="">All categories</option>
            {options.categories.map((entry) => (
              <option key={entry.key} value={entry.key}>
                {entry.label}
              </option>
            ))}
          </select>
        </label>

        <label className="space-y-1 text-xs font-medium uppercase tracking-wide text-foreground/65">
          Staff / Volunteer
          <select
            value={draft.staffId ?? ""}
            onChange={(event) => setDraft((current) => ({ ...current, staffId: event.target.value || null }))}
            className="h-10 w-full rounded-lg border border-white/35 bg-white/85 px-3 text-sm normal-case text-foreground"
          >
            <option value="">All</option>
            {options.staffAndVolunteers.map((entry) => (
              <option key={entry.id} value={entry.id}>
                {entry.label}
              </option>
            ))}
          </select>
        </label>

        <div className="flex items-end justify-end gap-2">
          <Button
            type="button"
            variant="outline"
            className="h-10 bg-white/70"
            onClick={() =>
              setDraft({
                range: "30d",
                from: null,
                to: null,
                unitId: null,
                residentId: null,
                category: null,
                staffId: null
              })
            }
          >
            <FilterX className="mr-1 h-4 w-4" />
            Clear
          </Button>
          {isPending ? (
            <span className="inline-flex h-10 items-center rounded-md border border-white/35 bg-white/70 px-3 text-sm text-foreground/70">
              <Loader2 className="mr-1 h-4 w-4 animate-spin" />
              Updating
            </span>
          ) : null}
        </div>
      </div>
    </div>
  );
}
