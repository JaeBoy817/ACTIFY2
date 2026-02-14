import Link from "next/link";
import { notFound } from "next/navigation";
import { revalidatePath } from "next/cache";
import { subDays } from "date-fns";
import { z } from "zod";

import { GoalProgressChart } from "@/components/app/goal-progress-chart";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";
import { logAudit } from "@/lib/audit";
import { getFacilityContextWithSubscription } from "@/lib/page-guards";
import { assertWritable } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";

const goalSchema = z.object({
  type: z.enum(["SOCIALIZATION", "COGNITION", "MOBILITY_ENGAGEMENT", "LEISURE_SKILLS"]),
  description: z.string().min(3),
  targetMetric: z.string().optional()
});

const evidenceSchema = z.object({
  goalId: z.string().min(1),
  attendanceId: z.string().optional(),
  noteId: z.string().optional()
});

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

export default async function ResidentProfilePage({ params }: { params: { id: string } }) {
  const context = await getFacilityContextWithSubscription();

  const resident = await prisma.resident.findFirst({
    where: {
      id: params.id,
      facilityId: context.facilityId
    },
    include: {
      unit: true,
      carePlanGoals: {
        orderBy: { createdAt: "desc" },
        include: {
          goalLinks: {
            include: {
              attendance: {
                include: { activityInstance: true }
              },
              note: {
                include: { activityInstance: true }
              }
            }
          }
        }
      },
      assessments: {
        orderBy: { createdAt: "desc" },
        take: 5
      },
      familyEngagementNotes: {
        orderBy: { createdAt: "desc" },
        take: 10
      },
      progressNotes: {
        include: { activityInstance: true, createdByUser: true },
        orderBy: { createdAt: "desc" },
        take: 25
      },
      attendance: {
        include: { activityInstance: true },
        orderBy: { createdAt: "desc" },
        take: 30
      }
    }
  });

  if (!resident) notFound();

  const ninetyDays = subDays(new Date(), 90);
  const thirtyDays = subDays(new Date(), 30);

  const goalProgressByMonth = new Map<string, number>();
  resident.carePlanGoals.forEach((goal) => {
    goal.goalLinks
      .filter((link) => link.createdAt >= ninetyDays)
      .forEach((link) => {
        const label = link.createdAt.toLocaleDateString("en-US", { month: "short", year: "2-digit" });
        goalProgressByMonth.set(label, (goalProgressByMonth.get(label) ?? 0) + 1);
      });
  });

  const chartData = Array.from(goalProgressByMonth.entries()).map(([month, count]) => ({ month, count }));

  const last30EvidenceCount = resident.carePlanGoals.reduce(
    (total, goal) => total + goal.goalLinks.filter((link) => link.createdAt >= thirtyDays).length,
    0
  );

  async function createGoal(formData: FormData) {
    "use server";

    const scoped = await getFacilityContextWithSubscription();
    assertWritable(scoped.role);

    const parsed = goalSchema.parse({
      type: formData.get("type"),
      description: formData.get("description"),
      targetMetric: formData.get("targetMetric") || undefined
    });

    const goal = await prisma.carePlanGoal.create({
      data: {
        residentId: params.id,
        type: parsed.type,
        description: parsed.description,
        targetMetric: parsed.targetMetric,
        isActive: true
      }
    });

    await logAudit({
      facilityId: scoped.facilityId,
      actorUserId: scoped.user.id,
      action: "CREATE",
      entityType: "CarePlanGoal",
      entityId: goal.id,
      after: goal
    });

    revalidatePath(`/app/residents/${params.id}`);
  }

  async function linkEvidence(formData: FormData) {
    "use server";

    const scoped = await getFacilityContextWithSubscription();
    assertWritable(scoped.role);

    const parsed = evidenceSchema.parse({
      goalId: formData.get("goalId"),
      attendanceId: formData.get("attendanceId") || undefined,
      noteId: formData.get("noteId") || undefined
    });

    if (!parsed.attendanceId && !parsed.noteId) {
      return;
    }

    const link = await prisma.goalLink.create({
      data: {
        goalId: parsed.goalId,
        attendanceId: parsed.attendanceId || null,
        noteId: parsed.noteId || null
      }
    });

    await logAudit({
      facilityId: scoped.facilityId,
      actorUserId: scoped.user.id,
      action: "CREATE",
      entityType: "GoalLink",
      entityId: link.id,
      after: link
    });

    revalidatePath(`/app/residents/${params.id}`);
  }

  async function createAssessment(formData: FormData) {
    "use server";

    const scoped = await getFacilityContextWithSubscription();
    assertWritable(scoped.role);

    const parsed = assessmentSchema.parse({
      music: formData.get("music") || undefined,
      topics: formData.get("topics") || undefined,
      faith: formData.get("faith") || undefined,
      hobbies: formData.get("hobbies") || undefined,
      dislikesTriggers: formData.get("dislikesTriggers") || undefined,
      bestTimeOfDay: formData.get("bestTimeOfDay") || undefined
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
      bestContactTimes: formData.get("bestContactTimes") || undefined,
      preferences: formData.get("preferences") || undefined,
      calmingThings: formData.get("calmingThings") || undefined
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
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">{resident.firstName} {resident.lastName}</h1>
          <p className="text-sm text-muted-foreground">
            Room {resident.room} · {resident.unit?.name ?? "No unit"}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button asChild>
            <Link href={`/app/residents/${resident.id}/care-plan`}>Care Plan</Link>
          </Button>
          <Button asChild variant="outline">
            <Link href={`/app/notes/one-to-one?residentId=${resident.id}`}>1:1 Notes</Link>
          </Button>
          <Button asChild variant="outline">
            <Link href="/app/residents">Back to residents</Link>
          </Button>
        </div>
      </div>

      <section className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Goals tracked</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-semibold">{resident.carePlanGoals.length}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Evidence last 30 days</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-semibold">{last30EvidenceCount}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Notes (recent)</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-semibold">{resident.progressNotes.length}</p>
          </CardContent>
        </Card>
      </section>

      <Card>
        <CardHeader>
          <CardTitle>Goal progress (last 90 days)</CardTitle>
        </CardHeader>
        <CardContent>
          <GoalProgressChart data={chartData} />
        </CardContent>
      </Card>

      <section className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Create care plan goal</CardTitle>
          </CardHeader>
          <CardContent>
            <form action={createGoal} className="space-y-3">
              <Select name="type" defaultValue="SOCIALIZATION">
                <SelectTrigger>
                  <SelectValue placeholder="Goal type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="SOCIALIZATION">Socialization</SelectItem>
                  <SelectItem value="COGNITION">Cognition</SelectItem>
                  <SelectItem value="MOBILITY_ENGAGEMENT">Mobility/Engagement</SelectItem>
                  <SelectItem value="LEISURE_SKILLS">Leisure skills</SelectItem>
                </SelectContent>
              </Select>
              <Textarea name="description" placeholder="Goal description" required />
              <Input name="targetMetric" placeholder="Target metric (optional)" />
              <Button type="submit">Add goal</Button>
            </form>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Link goal evidence</CardTitle>
          </CardHeader>
          <CardContent>
            <form action={linkEvidence} className="space-y-3">
              <select name="goalId" className="h-10 w-full rounded-md border px-3 text-sm" required>
                <option value="">Select goal</option>
                {resident.carePlanGoals.map((goal) => (
                  <option key={goal.id} value={goal.id}>
                    {goal.type}: {goal.description.slice(0, 70)}
                  </option>
                ))}
              </select>
              <select name="attendanceId" className="h-10 w-full rounded-md border px-3 text-sm">
                <option value="">Attendance evidence (optional)</option>
                {resident.attendance.map((attendance) => (
                  <option key={attendance.id} value={attendance.id}>
                    {attendance.activityInstance.title} - {attendance.status}
                  </option>
                ))}
              </select>
              <select name="noteId" className="h-10 w-full rounded-md border px-3 text-sm">
                <option value="">Progress note evidence (optional)</option>
                {resident.progressNotes.map((note) => (
                  <option key={note.id} value={note.id}>
                    {new Date(note.createdAt).toLocaleDateString()} - {note.type}
                  </option>
                ))}
              </select>
              <Button type="submit" variant="outline">Link evidence</Button>
            </form>
          </CardContent>
        </Card>
      </section>

      <Card>
        <CardHeader>
          <CardTitle>Goal evidence list</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {resident.carePlanGoals.map((goal) => (
            <div key={goal.id} className="rounded-md border p-4">
              <div className="mb-2 flex flex-wrap items-center gap-2">
                <Badge variant="outline">{goal.type}</Badge>
                <p className="text-sm font-medium">{goal.description}</p>
              </div>
              <ul className="space-y-2 text-sm text-muted-foreground">
                {goal.goalLinks.length === 0 && <li>No linked evidence yet.</li>}
                {goal.goalLinks.map((link) => (
                  <li key={link.id} className="rounded-md bg-muted/40 p-2">
                    {link.attendance ? `Attendance: ${link.attendance.activityInstance.title} (${link.attendance.status})` : ""}
                    {link.note ? ` Note: ${new Date(link.note.createdAt).toLocaleDateString()} ${link.note.type}` : ""}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </CardContent>
      </Card>

      <section className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Interest & leisure assessment</CardTitle>
          </CardHeader>
          <CardContent>
            <form action={createAssessment} className="space-y-3">
              <Input name="music" placeholder="Music preferences" />
              <Input name="topics" placeholder="Topics of interest" />
              <Input name="faith" placeholder="Faith/spiritual preferences" />
              <Input name="hobbies" placeholder="Hobbies" />
              <Input name="bestTimeOfDay" placeholder="Best time of day" />
              <Textarea name="dislikesTriggers" placeholder="Dislikes / trigger notes" />
              <Button type="submit">Save assessment</Button>
            </form>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Family engagement notes</CardTitle>
          </CardHeader>
          <CardContent>
            <form action={createFamilyNote} className="space-y-3">
              <Input name="bestContactTimes" placeholder="Best contact times" />
              <Input name="preferences" placeholder="Family contact preferences" />
              <Textarea name="calmingThings" placeholder="Calming things / successful techniques" />
              <Button type="submit" variant="outline">Add family note</Button>
            </form>
          </CardContent>
        </Card>
      </section>

      <Card>
        <CardHeader>
          <CardTitle>Assessment suggestions</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {resident.assessments.length === 0 && <p className="text-sm text-muted-foreground">No assessments yet.</p>}
          {resident.assessments.map((assessment) => {
            const suggestedPrograms = Array.isArray(assessment.suggestedPrograms) ? assessment.suggestedPrograms : [];
            return (
              <div key={assessment.id} className="rounded-md border p-3">
                <p className="mb-2 text-xs text-muted-foreground">{new Date(assessment.createdAt).toLocaleString()}</p>
                <div className="flex flex-wrap gap-2">
                  {suggestedPrograms.map((program) => (
                    <Badge key={String(program)} variant="secondary">
                      {String(program)}
                    </Badge>
                  ))}
                </div>
              </div>
            );
          })}
        </CardContent>
      </Card>

      <section className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Progress note timeline</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-3 text-sm">
              {resident.progressNotes.map((note) => (
                <li key={note.id} className="rounded-md border p-3">
                  <p className="text-xs text-muted-foreground">
                    {new Date(note.createdAt).toLocaleString()} · {note.type} · by {note.createdByUser.name}
                  </p>
                  <p className="mt-2">{note.narrative}</p>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Attendance log</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Activity</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Barrier</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {resident.attendance.map((item) => (
                  <TableRow key={item.id}>
                    <TableCell>{new Date(item.createdAt).toLocaleDateString()}</TableCell>
                    <TableCell>{item.activityInstance.title}</TableCell>
                    <TableCell>{item.status}</TableCell>
                    <TableCell>{item.barrierReason ?? "-"}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </section>
    </div>
  );
}
