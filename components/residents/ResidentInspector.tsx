"use client";

import Link from "next/link";
import { useEffect, useMemo, useState, useTransition } from "react";
import { CalendarClock, ClipboardEdit, HeartHandshake, ShieldAlert, Sparkles } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import {
  daysSince,
  formatResidentBirthDate,
  getResidentAge,
  toResidentStatusLabel,
  type ResidentListRow
} from "@/lib/residents/types";
import { useToast } from "@/lib/use-toast";

function formatDate(value: string | null) {
  if (!value) return "Not yet documented";
  return new Date(value).toLocaleDateString();
}

export function ResidentInspector({
  resident,
  canEdit,
  onOpenEditResident,
  onUpdateResident
}: {
  resident: ResidentListRow | null;
  canEdit: boolean;
  onOpenEditResident: (resident: ResidentListRow) => void;
  onUpdateResident: (residentId: string, patch: { preferences?: string; safetyNotes?: string; followUpFlag?: boolean }) => Promise<void>;
}) {
  const { toast } = useToast();
  const [preferenceModalOpen, setPreferenceModalOpen] = useState(false);
  const [safetyModalOpen, setSafetyModalOpen] = useState(false);
  const [preferenceDraft, setPreferenceDraft] = useState("");
  const [safetyDraft, setSafetyDraft] = useState("");
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    setPreferenceDraft(resident?.preferences ?? "");
    setSafetyDraft(resident?.safetyNotes ?? "");
  }, [resident]);

  const daysSinceLast = useMemo(() => daysSince(resident?.lastOneOnOneAt ?? null), [resident?.lastOneOnOneAt]);
  const residentAge = useMemo(() => getResidentAge(resident?.birthDate ?? null), [resident?.birthDate]);
  const residentId = resident?.id ?? null;

  if (!resident) {
    return (
      <section className="glass-panel sticky top-24 rounded-2xl border-white/15 p-6 shadow-xl shadow-black/10">
        <h3 className="font-[var(--font-display)] text-xl text-foreground">Resident Inspector</h3>
        <p className="mt-2 text-sm text-muted-foreground">
          Select a resident from the list to view details, update care context, and take quick actions.
        </p>
      </section>
    );
  }

  async function savePreferences() {
    if (!canEdit || !residentId) return;
    startTransition(async () => {
      try {
        await onUpdateResident(residentId, { preferences: preferenceDraft.trim() });
        toast({ title: "Preferences updated" });
        setPreferenceModalOpen(false);
      } catch (error) {
        toast({
          title: "Could not update preferences",
          description: error instanceof Error ? error.message : "Try again.",
          variant: "destructive"
        });
      }
    });
  }

  async function saveSafetyNotes() {
    if (!canEdit || !residentId) return;
    startTransition(async () => {
      try {
        await onUpdateResident(residentId, { safetyNotes: safetyDraft.trim() });
        toast({ title: "Safety notes updated" });
        setSafetyModalOpen(false);
      } catch (error) {
        toast({
          title: "Could not update safety notes",
          description: error instanceof Error ? error.message : "Try again.",
          variant: "destructive"
        });
      }
    });
  }

  return (
    <section className="glass-panel sticky top-24 rounded-2xl border-white/15 p-4 shadow-xl shadow-black/10">
      <div className="border-b border-white/20 pb-3">
        <div className="flex items-start justify-between gap-2">
          <div>
            <h3 className="font-[var(--font-display)] text-2xl text-foreground">
              {resident.firstName} {resident.lastName}
            </h3>
            <p className="text-sm text-foreground/70">Room {resident.room}</p>
            <p className="text-xs text-foreground/65">
              Birthday {formatResidentBirthDate(resident.birthDate)} • Age {residentAge ?? "—"}
            </p>
          </div>
          <Badge className="border border-white/30 bg-white/70 text-foreground">
            {toResidentStatusLabel(resident.status)}
          </Badge>
        </div>

        <div className="mt-3 grid grid-cols-2 gap-2">
          <Button asChild size="sm" className="justify-start shadow-lg shadow-actifyBlue/25">
            <Link href={`/app/notes/new?residentId=${resident.id}&type=ONE_TO_ONE`}>
              <HeartHandshake className="mr-1 h-4 w-4" />
              Start 1:1 Note
            </Link>
          </Button>
          <Button
            type="button"
            size="sm"
            variant="outline"
            className="justify-start bg-white/75 shadow-lg shadow-black/10"
            onClick={() => setPreferenceModalOpen(true)}
            disabled={!canEdit}
          >
            <Sparkles className="mr-1 h-4 w-4" />
            Add Preference
          </Button>
          <Button
            type="button"
            size="sm"
            variant="outline"
            className="justify-start bg-white/75 shadow-lg shadow-black/10"
            onClick={() => setSafetyModalOpen(true)}
            disabled={!canEdit}
          >
            <ShieldAlert className="mr-1 h-4 w-4" />
            Add Safety Note
          </Button>
          <Button
            type="button"
            size="sm"
            variant="outline"
            className="justify-start bg-white/75 shadow-lg shadow-black/10"
            onClick={() => onOpenEditResident(resident)}
            disabled={!canEdit}
          >
            <ClipboardEdit className="mr-1 h-4 w-4" />
            Edit
          </Button>
        </div>
      </div>

      <Accordion type="multiple" defaultValue={["overview"]} className="mt-2">
        <AccordionItem value="overview" className="border-b border-white/20">
          <AccordionTrigger>Overview</AccordionTrigger>
          <AccordionContent>
            <div className="space-y-3 rounded-xl bg-white/45 p-3 shadow-lg shadow-black/10">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-foreground/65">Preferences</p>
                <p className="mt-1 text-sm text-foreground/85">{resident.preferences || "No preference added yet."}</p>
              </div>
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-foreground/65">Safety Notes</p>
                <p className="mt-1 text-sm text-foreground/85">{resident.safetyNotes || "No safety notes documented."}</p>
              </div>
              <div className="rounded-lg border border-white/20 bg-white/60 p-2 text-xs text-foreground/75">
                <div className="mb-2 rounded-lg border border-white/20 bg-white/70 p-2">
                  <p className="text-[11px] font-semibold uppercase tracking-wide text-foreground/65">Birthday + Age</p>
                  <p className="mt-1 text-sm text-foreground">
                    {formatResidentBirthDate(resident.birthDate)} • Age {residentAge ?? "—"}
                  </p>
                </div>
                <div className="flex items-center gap-1 font-medium text-foreground">
                  <CalendarClock className="h-3.5 w-3.5 text-actifyBlue" />
                  Last 1:1
                </div>
                <p className="mt-1">{formatDate(resident.lastOneOnOneAt)}</p>
                <p className="text-foreground/60">
                  {daysSinceLast == null ? "No 1:1 logged yet." : `${daysSinceLast} day(s) since last 1:1.`}
                </p>
              </div>
            </div>
          </AccordionContent>
        </AccordionItem>

        <AccordionItem value="care-plan" className="border-b border-white/20">
          <AccordionTrigger>Care Plan Snapshot</AccordionTrigger>
          <AccordionContent>
            <div className="rounded-xl bg-white/45 p-3 shadow-lg shadow-black/10">
              {resident.carePlanAreas.length === 0 ? (
                <p className="text-sm text-muted-foreground">No care plan focus areas available.</p>
              ) : (
                <div className="flex flex-wrap gap-2">
                  {resident.carePlanAreas.map((area) => (
                    <Badge key={area} variant="outline" className="bg-white/70">
                      {area}
                    </Badge>
                  ))}
                </div>
              )}
              <div className="mt-3 text-xs text-foreground/65">
                <Link href={`/app/residents/${resident.id}/care-plan`} className="underline underline-offset-2">
                  View all care plan details
                </Link>
              </div>
            </div>
          </AccordionContent>
        </AccordionItem>

        <AccordionItem value="notes" className="border-b border-white/20">
          <AccordionTrigger>Recent Notes</AccordionTrigger>
          <AccordionContent>
            <div className="rounded-xl bg-white/45 p-3 shadow-lg shadow-black/10">
              {resident.recentNotes.length === 0 ? (
                <p className="text-sm text-muted-foreground">No recent 1:1 notes yet.</p>
              ) : (
                <ul className="space-y-2">
                  {resident.recentNotes.map((note) => (
                    <li key={note.id} className="rounded-lg border border-white/20 bg-white/60 p-2">
                      <p className="text-xs text-foreground/60">{formatDate(note.createdAt)}</p>
                      <p className="line-clamp-2 text-sm text-foreground/85">{note.narrative}</p>
                    </li>
                  ))}
                </ul>
              )}
              <div className="mt-3 text-xs text-foreground/65">
                <Link href={`/app/notes/one-to-one?residentId=${resident.id}`} className="underline underline-offset-2">
                  View all notes
                </Link>
              </div>
            </div>
          </AccordionContent>
        </AccordionItem>

        <AccordionItem value="activity">
          <AccordionTrigger>Activity History</AccordionTrigger>
          <AccordionContent>
            <div className="rounded-xl bg-white/45 p-3 shadow-lg shadow-black/10">
              <p className="text-sm text-muted-foreground">
                Activity history snapshot is coming here next. Use resident attendance and reports for full history now.
              </p>
              <div className="mt-3 text-xs text-foreground/65">
                <Link href="/app/attendance" className="underline underline-offset-2">
                  View attendance workspace
                </Link>
              </div>
            </div>
          </AccordionContent>
        </AccordionItem>
      </Accordion>

      <Dialog open={preferenceModalOpen} onOpenChange={setPreferenceModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Preferences</DialogTitle>
          </DialogHeader>
          <Textarea
            rows={4}
            value={preferenceDraft}
            onChange={(event) => setPreferenceDraft(event.target.value)}
            placeholder="Add resident preferences..."
            className="shadow-lg shadow-black/10"
          />
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setPreferenceModalOpen(false)}>
              Cancel
            </Button>
            <Button type="button" onClick={savePreferences} disabled={isPending || !canEdit} className="shadow-lg shadow-actifyBlue/25">
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={safetyModalOpen} onOpenChange={setSafetyModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Safety Notes</DialogTitle>
          </DialogHeader>
          <Textarea
            rows={4}
            value={safetyDraft}
            onChange={(event) => setSafetyDraft(event.target.value)}
            placeholder="Add safety considerations..."
            className="shadow-lg shadow-black/10"
          />
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setSafetyModalOpen(false)}>
              Cancel
            </Button>
            <Button type="button" onClick={saveSafetyNotes} disabled={isPending || !canEdit} className="shadow-lg shadow-actifyBlue/25">
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </section>
  );
}
