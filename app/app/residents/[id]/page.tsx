import Link from "next/link";
import { revalidatePath } from "next/cache";
import { notFound } from "next/navigation";
import { AttendanceStatus } from "@prisma/client";
import { CalendarClock, ClipboardList, FileClock, HeartPulse, NotebookPen, UserRound } from "lucide-react";
import { z } from "zod";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { getFacilityContextWithSubscription } from "@/lib/page-guards";
import { parseDocumentationMeta, stripDocumentationMeta } from "@/lib/documentation/meta";
import { assertWritable } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";
import {
  buildResidentCompletionsMap,
  dueLevelTone,
  getResidentAssessmentSchedule,
  type AssessmentDueLevel
} from "@/lib/residents/assessment-due";
import { isResidentSchemaDriftError } from "@/lib/residents/query";
import {
  formatResidentBirthDate,
  getResidentAge,
  isNeedsOneOnOne,
  toResidentStatusLabel
} from "@/lib/residents/types";
import { cn } from "@/lib/utils";

type ResidentTabKey = "overview" | "assessments" | "documentation" | "attendance" | "preferences";

const TAB_ORDER: ResidentTabKey[] = ["overview", "assessments", "documentation", "attendance", "preferences"];

const assessmentSchema = z.object({
  music: z.string().optional(),
  topics: z.string().optional(),
  faith: z.string().optional(),
  hobbies: z.string().optional(),
  dislikesTriggers: z.string().optional(),
  bestTimeOfDay: z.string().optional()
});

const familySchema = z.object({
  bestContactTimes: z.string().optional(),
  preferences: z.string().optional(),
  calmingThings: z.string().optional()
});

function normalizeTab(value: string | string[] | undefined): ResidentTabKey {
  const raw = Array.isArray(value) ? value[0] : value;
  if (!raw) return "overview";
  return TAB_ORDER.includes(raw as ResidentTabKey) ? (raw as ResidentTabKey) : "overview";
}

function parseDate(value: string | null) {
  if (!value) return null;
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return null;
  return parsed;
}

function formatDate(value: string | null) {
  const parsed = parseDate(value);
  if (!parsed) return "Not set";
  return parsed.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric"
  });
}

function formatDateTime(value: string | null) {
  const parsed = parseDate(value);
  if (!parsed) return "Not set";
  return parsed.toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit"
  });
}

function dueBadgeClass(level: string) {
  if (level === "OVERDUE") {
    return "border-rose-400/45 bg-rose-500/16 text-rose-100";
  }
  if (level === "DUE_TODAY" || level === "DUE_SOON_7" || level === "DUE_SOON_14" || level === "DUE_SOON_30") {
    return "border-amber-400/45 bg-amber-500/16 text-amber-100";
  }
  if (level === "ON_TRACK") {
    return "border-emerald-400/45 bg-emerald-500/16 text-emerald-100";
  }
  if (level === "INACTIVE") {
    return "border-zinc-400/45 bg-zinc-500/16 text-zinc-100";
  }
  return "border-slate-400/45 bg-slate-500/16 text-slate-100";
}

function statusToneClass(level: string) {
  const tone = dueLevelTone(level as AssessmentDueLevel);
  if (tone === "danger") return "text-rose-200";
  if (tone === "warning") return "text-amber-200";
  if (tone === "success") return "text-emerald-200";
  return "text-zinc-200";
}

function monthDifference(start: Date | null, end: Date) {
  if (!start) return null;
  const years = end.getFullYear() - start.getFullYear();
  const months = end.getMonth() - start.getMonth();
  const total = years * 12 + months;
  return Math.max(0, total);
}

function buildMilestones(anchorIso: string | null, nextQuarterlyIso: string | null, nextAnnualIso: string | null, nextMdsIso: string | null) {
  const anchor = parseDate(anchorIso);
  const milestones: Array<{ label: string; date: string | null; accent: string }> = [
    { label: "Admission", date: anchorIso, accent: "bg-cyan-400" },
    { label: "Next Quarterly", date: nextQuarterlyIso, accent: "bg-amber-400" },
    { label: "Next Annual", date: nextAnnualIso, accent: "bg-blue-400" },
    { label: "Next MDS", date: nextMdsIso, accent: "bg-emerald-400" }
  ];

  if (anchor) {
    for (let index = 1; index <= 3; index += 1) {
      const quarterDate = new Date(anchor);
      quarterDate.setMonth(quarterDate.getMonth() + index * 3);
      milestones.push({
        label: `Q${index} checkpoint`,
        date: quarterDate.toISOString(),
        accent: "bg-violet-400"
      });
    }
  }

  return milestones;
}

function suggestProgramsFromAssessment(input: { music?: string; topics?: string; faith?: string; hobbies?: string }) {
  const text = [input.music, input.topics, input.faith, input.hobbies].join(" ").toLowerCase();
  const suggestions = new Set<string>();

  if (text.includes("country")) {
    suggestions.add("Music social hour");
    suggestions.add("Name that tune");
  }

  if (text.includes("faith") || text.includes("church") || text.includes("prayer")) {
    suggestions.add("Spiritual reflection circle");
  }

  if (text.includes("garden") || text.includes("flowers")) {
    suggestions.add("Gardening club");
  }

  if (text.includes("sports") || text.includes("baseball") || text.includes("football")) {
    suggestions.add("Sports recap social");
  }

  if (text.includes("craft") || text.includes("art")) {
    suggestions.add("Creative table crafts");
  }

  if (text.includes("history") || text.includes("news")) {
    suggestions.add("Current events and memories");
  }

  if (suggestions.size === 0) {
    suggestions.add("Coffee and conversation circle");
    suggestions.add("1:1 reminiscence visit");
  }

  return Array.from(suggestions);
}

export default async function ResidentProfilePage({
  params,
  searchParams
}: {
  params: { id: string };
  searchParams?: { tab?: string | string[] };
}) {
  const context = await getFacilityContextWithSubscription();
  const activeTab = normalizeTab(searchParams?.tab);

  const resident = await prisma.resident
    .findFirst({
      where: {
        id: params.id,
        facilityId: context.facilityId
      },
      include: {
        unit: true,
        carePlans: {
          where: { status: "ACTIVE" },
          orderBy: { updatedAt: "desc" },
          take: 1,
          select: {
            id: true,
            focusAreas: true,
            barriers: true,
            supports: true,
            preferencesText: true,
            safetyNotes: true,
            nextReviewDate: true,
            updatedAt: true
          }
        },
        progressNotes: {
          include: {
            createdByUser: {
              select: {
                id: true,
                name: true
              }
            },
            activityInstance: {
              select: {
                id: true,
                title: true,
                location: true,
                startAt: true
              }
            }
          },
          orderBy: { createdAt: "desc" },
          take: 120
        },
        attendance: {
          include: {
            activityInstance: {
              select: {
                id: true,
                title: true,
                location: true,
                startAt: true
              }
            }
          },
          orderBy: { createdAt: "desc" },
          take: 180
        },
        assessments: {
          orderBy: { createdAt: "desc" },
          take: 10,
          select: {
            id: true,
            createdAt: true,
            answers: true,
            suggestedPrograms: true,
            dislikesTriggers: true
          }
        },
        familyEngagementNotes: {
          orderBy: { createdAt: "desc" },
          take: 12,
          select: {
            id: true,
            createdAt: true,
            bestContactTimes: true,
            preferences: true,
            calmingThings: true
          }
        }
      }
    })
    .catch(async (error) => {
      if (!isResidentSchemaDriftError(error)) throw error;
      const legacyResident = await prisma.resident.findFirst({
        where: {
          id: params.id,
          facilityId: context.facilityId
        },
        select: {
          id: true,
          facilityId: true,
          unitId: true,
          status: true,
          firstName: true,
          lastName: true,
          room: true,
          birthDate: true,
          preferences: true,
          safetyNotes: true,
          tags: true,
          lastOneOnOneAt: true,
          followUpFlag: true,
          bestTimesOfDay: true,
          notes: true,
          isActive: true,
          createdAt: true,
          updatedAt: true,
          unit: true,
          carePlans: {
            where: { status: "ACTIVE" },
            orderBy: { updatedAt: "desc" },
            take: 1,
            select: {
              id: true,
              focusAreas: true,
              barriers: true,
              supports: true,
              preferencesText: true,
              safetyNotes: true,
              nextReviewDate: true,
              updatedAt: true
            }
          },
          progressNotes: {
            include: {
              createdByUser: {
                select: {
                  id: true,
                  name: true
                }
              },
              activityInstance: {
                select: {
                  id: true,
                  title: true,
                  location: true,
                  startAt: true
                }
              }
            },
            orderBy: { createdAt: "desc" },
            take: 120
          },
          attendance: {
            include: {
              activityInstance: {
                select: {
                  id: true,
                  title: true,
                  location: true,
                  startAt: true
                }
              }
            },
            orderBy: { createdAt: "desc" },
            take: 180
          },
          assessments: {
            orderBy: { createdAt: "desc" },
            take: 10,
            select: {
              id: true,
              createdAt: true,
              answers: true,
              suggestedPrograms: true,
              dislikesTriggers: true
            }
          },
          familyEngagementNotes: {
            orderBy: { createdAt: "desc" },
            take: 12,
            select: {
              id: true,
              createdAt: true,
              bestContactTimes: true,
              preferences: true,
              calmingThings: true
            }
          }
        }
      });

      if (!legacyResident) return null;

      return {
        ...legacyResident,
        preferredName: null,
        admissionDate: null,
        mdsManualDueDate: null
      };
    });

  if (!resident) {
    notFound();
  }

  const completionByResident = buildResidentCompletionsMap(
    resident.progressNotes.map((note) => ({
      residentId: note.residentId,
      narrative: note.narrative,
      createdAt: note.createdAt
    }))
  );

  const schedule = getResidentAssessmentSchedule({
    admissionDate: resident.admissionDate,
    residentCreatedAt: resident.createdAt,
    mdsManualDueDate: resident.mdsManualDueDate,
    status: resident.status,
    completions: completionByResident.get(resident.id)
  });

  const residentAge = getResidentAge(resident.birthDate ? resident.birthDate.toISOString() : null);
  const admissionDateIso = resident.admissionDate ? resident.admissionDate.toISOString() : null;
  const lengthOfStayMonths = monthDifference(parseDate(admissionDateIso), new Date());

  const documentationRows = resident.progressNotes.map((note) => {
    const meta = parseDocumentationMeta(note.narrative);
    const kind = meta?.kind ?? (note.type === "ONE_TO_ONE" ? "ONE_TO_ONE" : "PROGRESS");
    return {
      id: note.id,
      kind,
      status: meta?.status ?? "COMPLETED",
      assessmentType: meta?.assessmentType ?? null,
      createdAt: note.createdAt.toISOString(),
      dueDate: meta?.dueDate ?? null,
      reviewDate: meta?.reviewDate ?? null,
      narrative: stripDocumentationMeta(note.narrative),
      author: note.createdByUser.name
    };
  });

  const docsByType = {
    progress: documentationRows.filter((row) => row.kind === "PROGRESS"),
    oneToOne: documentationRows.filter((row) => row.kind === "ONE_TO_ONE"),
    uda: documentationRows.filter((row) => row.kind === "UDA"),
    mds: documentationRows.filter((row) => row.kind === "MDS")
  };

  const attendanceLast30 = resident.attendance.filter((entry) => {
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - 30);
    return entry.createdAt >= cutoff;
  });

  const attendedCount = attendanceLast30.filter((entry) =>
    entry.status === AttendanceStatus.PRESENT || entry.status === AttendanceStatus.ACTIVE || entry.status === AttendanceStatus.LEADING
  ).length;
  const refusedCount = attendanceLast30.filter((entry) => entry.status === AttendanceStatus.REFUSED).length;
  const noShowCount = attendanceLast30.filter((entry) => entry.status === AttendanceStatus.NO_SHOW).length;

  const participationPercent = attendanceLast30.length > 0 ? Math.round((attendedCount / attendanceLast30.length) * 100) : 0;

  const timelineMilestones = buildMilestones(
    schedule.anchorDateIso,
    schedule.quarterly.dueDateIso,
    schedule.annual.dueDateIso,
    schedule.mds.dueDateIso
  );

  const tabHref = (tab: ResidentTabKey) => `/app/residents/${resident.id}?tab=${tab}`;

  async function createLegacyAssessment(formData: FormData) {
    "use server";

    const scoped = await getFacilityContextWithSubscription();
    assertWritable(scoped.role);

    const parsed = assessmentSchema.parse({
      music: String(formData.get("music") || "") || undefined,
      topics: String(formData.get("topics") || "") || undefined,
      faith: String(formData.get("faith") || "") || undefined,
      hobbies: String(formData.get("hobbies") || "") || undefined,
      dislikesTriggers: String(formData.get("dislikesTriggers") || "") || undefined,
      bestTimeOfDay: String(formData.get("bestTimeOfDay") || "") || undefined
    });

    const suggestedPrograms = suggestProgramsFromAssessment(parsed);

    await prisma.interestAssessment.create({
      data: {
        residentId: params.id,
        answers: {
          music: parsed.music,
          topics: parsed.topics,
          faith: parsed.faith,
          hobbies: parsed.hobbies,
          bestTimeOfDay: parsed.bestTimeOfDay
        },
        dislikesTriggers: parsed.dislikesTriggers,
        suggestedPrograms
      }
    });

    revalidatePath(`/app/residents/${params.id}`);
  }

  async function createFamilyNote(formData: FormData) {
    "use server";

    const scoped = await getFacilityContextWithSubscription();
    assertWritable(scoped.role);

    const parsed = familySchema.parse({
      bestContactTimes: String(formData.get("bestContactTimes") || "") || undefined,
      preferences: String(formData.get("preferences") || "") || undefined,
      calmingThings: String(formData.get("calmingThings") || "") || undefined
    });

    await prisma.familyEngagementNote.create({
      data: {
        residentId: params.id,
        bestContactTimes: parsed.bestContactTimes,
        preferences: parsed.preferences,
        calmingThings: parsed.calmingThings
      }
    });

    revalidatePath(`/app/residents/${params.id}`);
  }

  return (
    <div className="relative isolate overflow-hidden rounded-[2rem] border border-[#1a2a48] bg-[#040814] px-3 pb-6 pt-4 md:px-5">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(1200px_520px_at_-8%_0%,rgba(56,189,248,0.18),transparent_62%),radial-gradient(980px_420px_at_95%_0%,rgba(139,92,246,0.24),transparent_62%),radial-gradient(800px_380px_at_45%_100%,rgba(59,130,246,0.14),transparent_72%)]" />

      <div className="relative z-10 space-y-4">
        <section className="rounded-[1.7rem] border border-[#24385e] bg-[linear-gradient(180deg,#0d1730_0%,#091126_100%)] p-4 md:p-5">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="flex min-w-0 items-start gap-3">
              <span className="inline-flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border border-cyan-300/35 bg-cyan-500/18 text-sm font-black text-cyan-100">
                {resident.firstName[0]}
                {resident.lastName[0]}
              </span>
              <div className="min-w-0">
                <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-[#95add8]">Resident Profile</p>
                <h1 className="mt-1 text-3xl font-black text-white md:text-4xl">{resident.firstName} {resident.lastName}</h1>
                <p className="mt-1 text-sm text-[#bcd0f0]">
                  {resident.preferredName ? `Preferred: “${resident.preferredName}” • ` : ""}
                  Room {resident.room} • {resident.unit?.name ?? "No unit"}
                </p>
                <p className="mt-1 text-xs text-[#94add7]">
                  Admission: {formatDate(admissionDateIso)} • Length of stay: {lengthOfStayMonths == null ? "Unknown" : `${lengthOfStayMonths} month${lengthOfStayMonths === 1 ? "" : "s"}`} • Birthday: {formatResidentBirthDate(resident.birthDate ? resident.birthDate.toISOString() : null)} • Age: {residentAge ?? "-"}
                </p>
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <Badge className="border-[#3c5d91] bg-[#122341] text-[#d8e6ff]">{toResidentStatusLabel(resident.status)}</Badge>
              {schedule.overdueCount > 0 ? <Badge className="border-rose-400/45 bg-rose-500/16 text-rose-100">Overdue {schedule.overdueCount}</Badge> : null}
              {isNeedsOneOnOne(resident.lastOneOnOneAt ? resident.lastOneOnOneAt.toISOString() : null, new Date(), 30) ? (
                <Badge className="border-violet-400/45 bg-violet-500/16 text-violet-100">1:1 Needed</Badge>
              ) : null}
            </div>
          </div>

          <div className="mt-4 flex flex-wrap gap-2">
            <Button asChild className="h-9 rounded-full border border-cyan-300/50 bg-cyan-500/20 px-4 text-xs font-semibold text-cyan-100 hover:bg-cyan-500/30">
              <Link href={`/app/documentation/progress-notes/new?residentId=${resident.id}`}>Add Progress Note</Link>
            </Button>
            <Button asChild variant="outline" className="h-9 rounded-full border-[#3a5b8f] bg-[#122342] px-4 text-xs text-[#d6e5ff] hover:bg-[#193055]">
              <Link href={`/app/documentation/one-to-one/new?residentId=${resident.id}`}>Add 1:1 Note</Link>
            </Button>
            <Button asChild variant="outline" className="h-9 rounded-full border-[#3a5b8f] bg-[#122342] px-4 text-xs text-[#d6e5ff] hover:bg-[#193055]">
              <Link href={`/app/documentation/uda?residentId=${resident.id}`}>Create / View UDA</Link>
            </Button>
            <Button asChild variant="outline" className="h-9 rounded-full border-[#3a5b8f] bg-[#122342] px-4 text-xs text-[#d6e5ff] hover:bg-[#193055]">
              <Link href={`/app/documentation/mds?residentId=${resident.id}`}>Create / View MDS</Link>
            </Button>
            <Button asChild variant="outline" className="h-9 rounded-full border-[#3a5b8f] bg-[#122342] px-4 text-xs text-[#d6e5ff] hover:bg-[#193055]">
              <Link href="/app/attendance">Attendance History</Link>
            </Button>
            <Button asChild variant="outline" className="h-9 rounded-full border-[#3a5b8f] bg-[#122342] px-4 text-xs text-[#d6e5ff] hover:bg-[#193055]">
              <Link href={`/app/residents/${resident.id}/care-plan`}>Care Plan</Link>
            </Button>
            <Button asChild variant="outline" className="h-9 rounded-full border-[#3a5b8f] bg-[#122342] px-4 text-xs text-[#d6e5ff] hover:bg-[#193055]">
              <Link href={`/app/residents?edit=${resident.id}`}>Edit Resident</Link>
            </Button>
            <Button asChild variant="outline" className="h-9 rounded-full border-[#3a5b8f] bg-[#122342] px-4 text-xs text-[#d6e5ff] hover:bg-[#193055]">
              <Link href="/app/residents">Back to Residents</Link>
            </Button>
          </div>
        </section>

        <nav className="grid grid-cols-2 gap-2 rounded-2xl border border-[#21365a] bg-[linear-gradient(180deg,#0e1a30_0%,#091326_100%)] p-2 sm:grid-cols-5">
          {[
            { key: "overview" as const, label: "Overview", icon: UserRound },
            { key: "assessments" as const, label: "Assessments & Due", icon: FileClock },
            { key: "documentation" as const, label: "Documentation", icon: NotebookPen },
            { key: "attendance" as const, label: "Attendance", icon: HeartPulse },
            { key: "preferences" as const, label: "Preferences", icon: ClipboardList }
          ].map((tab) => {
            const Icon = tab.icon;
            const active = tab.key === activeTab;
            return (
              <Link
                key={tab.key}
                href={tabHref(tab.key)}
                className={cn(
                  "inline-flex items-center justify-center gap-1.5 rounded-xl border px-3 py-2 text-xs font-semibold transition",
                  active
                    ? "border-cyan-300/45 bg-cyan-500/18 text-cyan-100"
                    : "border-[#33507f] bg-[#10203a] text-[#b9cff0] hover:border-[#4d73ab] hover:text-white"
                )}
              >
                <Icon className="h-3.5 w-3.5" />
                {tab.label}
              </Link>
            );
          })}
        </nav>

        {activeTab === "overview" ? (
          <section className="grid gap-4 lg:grid-cols-[minmax(0,1.1fr)_380px]">
            <article className="rounded-2xl border border-[#233a5f] bg-[linear-gradient(180deg,#0e1a30_0%,#0a1324_100%)] p-4">
              <h2 className="text-lg font-bold text-white">Resident Summary</h2>
              <p className="mt-1 text-sm text-[#aac0e6]">Profile, engagement context, and recent documentation highlights.</p>

              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                <div className="rounded-xl border border-[#314d79] bg-[#0e1a31] p-3">
                  <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[#93abd6]">Interests</p>
                  <p className="mt-1 text-sm text-[#dce9ff]">{resident.preferences || "No interests documented yet."}</p>
                </div>
                <div className="rounded-xl border border-[#314d79] bg-[#0e1a31] p-3">
                  <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[#93abd6]">Best Engagement Window</p>
                  <p className="mt-1 text-sm text-[#dce9ff]">{resident.bestTimesOfDay || "Not set"}</p>
                </div>
                <div className="rounded-xl border border-[#314d79] bg-[#0e1a31] p-3">
                  <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[#93abd6]">Safety / Barriers</p>
                  <p className="mt-1 text-sm text-[#dce9ff]">{resident.safetyNotes || "No safety notes."}</p>
                </div>
                <div className="rounded-xl border border-[#314d79] bg-[#0e1a31] p-3">
                  <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[#93abd6]">Follow-up Notes</p>
                  <p className="mt-1 text-sm text-[#dce9ff]">{resident.notes || "No additional notes."}</p>
                </div>
              </div>

              <div className="mt-4 rounded-xl border border-[#314d79] bg-[#0d182f] p-3">
                <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[#93abd6]">Recent Engagement</p>
                <ul className="mt-2 space-y-2">
                  {resident.progressNotes.slice(0, 6).map((note) => (
                    <li key={note.id} className="rounded-lg border border-[#355281] bg-[#10203a] p-2">
                      <p className="text-[11px] text-[#90a9d5]">{formatDateTime(note.createdAt.toISOString())} • {note.createdByUser.name}</p>
                      <p className="mt-1 text-sm text-[#d8e7ff] line-clamp-2">{stripDocumentationMeta(note.narrative) || "No narrative text."}</p>
                    </li>
                  ))}
                </ul>
              </div>
            </article>

            <aside className="space-y-4">
              <article className="rounded-2xl border border-[#233a5f] bg-[linear-gradient(180deg,#10203a_0%,#0b1528_100%)] p-4">
                <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[#92abd6]">Assessment Snapshot</p>
                <div className="mt-3 space-y-2">
                  {[
                    { label: "Quarterly UDA", status: schedule.quarterly },
                    { label: "Annual UDA", status: schedule.annual },
                    { label: "MDS", status: schedule.mds }
                  ].map((item) => (
                    <div key={item.label} className="rounded-lg border border-[#34527f] bg-[#11203b] p-2">
                      <div className="flex items-center justify-between gap-2">
                        <p className="text-xs font-semibold text-white">{item.label}</p>
                        <Badge className={cn("border text-[10px]", dueBadgeClass(item.status.level))}>{item.status.label}</Badge>
                      </div>
                      <p className={cn("mt-1 text-[11px]", statusToneClass(item.status.level))}>Due: {formatDate(item.status.dueDateIso)}</p>
                    </div>
                  ))}
                </div>
              </article>

              <article className="rounded-2xl border border-[#233a5f] bg-[linear-gradient(180deg,#10203a_0%,#0b1528_100%)] p-4">
                <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[#92abd6]">Status Badges</p>
                <div className="mt-3 flex flex-wrap gap-2">
                  {resident.followUpFlag ? <Badge className="border-amber-300/45 bg-amber-500/16 text-amber-100">Follow-up flagged</Badge> : null}
                  {schedule.overdueCount > 0 ? <Badge className="border-rose-400/45 bg-rose-500/16 text-rose-100">Overdue</Badge> : null}
                  {schedule.dueSoonCount > 0 ? <Badge className="border-blue-400/45 bg-blue-500/16 text-blue-100">Due soon</Badge> : null}
                  {isNeedsOneOnOne(resident.lastOneOnOneAt ? resident.lastOneOnOneAt.toISOString() : null, new Date(), 30) ? (
                    <Badge className="border-violet-400/45 bg-violet-500/16 text-violet-100">1:1 Needed</Badge>
                  ) : (
                    <Badge className="border-emerald-400/45 bg-emerald-500/16 text-emerald-100">1:1 Current</Badge>
                  )}
                  {participationPercent < 40 ? <Badge className="border-rose-400/45 bg-rose-500/16 text-rose-100">Low Participation</Badge> : null}
                </div>
              </article>
            </aside>
          </section>
        ) : null}

        {activeTab === "assessments" ? (
          <section className="space-y-4">
            <div className="grid gap-3 md:grid-cols-3">
              {[
                { title: "Quarterly UDA", status: schedule.quarterly, icon: FileClock },
                { title: "Annual UDA", status: schedule.annual, icon: ClipboardList },
                { title: "MDS", status: schedule.mds, icon: CalendarClock }
              ].map((item) => {
                const Icon = item.icon;
                return (
                  <article key={item.title} className="rounded-2xl border border-[#223a5f] bg-[linear-gradient(180deg,#101f39_0%,#0b1528_100%)] p-4">
                    <div className="flex items-center justify-between gap-2">
                      <div className="inline-flex items-center gap-2">
                        <span className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-[#3c5c90] bg-[#122443]">
                          <Icon className="h-4 w-4 text-cyan-200" />
                        </span>
                        <h2 className="text-sm font-semibold text-white">{item.title}</h2>
                      </div>
                      <Badge className={cn("border text-[10px]", dueBadgeClass(item.status.level))}>{item.status.label}</Badge>
                    </div>
                    <p className="mt-3 text-sm text-[#dce8ff]">Next due: {formatDate(item.status.dueDateIso)}</p>
                    <p className="mt-1 text-xs text-[#9cb4de]">Last completed: {formatDate(item.status.lastCompletedIso)}</p>
                  </article>
                );
              })}
            </div>

            <article className="rounded-2xl border border-[#223a5f] bg-[linear-gradient(180deg,#0f1c35_0%,#0a1325_100%)] p-4">
              <h2 className="text-lg font-bold text-white">Assessment Timeline</h2>
              <p className="mt-1 text-sm text-[#9eb6df]">Admission anchor and recurring quarterly / annual / MDS checkpoints.</p>

              <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
                {timelineMilestones.map((milestone, index) => (
                  <div key={`${milestone.label}-${index}`} className="rounded-xl border border-[#314d79] bg-[#0f1c33] p-3">
                    <div className="mb-2 flex items-center gap-2">
                      <span className={cn("inline-flex h-2 w-2 rounded-full", milestone.accent)} />
                      <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[#93abd7]">{milestone.label}</p>
                    </div>
                    <p className="text-sm font-medium text-[#e1ecff]">{formatDate(milestone.date)}</p>
                  </div>
                ))}
              </div>
            </article>
          </section>
        ) : null}

        {activeTab === "documentation" ? (
          <section className="space-y-4">
            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
              {[
                { label: "Progress Notes", value: docsByType.progress.length },
                { label: "1:1 Notes", value: docsByType.oneToOne.length },
                { label: "UDA Records", value: docsByType.uda.length },
                { label: "MDS Records", value: docsByType.mds.length }
              ].map((item) => (
                <article key={item.label} className="rounded-xl border border-[#264068] bg-[#101f3a] p-3">
                  <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[#95aed9]">{item.label}</p>
                  <p className="mt-2 text-2xl font-black text-white">{item.value}</p>
                </article>
              ))}
            </div>

            <article className="rounded-2xl border border-[#223a5f] bg-[linear-gradient(180deg,#0f1d37_0%,#0a1325_100%)] p-4">
              <h2 className="text-lg font-bold text-white">Resident Documentation History</h2>
              <p className="mt-1 text-sm text-[#9eb6df]">Progress Notes, 1:1 Notes, UDA, and MDS entries for this resident.</p>
              <div className="mt-4 space-y-2">
                {documentationRows.map((entry) => (
                  <div key={entry.id} className="rounded-xl border border-[#314d79] bg-[#0f1b33] p-3">
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge className="border-[#3a5d93] bg-[#132648] text-[10px] text-[#d9e6ff]">{entry.kind}</Badge>
                      {entry.assessmentType ? <Badge className="border-violet-400/40 bg-violet-500/16 text-[10px] text-violet-100">{entry.assessmentType}</Badge> : null}
                      <Badge className="border-[#3a5d93] bg-[#132648] text-[10px] text-[#d9e6ff]">{entry.status}</Badge>
                      <span className="text-[11px] text-[#96afd9]">{formatDateTime(entry.createdAt)} • {entry.author}</span>
                    </div>
                    <p className="mt-2 text-sm text-[#dce8ff] line-clamp-3">{entry.narrative || "No narrative provided."}</p>
                  </div>
                ))}
              </div>
            </article>
          </section>
        ) : null}

        {activeTab === "attendance" ? (
          <section className="space-y-4">
            <div className="grid gap-3 md:grid-cols-4">
              {[
                { label: "Participation (30d)", value: `${participationPercent}%` },
                { label: "Attended", value: attendedCount },
                { label: "Refused", value: refusedCount },
                { label: "No Show", value: noShowCount }
              ].map((item) => (
                <article key={item.label} className="rounded-xl border border-[#264068] bg-[#101f3a] p-3">
                  <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[#95aed9]">{item.label}</p>
                  <p className="mt-2 text-2xl font-black text-white">{item.value}</p>
                </article>
              ))}
            </div>

            <article className="rounded-2xl border border-[#223a5f] bg-[linear-gradient(180deg,#0f1d37_0%,#0a1325_100%)] p-4">
              <h2 className="text-lg font-bold text-white">Attendance & Participation</h2>
              <p className="mt-1 text-sm text-[#9eb6df]">Latest attendance records and participation response trends.</p>
              <div className="mt-4 space-y-2">
                {resident.attendance.slice(0, 40).map((entry) => (
                  <div key={entry.id} className="rounded-xl border border-[#314d79] bg-[#0f1b33] p-3">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <p className="text-sm font-semibold text-white">{entry.activityInstance.title}</p>
                      <Badge className="border-[#3a5d93] bg-[#132648] text-[10px] text-[#d9e6ff]">{entry.status}</Badge>
                    </div>
                    <p className="mt-1 text-[11px] text-[#95aed8]">{formatDateTime(entry.createdAt.toISOString())} • {entry.activityInstance.location}</p>
                    {entry.barrierReason ? <p className="mt-1 text-xs text-[#c9daf8]">Barrier: {entry.barrierReason}</p> : null}
                    {entry.notes ? <p className="mt-1 text-xs text-[#c9daf8]">{entry.notes}</p> : null}
                  </div>
                ))}
              </div>
            </article>
          </section>
        ) : null}

        {activeTab === "preferences" ? (
          <section className="grid gap-4 lg:grid-cols-[minmax(0,1.1fr)_380px]">
            <article className="rounded-2xl border border-[#223a5f] bg-[linear-gradient(180deg,#0f1c35_0%,#0a1325_100%)] p-4">
              <h2 className="text-lg font-bold text-white">Preferences & Care Plan</h2>
              <p className="mt-1 text-sm text-[#9eb6df]">Resident interests, barriers, intervention preferences, and activity approach notes.</p>

              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                <div className="rounded-xl border border-[#314d79] bg-[#0f1b33] p-3">
                  <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[#93abd6]">Interests</p>
                  <p className="mt-1 text-sm text-[#dce8ff]">{resident.preferences || "No interests documented."}</p>
                </div>
                <div className="rounded-xl border border-[#314d79] bg-[#0f1b33] p-3">
                  <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[#93abd6]">Best Times</p>
                  <p className="mt-1 text-sm text-[#dce8ff]">{resident.bestTimesOfDay || "Not documented"}</p>
                </div>
                <div className="rounded-xl border border-[#314d79] bg-[#0f1b33] p-3">
                  <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[#93abd6]">Safety / Barriers</p>
                  <p className="mt-1 text-sm text-[#dce8ff]">{resident.safetyNotes || "No safety notes documented."}</p>
                </div>
                <div className="rounded-xl border border-[#314d79] bg-[#0f1b33] p-3">
                  <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[#93abd6]">Care Plan Next Review</p>
                  <p className="mt-1 text-sm text-[#dce8ff]">{formatDate(resident.carePlans[0]?.nextReviewDate?.toISOString() ?? null)}</p>
                </div>
              </div>

              <div className="mt-4 rounded-xl border border-[#314d79] bg-[#0f1b33] p-3">
                <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[#93abd6]">Care Plan Preferences Text</p>
                <p className="mt-1 text-sm text-[#dce8ff]">{resident.carePlans[0]?.preferencesText || "No care plan preference text available."}</p>
              </div>

              <div className="mt-4 rounded-xl border border-[#314d79] bg-[#0f1b33] p-3">
                <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[#93abd6]">Care Plan Safety Notes</p>
                <p className="mt-1 text-sm text-[#dce8ff]">{resident.carePlans[0]?.safetyNotes || "No care plan safety notes available."}</p>
              </div>

              <div className="mt-4 grid gap-3 lg:grid-cols-2">
                <form action={createLegacyAssessment} className="rounded-xl border border-[#314d79] bg-[#0f1b33] p-3">
                  <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[#93abd6]">Legacy Interest Assessment</p>
                  <div className="mt-2 space-y-2">
                    <Input name="music" placeholder="Music preferences" className="border-[#3b5d90] bg-[#122341] text-[#dbe8ff]" />
                    <Input name="topics" placeholder="Topics of interest" className="border-[#3b5d90] bg-[#122341] text-[#dbe8ff]" />
                    <Input name="faith" placeholder="Faith/spiritual preferences" className="border-[#3b5d90] bg-[#122341] text-[#dbe8ff]" />
                    <Input name="hobbies" placeholder="Hobbies" className="border-[#3b5d90] bg-[#122341] text-[#dbe8ff]" />
                    <Input name="bestTimeOfDay" placeholder="Best time of day" className="border-[#3b5d90] bg-[#122341] text-[#dbe8ff]" />
                    <Textarea name="dislikesTriggers" placeholder="Dislikes / trigger notes" className="border-[#3b5d90] bg-[#122341] text-[#dbe8ff]" />
                  </div>
                  <Button type="submit" className="mt-3 h-8 rounded-full border border-cyan-300/50 bg-cyan-500/20 px-4 text-xs font-semibold text-cyan-100 hover:bg-cyan-500/30">
                    Save Assessment
                  </Button>
                </form>

                <form action={createFamilyNote} className="rounded-xl border border-[#314d79] bg-[#0f1b33] p-3">
                  <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[#93abd6]">Family Engagement Note</p>
                  <div className="mt-2 space-y-2">
                    <Input name="bestContactTimes" placeholder="Best contact times" className="border-[#3b5d90] bg-[#122341] text-[#dbe8ff]" />
                    <Input name="preferences" placeholder="Family contact preferences" className="border-[#3b5d90] bg-[#122341] text-[#dbe8ff]" />
                    <Textarea name="calmingThings" placeholder="Calming techniques" className="border-[#3b5d90] bg-[#122341] text-[#dbe8ff]" />
                  </div>
                  <Button type="submit" className="mt-3 h-8 rounded-full border border-violet-300/50 bg-violet-500/20 px-4 text-xs font-semibold text-violet-100 hover:bg-violet-500/30">
                    Add Family Note
                  </Button>
                </form>
              </div>
            </article>

            <aside className="space-y-4">
              <article className="rounded-2xl border border-[#223a5f] bg-[linear-gradient(180deg,#10203a_0%,#0b1528_100%)] p-4">
                <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[#92abd6]">Care Plan Areas</p>
                <div className="mt-3 flex flex-wrap gap-2">
                  {(Array.isArray(resident.carePlans[0]?.focusAreas) ? resident.carePlans[0]?.focusAreas : []).map((area) => (
                    <Badge key={String(area)} className="border-[#395d93] bg-[#132648] text-[10px] text-[#d9e6ff]">
                      {String(area)}
                    </Badge>
                  ))}
                  {(Array.isArray(resident.carePlans[0]?.focusAreas) ? resident.carePlans[0]?.focusAreas : []).length === 0 ? (
                    <p className="text-sm text-[#9eb6df]">No focus areas documented.</p>
                  ) : null}
                </div>
              </article>

              <article className="rounded-2xl border border-[#223a5f] bg-[linear-gradient(180deg,#10203a_0%,#0b1528_100%)] p-4">
                <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[#92abd6]">Legacy Assessments</p>
                <ul className="mt-3 space-y-2">
                  {resident.assessments.slice(0, 5).map((assessment) => (
                    <li key={assessment.id} className="rounded-lg border border-[#314d79] bg-[#0f1b33] p-2">
                      <p className="text-xs text-[#e2ecff]">{formatDateTime(assessment.createdAt.toISOString())}</p>
                      <p className="mt-1 text-[11px] text-[#a3bbe2]">{assessment.dislikesTriggers || "No triggers noted"}</p>
                    </li>
                  ))}
                  {resident.assessments.length === 0 ? <p className="text-sm text-[#9eb6df]">No legacy assessments yet.</p> : null}
                </ul>
              </article>

              <article className="rounded-2xl border border-[#223a5f] bg-[linear-gradient(180deg,#10203a_0%,#0b1528_100%)] p-4">
                <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[#92abd6]">Family Engagement Notes</p>
                <ul className="mt-3 space-y-2">
                  {resident.familyEngagementNotes.slice(0, 5).map((note) => (
                    <li key={note.id} className="rounded-lg border border-[#314d79] bg-[#0f1b33] p-2">
                      <p className="text-xs text-[#e2ecff]">{formatDateTime(note.createdAt.toISOString())}</p>
                      <p className="mt-1 text-[11px] text-[#a3bbe2]">{note.preferences || "No preference note"}</p>
                    </li>
                  ))}
                  {resident.familyEngagementNotes.length === 0 ? <p className="text-sm text-[#9eb6df]">No family notes yet.</p> : null}
                </ul>
              </article>
            </aside>
          </section>
        ) : null}
      </div>
    </div>
  );
}
