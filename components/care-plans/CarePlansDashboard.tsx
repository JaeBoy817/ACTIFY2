import type { ReactNode } from "react";
import Link from "next/link";
import {
  AlertCircle,
  Archive,
  ArrowRight,
  CalendarClock,
  CheckCircle2,
  ClipboardList,
  Clock3,
  Filter,
  Search,
  Users
} from "lucide-react";

import { TemplatePickerModal } from "@/components/care-plans/TemplatePickerModal";
import { StatusBadge } from "@/components/care-plans/StatusBadge";
import { TrendIndicator } from "@/components/care-plans/TrendIndicator";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import type { CarePlansDashboardData } from "@/app/app/care-plans/_actions/actions";
import { CARE_PLAN_FOCUS_AREAS } from "@/lib/care-plans/enums";
import { CARE_PLAN_TEMPLATES } from "@/lib/care-plans/templates";
import { formatInTimeZone } from "@/lib/timezone";

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

  return (
    <div className="space-y-4">
      <Card className="glass-panel rounded-2xl border-white/15">
        <CardHeader className="flex flex-row items-start justify-between gap-3">
          <div>
            <CardTitle className="flex items-center gap-2 text-2xl">
              <ClipboardList className="h-6 w-6 text-actifyBlue" />
              Care Plans
            </CardTitle>
            <p className="mt-1 text-sm text-muted-foreground">
              Quickly find overdue residents, start new plans, and keep reviews on schedule.
            </p>
          </div>
          <TemplatePickerModal residents={data.templatePickerResidents} templates={CARE_PLAN_TEMPLATES} />
        </CardHeader>
      </Card>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-6">
        <StatCard
          label="Residents"
          value={data.counts.total}
          icon={<Users className="h-4 w-4 text-blue-700" />}
          iconWrapClassName="bg-blue-100 ring-blue-300/60"
        />
        <StatCard
          label="No Plan"
          value={data.counts.noPlan}
          icon={<ClipboardList className="h-4 w-4 text-orange-700" />}
          iconWrapClassName="bg-orange-100 ring-orange-300/60"
        />
        <StatCard
          label="Active"
          value={data.counts.active}
          icon={<CheckCircle2 className="h-4 w-4 text-emerald-700" />}
          iconWrapClassName="bg-emerald-100 ring-emerald-300/60"
        />
        <StatCard
          label="Due Soon"
          value={data.counts.dueSoon}
          icon={<Clock3 className="h-4 w-4 text-amber-700" />}
          iconWrapClassName="bg-amber-100 ring-amber-300/60"
        />
        <StatCard
          label="Overdue"
          value={data.counts.overdue}
          icon={<AlertCircle className="h-4 w-4 text-rose-700" />}
          iconWrapClassName="bg-rose-100 ring-rose-300/60"
        />
        <StatCard
          label="Archived"
          value={data.counts.archived}
          icon={<Archive className="h-4 w-4 text-violet-700" />}
          iconWrapClassName="bg-violet-100 ring-violet-300/60"
        />
      </div>

      <Card className="glass-panel rounded-2xl border-white/15">
        <CardContent className="pt-6">
          <form method="get" className="grid gap-3 lg:grid-cols-[1fr_180px_220px_auto]">
            <label className="text-sm">
              <span className="font-medium text-foreground">Search</span>
              <div className="relative mt-1">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-foreground/45" />
                <Input
                  name="search"
                  defaultValue={filters.search ?? ""}
                  className="pl-9"
                  placeholder="Resident name or room"
                />
              </div>
            </label>

            <label className="text-sm">
              <span className="font-medium text-foreground">Status</span>
              <select
                name="status"
                defaultValue={activeStatus}
                className="mt-1 h-10 w-full rounded-md border border-white/20 bg-white/60 px-3 text-sm"
              >
                {statusOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>

            <label className="text-sm">
              <span className="font-medium text-foreground">Primary Focus</span>
              <select
                name="primaryFocus"
                defaultValue={filters.primaryFocus ?? ""}
                className="mt-1 h-10 w-full rounded-md border border-white/20 bg-white/60 px-3 text-sm"
              >
                <option value="">All focus areas</option>
                {CARE_PLAN_FOCUS_AREAS.map((focus) => (
                  <option key={focus.key} value={focus.key}>
                    {focus.label}
                  </option>
                ))}
              </select>
            </label>

            <div className="flex items-end gap-2">
              <label className="flex items-center gap-2 rounded-md border border-white/20 bg-white/50 px-3 py-2 text-sm text-foreground/80">
                <input
                  type="checkbox"
                  name="bedBound"
                  value="true"
                  defaultChecked={filters.bedBound === "true"}
                  className="h-4 w-4"
                />
                Bed-bound only
              </label>
              <Button type="submit" className="glass-panel-strong border-white/20 text-black shadow-lg shadow-actifyBlue/20 hover:text-black hover:shadow-xl hover:shadow-actifyBlue/25">
                <Filter className="mr-1 h-4 w-4" />
                Apply
              </Button>
            </div>
          </form>

          <div className="mt-3 flex flex-wrap gap-2">
            {statusOptions.map((option) => (
              <Button
                key={option.value}
                asChild
                variant={activeStatus === option.value ? "default" : "outline"}
                size="sm"
                className={activeStatus === option.value ? "" : "bg-white/60"}
              >
                <Link href={buildHref({ ...filters, status: option.value })}>{option.label}</Link>
              </Button>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card className="glass-panel rounded-2xl border-white/15">
        <CardHeader>
          <CardTitle className="text-lg">Resident Care Plan Board</CardTitle>
        </CardHeader>
        <CardContent>
          {data.rows.length === 0 ? (
            <div className="rounded-xl border border-dashed border-white/30 bg-white/20 p-8 text-center text-sm text-muted-foreground">
              No residents matched your filters.
            </div>
          ) : (
            <div className="overflow-x-auto rounded-xl border border-white/15 bg-white/30">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Resident</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Primary Focus</TableHead>
                    <TableHead>Next Review</TableHead>
                    <TableHead>Last Review</TableHead>
                    <TableHead>Trend</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.rows.map((row) => (
                    <TableRow key={row.residentId}>
                      <TableCell>
                        <p className="font-medium text-foreground">{row.residentName}</p>
                        <p className="text-xs text-muted-foreground">
                          Room {row.room}
                          {row.unitName ? ` · ${row.unitName}` : ""}
                        </p>
                      </TableCell>
                      <TableCell>
                        <StatusBadge status={row.displayStatus} />
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-wrap gap-1">
                          {row.primaryFocusLabels.slice(0, 2).map((focus) => (
                            <Badge key={focus} variant="outline" className="glass-chip border-white/20 bg-white/20 text-xs">
                              {focus}
                            </Badge>
                          ))}
                          {row.primaryFocusLabels.length > 2 ? (
                            <Badge variant="outline" className="glass-chip border-white/20 bg-white/20 text-xs">
                              +{row.primaryFocusLabels.length - 2}
                            </Badge>
                          ) : null}
                          {row.primaryFocusLabels.length === 0 ? (
                            <span className="text-xs text-muted-foreground">No focus set</span>
                          ) : null}
                        </div>
                      </TableCell>
                      <TableCell>{formatDate(row.nextReviewDate, timeZone)}</TableCell>
                      <TableCell>{formatDate(row.lastReviewDate, timeZone)}</TableCell>
                      <TableCell>
                        <TrendIndicator trend={row.trend} />
                      </TableCell>
                      <TableCell>
                        <div className="flex justify-end gap-2">
                          <Button asChild size="sm" variant="outline" className="bg-white/70">
                            <Link href={`/app/residents/${row.residentId}/care-plan`}>View</Link>
                          </Button>
                          <Button asChild size="sm" variant="outline" className="bg-white/70">
                            <Link href={`/app/residents/${row.residentId}/care-plan/reviews/new`}>
                              <CalendarClock className="mr-1 h-3.5 w-3.5" />
                              Add Review
                            </Link>
                          </Button>
                          <Button asChild size="sm">
                            <Link href={`/app/residents/${row.residentId}/care-plan/edit`}>
                              Edit
                              <ArrowRight className="ml-1 h-3.5 w-3.5" />
                            </Link>
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function StatCard({
  label,
  value,
  icon,
  iconWrapClassName
}: {
  label: string;
  value: number;
  icon: ReactNode;
  iconWrapClassName: string;
}) {
  return (
    <Card className="glass-panel rounded-2xl border-white/15">
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-2">
          <p className="text-xs uppercase tracking-wide text-foreground/70">{label}</p>
          <span className={`inline-flex h-7 w-7 items-center justify-center rounded-full ring-1 ${iconWrapClassName}`}>
            {icon}
          </span>
        </div>
        <p className="mt-2 text-2xl font-semibold text-foreground">{value}</p>
      </CardContent>
    </Card>
  );
}
