"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Save, Sparkles } from "lucide-react";

import { saveQueue } from "@/lib/perf/save-queue";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { GlassButton } from "@/components/glass/GlassButton";

type MinuteSectionState = {
  key: string;
  label: string;
  oldBusiness: string;
  newBusiness: string;
  notes: string;
};

type SaveFn = (formData: FormData) => Promise<void>;

const DEPARTMENT_FIELD_MAP: Record<string, string> = {
  activities: "departmentActivities",
  nursing: "departmentNursing",
  therapy: "departmentTherapy",
  dietary: "departmentDietary",
  housekeeping: "departmentHousekeeping",
  laundry: "departmentLaundry",
  maintenance: "departmentMaintenance",
  socialServices: "departmentSocialServices",
  administration: "departmentAdministrator"
};

type SaveStatus = "idle" | "saving" | "saved" | "error";

export function MeetingMinutesEditor({
  meetingId,
  canEdit,
  summary,
  additionalNotes,
  attendanceCount,
  minuteSections,
  saveAction
}: {
  meetingId: string;
  canEdit: boolean;
  summary: string;
  additionalNotes: string;
  attendanceCount: number;
  minuteSections: MinuteSectionState[];
  saveAction: SaveFn;
}) {
  const [summaryValue, setSummaryValue] = useState(summary);
  const [additionalNotesValue, setAdditionalNotesValue] = useState(additionalNotes);
  const [attendanceCountValue, setAttendanceCountValue] = useState(String(attendanceCount));
  const [sections, setSections] = useState<MinuteSectionState[]>(minuteSections);
  const [quickDepartment, setQuickDepartment] = useState(minuteSections[0]?.key ?? "activities");
  const [quickSection, setQuickSection] = useState<"OLD" | "NEW">("NEW");
  const [quickText, setQuickText] = useState("");
  const [dirty, setDirty] = useState(false);
  const [saveStatus, setSaveStatus] = useState<SaveStatus>("idle");
  const [statusText, setStatusText] = useState("All changes saved.");

  useEffect(() => {
    setSummaryValue(summary);
    setAdditionalNotesValue(additionalNotes);
    setAttendanceCountValue(String(attendanceCount));
    setSections(minuteSections);
    setDirty(false);
    setSaveStatus("idle");
    setStatusText("All changes saved.");
  }, [additionalNotes, attendanceCount, minuteSections, summary, meetingId]);

  const normalizedKeySet = useMemo(() => new Set(sections.map((section) => section.key)), [sections]);

  const runSave = useCallback(
    async (payload: {
      summary: string;
      additionalNotes: string;
      attendanceCountOverride: string;
      sections: MinuteSectionState[];
    }) => {
      const formData = new FormData();
      formData.set("meetingId", meetingId);
      formData.set("summary", payload.summary);
      formData.set("additionalNotes", payload.additionalNotes);
      if (payload.attendanceCountOverride.trim()) {
        formData.set("attendanceCountOverride", payload.attendanceCountOverride.trim());
      }
      formData.set("oldBusiness", flattenSectionBusiness(payload.sections, "oldBusiness"));
      formData.set("newBusiness", flattenSectionBusiness(payload.sections, "newBusiness"));
      for (const section of payload.sections) {
        const fieldName = DEPARTMENT_FIELD_MAP[section.key];
        if (!fieldName) continue;
        formData.set(fieldName, section.notes);
      }

      setSaveStatus("saving");
      setStatusText("Saving...");
      try {
        await saveQueue.enqueue(
          `resident-council-minutes:${meetingId}`,
          formData,
          async (queuedFormData) => {
            await saveAction(queuedFormData);
          },
          850
        );
        setSaveStatus("saved");
        setStatusText("Saved");
        setDirty(false);
      } catch {
        setSaveStatus("error");
        setStatusText("Could not save. Retry.");
      }
    },
    [meetingId, saveAction]
  );

  useEffect(() => {
    if (!canEdit || !dirty) return;
    const payload = {
      summary: summaryValue,
      additionalNotes: additionalNotesValue,
      attendanceCountOverride: attendanceCountValue,
      sections
    };
    void runSave(payload);
  }, [additionalNotesValue, attendanceCountValue, canEdit, dirty, runSave, sections, summaryValue]);

  function markDirty() {
    if (!canEdit) return;
    setDirty(true);
  }

  function upsertQuickItem() {
    const trimmed = quickText.trim();
    if (!trimmed) return;
    setSections((current) =>
      current.map((section) => {
        if (section.key !== quickDepartment) return section;
        if (quickSection === "OLD") {
          return {
            ...section,
            oldBusiness: section.oldBusiness ? `${section.oldBusiness}\n${trimmed}` : trimmed
          };
        }
        return {
          ...section,
          newBusiness: section.newBusiness ? `${section.newBusiness}\n${trimmed}` : trimmed
        };
      })
    );
    setQuickText("");
    markDirty();
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-white/30 bg-white/55 px-3 py-2">
        <div className="inline-flex items-center gap-2 text-sm text-foreground/75">
          <Sparkles className="h-4 w-4 text-actifyBlue" />
          Structured minutes with autosave
        </div>
        <span
          className={
            saveStatus === "error"
              ? "text-xs text-rose-700"
              : saveStatus === "saving"
                ? "text-xs text-amber-700"
                : "text-xs text-emerald-700"
          }
        >
          {statusText}
        </span>
      </div>

      <div className="grid gap-3 md:grid-cols-[220px_150px_minmax(0,1fr)_auto]">
        <select
          value={quickDepartment}
          onChange={(event) => setQuickDepartment(event.target.value)}
          className="h-10 rounded-xl border border-white/35 bg-white/80 px-3 text-sm shadow-md shadow-black/10"
          disabled={!canEdit}
        >
          {sections.map((section) => (
            <option key={section.key} value={section.key}>
              {section.label}
            </option>
          ))}
        </select>
        <select
          value={quickSection}
          onChange={(event) => setQuickSection(event.target.value as "OLD" | "NEW")}
          className="h-10 rounded-xl border border-white/35 bg-white/80 px-3 text-sm shadow-md shadow-black/10"
          disabled={!canEdit}
        >
          <option value="OLD">Old business</option>
          <option value="NEW">New business</option>
        </select>
        <Input
          value={quickText}
          onChange={(event) => setQuickText(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter") {
              event.preventDefault();
              upsertQuickItem();
            }
          }}
          placeholder="Quick Add: department + old/new + Enter"
          className="bg-white/80 shadow-md shadow-black/10"
          disabled={!canEdit}
        />
        <GlassButton type="button" size="sm" onClick={upsertQuickItem} disabled={!canEdit || !quickText.trim()}>
          Add
        </GlassButton>
      </div>

      <div className="grid gap-3 md:grid-cols-2">
        <label className="space-y-1 text-sm">
          <span className="text-foreground/70">Meeting Summary</span>
          <Textarea
            value={summaryValue}
            onChange={(event) => {
              setSummaryValue(event.target.value);
              markDirty();
            }}
            rows={3}
            className="bg-white/80 shadow-md shadow-black/10"
            disabled={!canEdit}
          />
        </label>
        <label className="space-y-1 text-sm">
          <span className="text-foreground/70">Attendance Count</span>
          <Input
            value={attendanceCountValue}
            onChange={(event) => {
              setAttendanceCountValue(event.target.value);
              markDirty();
            }}
            type="number"
            min={0}
            className="bg-white/80 shadow-md shadow-black/10"
            disabled={!canEdit}
          />
          <span className="text-xs text-foreground/60">Override if attendance count differs from resident list.</span>
        </label>
      </div>

      <Accordion
        type="multiple"
        defaultValue={sections.slice(0, 3).map((section) => section.key).filter((key) => normalizedKeySet.has(key))}
        className="space-y-2"
      >
        {sections.map((section) => (
          <AccordionItem
            key={section.key}
            value={section.key}
            className="rounded-xl border border-white/30 bg-white/60 px-3"
          >
            <AccordionTrigger className="py-3 text-sm font-semibold text-foreground hover:no-underline">
              {section.label}
            </AccordionTrigger>
            <AccordionContent className="space-y-3 pb-4">
              <label className="space-y-1 text-xs">
                <span className="text-foreground/70">Old Business</span>
                <Textarea
                  value={section.oldBusiness}
                  onChange={(event) => {
                    setSections((current) =>
                      current.map((candidate) =>
                        candidate.key === section.key
                          ? { ...candidate, oldBusiness: event.target.value }
                          : candidate
                      )
                    );
                    markDirty();
                  }}
                  rows={3}
                  className="bg-white/85 shadow-md shadow-black/10"
                  disabled={!canEdit}
                />
              </label>
              <label className="space-y-1 text-xs">
                <span className="text-foreground/70">New Business</span>
                <Textarea
                  value={section.newBusiness}
                  onChange={(event) => {
                    setSections((current) =>
                      current.map((candidate) =>
                        candidate.key === section.key
                          ? { ...candidate, newBusiness: event.target.value }
                          : candidate
                      )
                    );
                    markDirty();
                  }}
                  rows={3}
                  className="bg-white/85 shadow-md shadow-black/10"
                  disabled={!canEdit}
                />
              </label>
              <label className="space-y-1 text-xs">
                <span className="text-foreground/70">Department Notes</span>
                <Textarea
                  value={section.notes}
                  onChange={(event) => {
                    setSections((current) =>
                      current.map((candidate) =>
                        candidate.key === section.key
                          ? { ...candidate, notes: event.target.value }
                          : candidate
                      )
                    );
                    markDirty();
                  }}
                  rows={2}
                  className="bg-white/85 shadow-md shadow-black/10"
                  disabled={!canEdit}
                />
              </label>
            </AccordionContent>
          </AccordionItem>
        ))}
      </Accordion>

      <label className="space-y-1 text-sm">
        <span className="text-foreground/70">Additional Notes</span>
        <Textarea
          value={additionalNotesValue}
          onChange={(event) => {
            setAdditionalNotesValue(event.target.value);
            markDirty();
          }}
          rows={4}
          className="bg-white/80 shadow-md shadow-black/10"
          disabled={!canEdit}
        />
      </label>

      {canEdit ? (
        <div className="flex justify-end">
          <GlassButton
            type="button"
            onClick={() => {
              setDirty(true);
              void runSave({
                summary: summaryValue,
                additionalNotes: additionalNotesValue,
                attendanceCountOverride: attendanceCountValue,
                sections
              });
            }}
          >
            <Save className="mr-1.5 h-4 w-4" />
            Save now
          </GlassButton>
        </div>
      ) : null}
    </div>
  );
}

function flattenSectionBusiness(
  sections: MinuteSectionState[],
  key: "oldBusiness" | "newBusiness"
) {
  const lines: string[] = [];
  for (const section of sections) {
    const block = section[key].trim();
    if (!block) continue;
    for (const line of block.split(/\n+/)) {
      const trimmed = line.trim();
      if (!trimmed) continue;
      lines.push(`${section.label}: ${trimmed}`);
    }
  }
  return lines.join("\n");
}
