import { CheckCircle2, CircleDot, TrendingDown, TrendingUp } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatInTimeZone } from "@/lib/timezone";

type ReviewRow = {
  id: string;
  reviewDate: Date;
  result: "IMPROVED" | "NO_CHANGE" | "DECLINED";
  participation: string;
  response: string;
  note: string | null;
  workedChips: string[];
  adjustChips: string[];
  nextReviewDateAfter: Date;
};

function resultTone(result: ReviewRow["result"]) {
  if (result === "IMPROVED") return "bg-emerald-100 text-emerald-700 border-emerald-300/70";
  if (result === "DECLINED") return "bg-rose-100 text-rose-700 border-rose-300/70";
  return "bg-slate-100 text-slate-700 border-slate-300/70";
}

function resultIcon(result: ReviewRow["result"]) {
  if (result === "IMPROVED") return <TrendingUp className="h-4 w-4 text-emerald-700" />;
  if (result === "DECLINED") return <TrendingDown className="h-4 w-4 text-rose-700" />;
  return <CircleDot className="h-4 w-4 text-slate-700" />;
}

function toTitle(value: string) {
  return value
    .replaceAll("_", " ")
    .toLowerCase()
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

export function ReviewTimeline({ reviews, timeZone }: { reviews: ReviewRow[]; timeZone: string }) {
  return (
    <Card className="glass-panel rounded-2xl border-white/15">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-3 text-base">
          <span className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-teal-100 text-teal-700 ring-1 ring-teal-200">
            <CheckCircle2 className="h-4 w-4" />
          </span>
          Review Timeline
        </CardTitle>
        <p className="text-xs text-muted-foreground">Recent review outcomes, response notes, and next-step adjustments.</p>
      </CardHeader>
      <CardContent className="space-y-3">
        {reviews.length === 0 ? <p className="text-sm text-muted-foreground">No reviews yet. Add your first review to start tracking outcomes.</p> : null}
        <div className="space-y-3">
          {reviews.map((review, index) => (
            <div key={review.id} className="relative rounded-xl border border-white/20 bg-white/10 p-3 pl-11">
              {index < reviews.length - 1 ? (
                <span className="absolute left-5 top-9 h-[calc(100%-1.5rem)] w-px bg-white/30" />
              ) : null}
              <span className="absolute left-3 top-3 inline-flex h-6 w-6 items-center justify-center rounded-full bg-white/80 ring-1 ring-white/70">
                {resultIcon(review.result)}
              </span>
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="text-sm font-medium text-foreground">
                  {formatInTimeZone(review.reviewDate, timeZone, {
                    month: "short",
                    day: "numeric",
                    year: "numeric"
                  })}
                </p>
                <Badge variant="outline" className={resultTone(review.result)}>
                  {toTitle(review.result)}
                </Badge>
              </div>
              <p className="mt-1 text-xs text-muted-foreground">
                Participation: {toTitle(review.participation)} | Response: {toTitle(review.response)}
              </p>
              {review.note ? <p className="mt-2 line-clamp-2 text-sm text-foreground/90">{review.note}</p> : null}
              <details className="mt-2">
                <summary className="cursor-pointer text-xs text-foreground/80">View full review</summary>
                <div className="mt-2 space-y-2 rounded-lg border border-white/15 bg-white/10 p-2 text-xs">
                  <p>
                    <span className="font-medium text-foreground">Worked:</span>{" "}
                    {review.workedChips.length ? review.workedChips.join(", ") : "None"}
                  </p>
                  <p>
                    <span className="font-medium text-foreground">Adjust next:</span>{" "}
                    {review.adjustChips.length ? review.adjustChips.join(", ") : "None"}
                  </p>
                  <p>
                    <span className="font-medium text-foreground">Next review:</span>{" "}
                    {formatInTimeZone(review.nextReviewDateAfter, timeZone, {
                      month: "short",
                      day: "numeric",
                      year: "numeric"
                    })}
                  </p>
                </div>
              </details>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
