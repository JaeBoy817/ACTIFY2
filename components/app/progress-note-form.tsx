"use client";

import { useEffect, useMemo, useState } from "react";
import { Sparkles } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

type ResidentOption = {
  id: string;
  name: string;
  room: string;
  unitName?: string | null;
};

type ActivityOption = {
  id: string;
  label: string;
};

type TemplateOption = {
  id: string;
  title: string;
  quickPhrases: string[];
  bodyTemplate: string;
};

type ProgressNoteFormProps = {
  residents: ResidentOption[];
  activities: ActivityOption[];
  templates: TemplateOption[];
  action: (formData: FormData) => void;
  showIntro?: boolean;
  minNarrativeLen?: number;
  followUpRequired?: boolean;
  initialTemplateId?: string;
};

const participationMap = {
  MINIMAL: "minimal participation",
  MODERATE: "moderate participation",
  HIGH: "active participation"
} as const;

const cuesMap = {
  NONE: "without cues",
  VERBAL: "with verbal cueing",
  VISUAL: "with visual cues",
  HAND_OVER_HAND: "with hand-over-hand assistance"
} as const;

const selectClassName = "mt-1 h-10 w-full rounded-md border border-border bg-background px-3 text-sm";

export function ProgressNoteForm({
  residents,
  activities,
  templates,
  action,
  showIntro = true,
  minNarrativeLen = 10,
  followUpRequired = false,
  initialTemplateId
}: ProgressNoteFormProps) {
  const [residentId, setResidentId] = useState(residents[0]?.id ?? "");
  const [residentSearch, setResidentSearch] = useState("");
  const [activityId, setActivityId] = useState("");
  const [templateId, setTemplateId] = useState(
    initialTemplateId && templates.some((item) => item.id === initialTemplateId) ? initialTemplateId : ""
  );
  const [type, setType] = useState("GROUP");
  const [participationLevel, setParticipationLevel] = useState("MODERATE");
  const [moodAffect, setMoodAffect] = useState("CALM");
  const [cuesRequired, setCuesRequired] = useState("VERBAL");
  const [response, setResponse] = useState("POSITIVE");
  const [followUp, setFollowUp] = useState("");
  const [narrative, setNarrative] = useState(() => {
    if (!initialTemplateId) return "";
    const template = templates.find((item) => item.id === initialTemplateId);
    return template?.bodyTemplate ?? "";
  });
  const [selectedPhrases, setSelectedPhrases] = useState<string[]>([]);

  const resident = useMemo(() => residents.find((item) => item.id === residentId), [residents, residentId]);
  const template = useMemo(() => templates.find((item) => item.id === templateId), [templates, templateId]);
  const selectedActivity = useMemo(() => activities.find((activity) => activity.id === activityId), [activities, activityId]);

  useEffect(() => {
    if (!initialTemplateId) return;
    const matched = templates.find((item) => item.id === initialTemplateId);
    if (!matched) return;
    setTemplateId(matched.id);
    setNarrative(matched.bodyTemplate || "");
  }, [initialTemplateId, templates]);

  const filteredResidents = useMemo(() => {
    const q = residentSearch.trim().toLowerCase();
    if (!q) return residents;

    return residents.filter((item) => {
      return (
        item.name.toLowerCase().includes(q) ||
        item.room.toLowerCase().includes(q) ||
        (item.unitName ?? "").toLowerCase().includes(q)
      );
    });
  }, [residentSearch, residents]);

  const residentOptions = useMemo(() => {
    if (!residentId) return filteredResidents;
    if (filteredResidents.some((item) => item.id === residentId)) return filteredResidents;

    const selectedResident = residents.find((item) => item.id === residentId);
    return selectedResident ? [selectedResident, ...filteredResidents] : filteredResidents;
  }, [residentId, residents, filteredResidents]);

  function togglePhrase(phrase: string) {
    setSelectedPhrases((prev) => {
      if (prev.includes(phrase)) {
        return prev.filter((item) => item !== phrase);
      }
      return [...prev, phrase];
    });
    setNarrative((prev) => `${prev} ${phrase}`.trim());
  }

  function onTemplateChange(value: string) {
    setTemplateId(value);
    const selectedTemplate = templates.find((item) => item.id === value);
    if (selectedTemplate) {
      setNarrative(selectedTemplate.bodyTemplate || "");
    }
    setSelectedPhrases([]);
  }

  function generateNarrative() {
    const activityText =
      selectedActivity
        ? `during ${selectedActivity.label}`
        : type === "ONE_TO_ONE"
          ? "during a 1:1 visit"
          : "during a group activity";

    const composed = `${resident?.name ?? "Resident"} (Room ${resident?.room ?? ""}) was observed ${activityText}. Mood/affect was ${moodAffect.toLowerCase()} with ${participationMap[participationLevel as keyof typeof participationMap]}. Resident responded ${response.toLowerCase()} and engaged ${cuesMap[cuesRequired as keyof typeof cuesMap]}.${selectedPhrases.length ? ` ${selectedPhrases.join(" ")}` : ""}${followUp ? ` Follow-up: ${followUp}` : ""}`;

    setNarrative(composed);
  }

  return (
    <form action={action} className="space-y-5">
      {showIntro ? (
        <Card className="glass-warm">
          <CardContent className="flex flex-wrap items-start justify-between gap-3 pt-6">
            <div className="space-y-1">
              <p className="font-[var(--font-display)] text-2xl text-foreground">New Progress Note</p>
              <p className="text-sm text-foreground/70">Simple flow: resident, details, narrative, save.</p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant="outline">Rule-based narrative</Badge>
              <Badge variant="outline">No AI dependency</Badge>
            </div>
          </CardContent>
        </Card>
      ) : null}

      <Card className="glass">
        <CardHeader>
          <CardTitle className="font-[var(--font-display)]">Resident & Context</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="rounded-lg border border-border bg-white/65 p-3">
            <p className="text-sm font-medium">Resident header</p>
            <p className="text-sm text-muted-foreground">
              {resident ? `${resident.name} · Room ${resident.room} · ${resident.unitName ?? "No unit"}` : "Select resident"}
            </p>
          </div>

          <div className="grid gap-3 lg:grid-cols-2">
            <label className="text-sm">
              Search resident
              <Input
                value={residentSearch}
                onChange={(e) => setResidentSearch(e.target.value)}
                placeholder="Name, room, or unit"
                className="mt-1"
              />
            </label>

            <label className="text-sm">
              Resident
              <select
                name="residentId"
                value={residentId}
                onChange={(e) => setResidentId(e.target.value)}
                className={selectClassName}
                required
              >
                {residentOptions.length === 0 ? <option value="">No residents found</option> : null}
                {residentOptions.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.name} (Room {item.room})
                  </option>
                ))}
              </select>
            </label>

            <label className="text-sm">
              Attach activity (optional)
              <select
                name="activityInstanceId"
                value={activityId}
                onChange={(e) => setActivityId(e.target.value)}
                className={selectClassName}
              >
                <option value="">No linked activity</option>
                {activities.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.label}
                  </option>
                ))}
              </select>
            </label>

            <label className="text-sm">
              Note template
              <select value={templateId} onChange={(e) => onTemplateChange(e.target.value)} className={selectClassName}>
                <option value="">No template</option>
                {templates.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.title}
                  </option>
                ))}
              </select>
            </label>
          </div>
        </CardContent>
      </Card>

      <Card className="glass">
        <CardHeader>
          <CardTitle className="font-[var(--font-display)]">Observation Details</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-4">
            <label className="text-sm">
              Type
              <select name="type" value={type} onChange={(e) => setType(e.target.value)} className={selectClassName}>
                <option value="GROUP">Group</option>
                <option value="ONE_TO_ONE">1:1</option>
              </select>
            </label>

            <label className="text-sm">
              Participation
              <select
                name="participationLevel"
                value={participationLevel}
                onChange={(e) => setParticipationLevel(e.target.value)}
                className={selectClassName}
              >
                <option value="MINIMAL">Minimal</option>
                <option value="MODERATE">Moderate</option>
                <option value="HIGH">High</option>
              </select>
            </label>

            <label className="text-sm">
              Mood/Affect
              <select name="moodAffect" value={moodAffect} onChange={(e) => setMoodAffect(e.target.value)} className={selectClassName}>
                <option value="BRIGHT">Bright</option>
                <option value="CALM">Calm</option>
                <option value="FLAT">Flat</option>
                <option value="ANXIOUS">Anxious</option>
                <option value="AGITATED">Agitated</option>
              </select>
            </label>

            <label className="text-sm">
              Cues required
              <select name="cuesRequired" value={cuesRequired} onChange={(e) => setCuesRequired(e.target.value)} className={selectClassName}>
                <option value="NONE">None</option>
                <option value="VERBAL">Verbal</option>
                <option value="VISUAL">Visual</option>
                <option value="HAND_OVER_HAND">Hand-over-hand</option>
              </select>
            </label>

            <label className="text-sm">
              Response
              <select name="response" value={response} onChange={(e) => setResponse(e.target.value)} className={selectClassName}>
                <option value="POSITIVE">Positive</option>
                <option value="NEUTRAL">Neutral</option>
                <option value="RESISTANT">Resistant</option>
              </select>
            </label>

            <label className="text-sm md:col-span-2 lg:col-span-3">
              Follow-up
              <Input
                name="followUp"
                value={followUp}
                onChange={(e) => setFollowUp(e.target.value)}
                placeholder={followUpRequired ? "Follow-up plan (required)" : "Follow-up plan"}
                className="mt-1"
                required={followUpRequired}
              />
            </label>
          </div>
        </CardContent>
      </Card>

      <Card className="glass">
        <CardHeader>
          <CardTitle className="font-[var(--font-display)]">Narrative</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {template && (
            <div className="space-y-2 rounded-lg border border-border bg-white/65 p-3">
              <p className="text-sm font-medium">Quick phrases</p>
              <div className="flex flex-wrap gap-2">
                {template.quickPhrases.map((phrase) => (
                  <button
                    key={phrase}
                    type="button"
                    onClick={() => togglePhrase(phrase)}
                    className={`rounded-full border px-3 py-1 text-xs transition ${
                      selectedPhrases.includes(phrase)
                        ? "border-actifyBlue bg-actify-brand text-white"
                        : "border-border bg-background text-foreground hover:bg-muted/40"
                    }`}
                  >
                    {phrase}
                  </button>
                ))}
              </div>
            </div>
          )}

          <div className="space-y-2">
            <div className="flex flex-wrap items-center gap-2">
              <Button type="button" onClick={generateNarrative} className="gap-2">
                <Sparkles className="h-4 w-4" />
                Generate narrative
              </Button>
              <span className="text-xs text-muted-foreground">Creates a clean paragraph from your selected fields.</span>
            </div>
            <Textarea
              name="narrative"
              value={narrative}
              onChange={(e) => setNarrative(e.target.value)}
              rows={7}
              placeholder="Narrative appears here"
              minLength={minNarrativeLen}
              required
            />
            <p className="text-xs text-muted-foreground">Minimum narrative length: {minNarrativeLen} characters.</p>
            <input type="hidden" name="quickPhrases" value={JSON.stringify(selectedPhrases)} />
          </div>
        </CardContent>
      </Card>

      <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-border bg-white/65 p-3">
        <p className="text-xs text-muted-foreground">Saving adds this note to the resident timeline.</p>
        <Button type="submit">Save progress note</Button>
      </div>
    </form>
  );
}
