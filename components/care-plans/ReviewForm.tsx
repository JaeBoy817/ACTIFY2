"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";

import {
  CARE_PLAN_PARTICIPATION_LEVELS,
  CARE_PLAN_RESPONSE_TYPES,
  CARE_PLAN_REVIEW_ADJUST_CHIPS,
  CARE_PLAN_REVIEW_RESULTS,
  CARE_PLAN_REVIEW_WORKED_CHIPS
} from "@/lib/care-plans/enums";
import { carePlanReviewPayloadSchema } from "@/lib/care-plans/validation";
import { useToast } from "@/lib/use-toast";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";

type ReviewDraft = {
  reviewDate: string;
  result: "IMPROVED" | "NO_CHANGE" | "DECLINED";
  participation: "LOW" | "MODERATE" | "HIGH";
  response: "POSITIVE" | "NEUTRAL" | "RESISTANT";
  workedChips: string[];
  adjustChips: string[];
  note: string;
  nextReviewDateAfter: string;
};

export function ReviewForm({
  residentName,
  defaultNextReviewDate,
  submitAction
}: {
  residentName: string;
  defaultNextReviewDate: string;
  submitAction: (formData: FormData) => Promise<void> | void;
}) {
  const router = useRouter();
  const { toast } = useToast();
  const [isPending, startTransition] = useTransition();
  const [draft, setDraft] = useState<ReviewDraft>({
    reviewDate: new Date().toISOString().slice(0, 10),
    result: "NO_CHANGE",
    participation: "MODERATE",
    response: "POSITIVE",
    workedChips: [],
    adjustChips: [],
    note: "",
    nextReviewDateAfter: defaultNextReviewDate
  });

  function toggle(list: string[], value: string) {
    return list.includes(value) ? list.filter((item) => item !== value) : [...list, value];
  }

  function onSubmit() {
    const parsed = carePlanReviewPayloadSchema.safeParse({
      reviewDate: draft.reviewDate,
      result: draft.result,
      participation: draft.participation,
      response: draft.response,
      workedChips: draft.workedChips,
      adjustChips: draft.adjustChips,
      note: draft.note || undefined,
      nextReviewDateAfter: draft.nextReviewDateAfter
    });

    if (!parsed.success) {
      toast({
        title: "Review form incomplete",
        description: parsed.error.issues[0]?.message ?? "Please complete required fields.",
        variant: "destructive"
      });
      return;
    }

    const formData = new FormData();
    formData.set("payload", JSON.stringify(parsed.data));

    startTransition(async () => {
      try {
        await submitAction(formData);
        toast({ title: "Review saved" });
        router.refresh();
      } catch (error) {
        toast({
          title: "Could not save review",
          description: error instanceof Error ? error.message : "Please try again.",
          variant: "destructive"
        });
      }
    });
  }

  return (
    <Card className="glass-panel rounded-2xl border-white/15">
      <CardHeader>
        <CardTitle>Add Review · {residentName}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-3 md:grid-cols-2">
          <label className="text-sm">
            <span className="font-medium text-foreground">Review Date</span>
            <Input
              type="date"
              className="mt-1 bg-white/60"
              value={draft.reviewDate}
              onChange={(event) => setDraft((prev) => ({ ...prev, reviewDate: event.target.value }))}
            />
          </label>
          <label className="text-sm">
            <span className="font-medium text-foreground">Next Review Date</span>
            <Input
              type="date"
              className="mt-1 bg-white/60"
              value={draft.nextReviewDateAfter}
              onChange={(event) => setDraft((prev) => ({ ...prev, nextReviewDateAfter: event.target.value }))}
            />
          </label>
        </div>

        <div className="grid gap-3 md:grid-cols-3">
          <label className="text-sm">
            <span className="font-medium text-foreground">Overall Result</span>
            <select
              value={draft.result}
              onChange={(event) => setDraft((prev) => ({ ...prev, result: event.target.value as ReviewDraft["result"] }))}
              className="mt-1 h-10 w-full rounded-md border border-white/20 bg-white/60 px-3 text-sm"
            >
              {CARE_PLAN_REVIEW_RESULTS.map((item) => (
                <option key={item.value} value={item.value}>
                  {item.label}
                </option>
              ))}
            </select>
          </label>
          <label className="text-sm">
            <span className="font-medium text-foreground">Participation</span>
            <select
              value={draft.participation}
              onChange={(event) =>
                setDraft((prev) => ({ ...prev, participation: event.target.value as ReviewDraft["participation"] }))
              }
              className="mt-1 h-10 w-full rounded-md border border-white/20 bg-white/60 px-3 text-sm"
            >
              {CARE_PLAN_PARTICIPATION_LEVELS.map((item) => (
                <option key={item.value} value={item.value}>
                  {item.label}
                </option>
              ))}
            </select>
          </label>
          <label className="text-sm">
            <span className="font-medium text-foreground">Response</span>
            <select
              value={draft.response}
              onChange={(event) => setDraft((prev) => ({ ...prev, response: event.target.value as ReviewDraft["response"] }))}
              className="mt-1 h-10 w-full rounded-md border border-white/20 bg-white/60 px-3 text-sm"
            >
              {CARE_PLAN_RESPONSE_TYPES.map((item) => (
                <option key={item.value} value={item.value}>
                  {item.label}
                </option>
              ))}
            </select>
          </label>
        </div>

        <div className="space-y-3">
          <div>
            <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-foreground/70">What worked (optional)</p>
            <div className="flex flex-wrap gap-2">
              {CARE_PLAN_REVIEW_WORKED_CHIPS.map((chip) => (
                <button
                  key={chip}
                  type="button"
                  onClick={() => setDraft((prev) => ({ ...prev, workedChips: toggle(prev.workedChips, chip) }))}
                  className={cn(
                    "rounded-full border px-3 py-1 text-xs transition",
                    draft.workedChips.includes(chip)
                      ? "border-actifyBlue bg-actifyBlue/15"
                      : "border-white/20 bg-white/10 hover:bg-white/20"
                  )}
                >
                  {chip}
                </button>
              ))}
            </div>
          </div>

          <div>
            <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-foreground/70">What to adjust (optional)</p>
            <div className="flex flex-wrap gap-2">
              {CARE_PLAN_REVIEW_ADJUST_CHIPS.map((chip) => (
                <button
                  key={chip}
                  type="button"
                  onClick={() => setDraft((prev) => ({ ...prev, adjustChips: toggle(prev.adjustChips, chip) }))}
                  className={cn(
                    "rounded-full border px-3 py-1 text-xs transition",
                    draft.adjustChips.includes(chip)
                      ? "border-actifyBlue bg-actifyBlue/15"
                      : "border-white/20 bg-white/10 hover:bg-white/20"
                  )}
                >
                  {chip}
                </button>
              ))}
            </div>
          </div>
        </div>

        <label className="text-sm">
          <span className="font-medium text-foreground">Review note (optional)</span>
          <Textarea
            maxLength={500}
            className="mt-1 min-h-[100px] bg-white/60"
            value={draft.note}
            onChange={(event) => setDraft((prev) => ({ ...prev, note: event.target.value }))}
          />
        </label>

        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={() => router.back()}>
            Cancel
          </Button>
          <Button onClick={onSubmit} disabled={isPending}>
            Save Review
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
