import Link from "next/link";
import type { ReactNode } from "react";
import {
  AlertCircle,
  ArrowDownRight,
  ArrowRight,
  ArrowUpRight,
  CalendarClock,
  CheckCircle2,
  ClipboardList,
  Clock3,
  Filter,
  Search,
  Users
} from "lucide-react";

import { TemplatePickerModal } from "@/components/care-plans/TemplatePickerModal";
import { TopContentHeader } from "@/components/app/TopContentHeader";
import { Badge } from "@/components/ui/badge";
import { CARE_PLAN_FOCUS_AREAS } from "@/lib/care-plans/enums";
import { CARE_PLAN_TEMPLATES } from "@/lib/care-plans/templates";
import { formatInTimeZone } from "@/lib/timezone";
import { cn } from "@/lib/utils";
import type { CarePlansDashboardData } from "@/app/app/care-plans/_actions/actions";

const statusOptions = [
  { value: "ALL", label: "All" },
  { value: "NO_PLAN", label: "No Plan" },
  { value: "ACTIVE", label: "Active" },
  { value: "DUE_SOON", label: "Due Soon" },
  { value: "OVERDUE", label: "Overdue" },
  { value: "ARCHIVED", label: "Archived" }
] as const;

type Filters = {
  search?: string;
  status?: string;
  bedBound?: string;
  primaryFocus?: string;
};

const PANEL =
  "rounded-[1.35rem] border border-[#243a61]/90 bg-[linear-gradient(180deg,#0c1629_0%,#0a1325_54%,#08101f_100%)] shadow-[0_26px_44px_-34px_rgba(37,99,235,0.72)]";
const PANEL_SOFT = "rounded-xl border border-[#2d446f]/90 bg-[#0f1b31]/90";
const PANEL_INNER = "rounded-xl border border-[#304874] bg-[#0e1a30]";
const META_LABEL = "text-[10px] font-semibold uppercase tracking-[0.14em] text-[#94add9]";

function buildHref(next: Filters) {
  const params = new URLSearchParams();
  if (next.search?.trim()) params.set("search", next.search.trim());
  if (next.status && next.status !== "ALL") params.set("status", next.status);
  if (next.bedBound === "true") params.set("bedBound", "true");
  if (next.primaryFocus) params.set("primaryFocus", next.primaryFocus);
  return `/app/care-plans${params.toString() ? `?${params.toString()}` : ""}`;
}

function formatDate(value: string | null, timeZone: string) {
  if (!value) return "Not set";
  return formatInTimeZone(new Date(value), timeZone, {
    month: "short",
    day: "numeric",
    year: "numeric"
  });
}

function statusTone(status: string) {
  if (status === "OVERDUE") return "border-rose-400/45 bg-rose-500/16 text-rose-100";
  if (status === "DUE_SOON") return "border-amber-300/45 bg-amber-500/16 text-amber-100";
  if (status === "NO_PLAN") return "border-orange-300/45 bg-orange-500/16 text-orange-100";
  if (status === "ARCHIVED") return "border-slate-400/35 bg-slate-500/14 text-slate-200";
  return "border-emerald-400/45 bg-emerald-500/16 text-emerald-100";
}

function trendTone(trend: "UP" | "DOWN" | "STABLE" | "FLAT") {
  if (trend === "UP") {
    return {
      label: "Improving",
      icon: <ArrowUpRight className="h-4 w-4 text-emerald-300" aria-hidden />,
      className: "border-emerald-400/40 bg-emerald-500/14 text-emerald-100"
    };
  }

  if (trend === "DOWN") {
    return {
      label: "Declining",
      icon: <ArrowDownRight className="h-4 w-4 text-rose-300" aria-hidden />,
      className: "border-rose-400/40 bg-rose-500/14 text-rose-100"
    };
  }

  return {
    label: "Stable",
    icon: <ArrowRight className="h-4 w-4 text-blue-300" aria-hidden />,
    className: "border-blue-400/40 bg-blue-500/14 text-blue-100"
  };
}

export function CarePlansDashboard({
  data,
  filters,
  timeZone
}: {
  data: CarePlansDashboardData;
  filters: Filters;
  timeZone: string;
}) {
  const activeStatus = filters.status ?? "ALL";
  const overdueRows = data.rows.filter((row) => row.displayStatus === "OVERDUE").slice(0, 6);
  const dueSoonRows = data.rows.filter((row) => row.displayStatus === "DUE_SOON").slice(0, 6);
  const noPlanRows = data.rows.filter((row) => row.displayStatus === "NO_PLAN").slice(0, 6);

  return (
    <div className="space-y-4">
      <TopContentHeader
        eyebrow="Care Planning"
        title="Care Plan"
        subtitle="Resident care plan queue with review status, focus coverage, and action-ready workflows."
        icon={ClipboardList}
        accentGradientClasses="from-cyan-300 to-blue-500"
        actions={<TemplatePickerModal residents={data.templatePickerResidents} templates={CARE_PLAN_TEMPLATES} />}
      >
        <div className="grid gap-3 xl:grid-cols-[minmax(0,1fr)_auto]">
          <form method="get" className="grid gap-2 md:grid-cols-[minmax(0,1fr)_190px_230px_auto]">
            <label className="relative flex h-10 items-center rounded-full border border-[#2f4671] bg-[#10203a] px-3 text-sm text-[#dce8ff]">
              <Search className="h-4 w-4 text-blue-200/80" aria-hidden />
              <input
                type="search"
                name="search"
                defaultValue={filters.search ?? ""}
                placeholder="Search resident, room, or status"
                className="h-full w-full bg-transparent px-2 text-sm placeholder:text-[#8ea8d5] focus:outline-none"
              />
            </label>

            <select
              name="status"
              defaultValue={activeStatus}
              className="h-10 rounded-full border border-[#304975] bg-[#10203a] px-3 text-sm text-[#dce8ff]"
            >
              {statusOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>

            <select
              name="primaryFocus"
              defaultValue={filters.primaryFocus ?? ""}
              className="h-10 rounded-full border border-[#304975] bg-[#10203a] px-3 text-sm text-[#dce8ff]"
            >
              <option value="">All focus areas</option>
              {CARE_PLAN_FOCUS_AREAS.map((focus) => (
                <option key={focus.key} value={focus.key}>
                  {focus.label}
                </option>
              ))}
            </select>

            <div className="flex items-center justify-end gap-2">
              <label className="inline-flex h-10 items-center gap-2 rounded-full border border-[#355486] bg-[#132748] px-3 text-xs font-semibold text-[#d6e5ff]">
                <input
                  type="checkbox"
                  name="bedBound"
                  value="true"
                  defaultChecked={filters.bedBound === "true"}
                  className="h-4 w-4"
                />
                Bed-bound
              </label>
              <button
                type="submit"
                className="inline-flex h-10 items-center gap-2 rounded-full border border-[#3e6198] bg-[#183563] px-4 text-xs font-semibold text-[#dbe8ff] transition hover:bg-[#1f3f73]"
              >
                <Filter className="h-3.5 w-3.5" aria-hidden />
                Apply
              </button>
            </div>
          </form>

          <div className="flex flex-wrap items-center gap-2">
            {statusOptions.map((option) => (
              <Link
                key={option.value}
                href={buildHref({ ...filters, status: option.value })}
                className={cn(
                  "inline-flex h-9 items-center rounded-full border px-3 text-xs font-semibold transition",
                  activeStatus === option.value
                    ? "border-[#5f89cb] bg-[#244881] text-white"
                    : "border-[#314d7e] bg-[#122444] text-[#bfd3f4] hover:border-[#4d74af] hover:text-white"
                )}
              >
                {option.label}
              </Link>
            ))}
          </div>
        </div>
      </TopContentHeader>

      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-6">
        <StatCard label="Residents" value={data.counts.total} icon={<Users className="h-4 w-4 text-cyan-200" />} />
        <StatCard label="No Plan" value={data.counts.noPlan} icon={<ClipboardList className="h-4 w-4 text-orange-200" />} tone="orange" />
        <StatCard label="Active" value={data.counts.active} icon={<CheckCircle2 className="h-4 w-4 text-emerald-200" />} tone="emerald" />
        <StatCard label="Due Soon" value={data.counts.dueSoon} icon={<Clock3 className="h-4 w-4 text-amber-200" />} tone="amber" />
        <StatCard label="Overdue" value={data.counts.overdue} icon={<AlertCircle className="h-4 w-4 text-rose-200" />} tone="rose" />
        <StatCard label="Archived" value={data.counts.archived} icon={<CalendarClock className="h-4 w-4 text-violet-200" />} tone="violet" />
      </section>

      <section className="grid gap-4 xl:grid-cols-12">
        <div className="space-y-4 xl:col-span-8">
          <div className={cn(PANEL, "overflow-hidden p-4")}>
            <header className="mb-3 flex items-center justify-between gap-2">
              <div>
                <p className={META_LABEL}>Resident Queue</p>
                <h2 className="text-lg font-black text-white">Care Plan Resident List</h2>
              </div>
              <Badge className="border-[#3d5f94] bg-[#16345f] text-[#d8e6ff]">{data.rows.length} matching residents</Badge>
            </header>

            {data.rows.length === 0 ? (
              <div className="rounded-xl border border-dashed border-[#3f5f92] bg-[#10223f] p-8 text-center">
                <p className="text-base font-semibold text-white">No residents matched your filters.</p>
                <p className="mt-2 text-sm text-[#a9c1e7]">Adjust search, status, or focus filters to continue.</p>
              </div>
            ) : (
              <div className="space-y-2">
                {data.rows.map((row) => {
                  const trend = trendTone(row.trend);
                  return (
                    <article key={row.residentId} className={cn(PANEL_INNER, "p-3") }>
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div className="min-w-0">
                          <div className="flex flex-wrap items-center gap-2">
                            <h3 className="truncate text-base font-bold text-white">{row.residentName}</h3>
                            <Badge className={cn("border", statusTone(row.displayStatus))}>{row.displayStatusLabel}</Badge>
                            <Badge className={cn("border", trend.className)}>
                              <span className="inline-flex items-center gap-1">
                                {trend.icon}
                                {trend.label}
                              </span>
                            </Badge>
                          </div>
                          <p className="mt-1 text-xs text-[#a6bfe7]">
                            Room {row.room}
                            {row.unitName ? ` · ${row.unitName}` : ""}
                          </p>
                          <div className="mt-2 flex flex-wrap gap-1.5">
                            {row.primaryFocusLabels.length > 0 ? (
                              row.primaryFocusLabels.slice(0, 3).map((focus) => (
                                <Badge key={`${row.residentId}-${focus}`} className="border-[#416396] bg-[#17345f] text-[11px] text-[#d9e8ff]">
                                  {focus}
                                </Badge>
                              ))
                            ) : (
                              <Badge className="border-[#425f91] bg-[#163159] text-[11px] text-[#c9dbfa]">No focus set</Badge>
                            )}
                            {row.primaryFocusLabels.length > 3 ? (
                              <Badge className="border-[#425f91] bg-[#163159] text-[11px] text-[#c9dbfa]">
                                +{row.primaryFocusLabels.length - 3}
                              </Badge>
                            ) : null}
                          </div>
                        </div>

                        <div className="grid gap-2 sm:grid-cols-3">
                          <ResidentMeta label="Next Review" value={formatDate(row.nextReviewDate, timeZone)} />
                          <ResidentMeta label="Last Review" value={formatDate(row.lastReviewDate, timeZone)} />
                          <ResidentMeta label="Workflow" value={row.carePlanId ? "Plan active" : "Start plan"} />
                        </div>
                      </div>

                      <div className="mt-3 flex flex-wrap items-center justify-end gap-2">
                        <ActionLink href={`/app/residents/${row.residentId}/care-plan`} label="Open" tone="neutral" />
                        <ActionLink href={`/app/residents/${row.residentId}/care-plan/reviews/new`} label="Add Review" tone="violet" />
                        <ActionLink href={`/app/residents/${row.residentId}/care-plan/edit`} label="Edit" tone="blue" />
                      </div>
                    </article>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        <aside className="space-y-4 xl:col-span-4">
          <InsightPanel title="Overdue" description="Immediate follow-up needed" rows={overdueRows} tone="rose" timeZone={timeZone} />
          <InsightPanel title="Due Soon" description="Next review window approaching" rows={dueSoonRows} tone="amber" timeZone={timeZone} />
          <InsightPanel title="No Plan" description="Residents requiring care plan start" rows={noPlanRows} tone="orange" timeZone={timeZone} />

          <div className={cn(PANEL, "p-4") }>
            <p className={META_LABEL}>Quick Actions</p>
            <h3 className="mt-1 text-base font-bold text-white">Care Plan Shortcuts</h3>
            <div className="mt-3 grid gap-2">
              <QuickAction href="/app/documentation/progress-notes" label="Open Progress Notes" />
              <QuickAction href="/app/documentation/one-to-one" label="Open 1:1 Notes" />
              <QuickAction href="/app/documentation/uda" label="Open UDA Queue" />
              <QuickAction href="/app/documentation/mds" label="Open MDS Queue" />
              <QuickAction href="/app/residents" label="Resident Directory" />
            </div>
          </div>
        </aside>
      </section>
    </div>
  );
}

function StatCard({
  label,
  value,
  icon,
  tone = "blue"
}: {
  label: string;
  value: number;
  icon: ReactNode;
  tone?: "blue" | "emerald" | "amber" | "rose" | "orange" | "violet";
}) {
  const toneClass = {
    blue: "from-cyan-300/20 to-blue-500/20",
    emerald: "from-emerald-300/20 to-teal-500/20",
    amber: "from-amber-300/20 to-orange-500/20",
    rose: "from-rose-300/20 to-red-500/20",
    orange: "from-orange-300/20 to-amber-500/20",
    violet: "from-violet-300/20 to-fuchsia-500/20"
  }[tone];

  return (
    <div className={cn(PANEL, "relative overflow-hidden p-3")}>
      <div className={cn("pointer-events-none absolute inset-x-0 top-0 h-8 bg-gradient-to-r", toneClass)} />
      <div className="relative z-10 flex items-start justify-between gap-2">
        <div>
          <p className={META_LABEL}>{label}</p>
          <p className="mt-1 text-2xl font-black text-white">{value}</p>
        </div>
        <span className="inline-flex h-8 w-8 items-center justify-center rounded-xl border border-[#3b5a8f] bg-[#16325d] text-[#d9e8ff]">
          {icon}
        </span>
      </div>
    </div>
  );
}

function ResidentMeta({ label, value }: { label: string; value: string }) {
  return (
    <div className={cn(PANEL_SOFT, "min-w-[132px] px-2.5 py-2") }>
      <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-[#95aed8]">{label}</p>
      <p className="mt-1 text-xs text-[#d9e8ff]">{value}</p>
    </div>
  );
}

function ActionLink({
  href,
  label,
  tone = "neutral"
}: {
  href: string;
  label: string;
  tone?: "neutral" | "blue" | "violet";
}) {
  const toneClass =
    tone === "blue"
      ? "border-[#537dbc] bg-[#25497f] text-white hover:bg-[#2b579a]"
      : tone === "violet"
        ? "border-violet-400/45 bg-violet-500/16 text-violet-100 hover:bg-violet-500/24"
        : "border-[#395c92] bg-[#17325d] text-[#d7e7ff] hover:bg-[#1b3b6d]";

  return (
    <Link
      href={href}
      className={cn(
        "inline-flex h-8 items-center rounded-full border px-3 text-xs font-semibold transition",
        toneClass
      )}
    >
      {label}
    </Link>
  );
}

function InsightPanel({
  title,
  description,
  rows,
  tone,
  timeZone
}: {
  title: string;
  description: string;
  rows: CarePlansDashboardData["rows"];
  tone: "rose" | "amber" | "orange";
  timeZone: string;
}) {
  const toneClass = {
    rose: "border-rose-400/45 bg-rose-500/16 text-rose-100",
    amber: "border-amber-300/45 bg-amber-500/16 text-amber-100",
    orange: "border-orange-300/45 bg-orange-500/16 text-orange-100"
  }[tone];

  return (
    <div className={cn(PANEL, "p-4")}>
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className={META_LABEL}>{title}</p>
          <h3 className="mt-1 text-base font-bold text-white">{description}</h3>
        </div>
        <Badge className={cn("border", toneClass)}>{rows.length}</Badge>
      </div>

      <div className="mt-3 space-y-2">
        {rows.length > 0 ? (
          rows.map((row) => (
            <Link
              key={`${title}-${row.residentId}`}
              href={`/app/residents/${row.residentId}/care-plan`}
              className={cn(PANEL_INNER, "block p-2.5 hover:border-[#4f72ad]")}
            >
              <p className="text-sm font-semibold text-white">{row.residentName}</p>
              <p className="mt-1 text-xs text-[#a5bfe7]">Room {row.room} · {formatDate(row.nextReviewDate, timeZone)}</p>
            </Link>
          ))
        ) : (
          <p className="rounded-lg border border-dashed border-[#3b5787] px-3 py-2 text-xs text-[#99b3dd]">No residents in this queue.</p>
        )}
      </div>
    </div>
  );
}

function QuickAction({ href, label }: { href: string; label: string }) {
  return (
    <Link
      href={href}
      className="inline-flex items-center justify-between gap-2 rounded-xl border border-[#355686] bg-[#14305a] px-3 py-2 text-sm font-semibold text-[#d9e7ff] transition hover:border-[#4e73ae] hover:bg-[#18386b]"
    >
      {label}
      <ArrowRight className="h-4 w-4" aria-hidden />
    </Link>
  );
}
