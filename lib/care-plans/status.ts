import type { ReviewResult } from "@prisma/client";

export type CarePlanDisplayStatus = "NO_PLAN" | "ACTIVE" | "DUE_SOON" | "OVERDUE" | "ARCHIVED";
export type CarePlanTrend = "UP" | "FLAT" | "DOWN";

const MS_PER_DAY = 24 * 60 * 60 * 1000;

export function computeCarePlanDisplayStatus(input: {
  hasPlan: boolean;
  archived: boolean;
  nextReviewDate?: Date | null;
  now?: Date;
}): CarePlanDisplayStatus {
  if (!input.hasPlan) return "NO_PLAN";
  if (input.archived) return "ARCHIVED";

  const now = input.now ?? new Date();
  const nextReview = input.nextReviewDate;
  if (!nextReview) return "ACTIVE";

  if (nextReview.getTime() < now.getTime()) return "OVERDUE";

  const daysUntil = Math.ceil((nextReview.getTime() - now.getTime()) / MS_PER_DAY);
  if (daysUntil <= 7) return "DUE_SOON";
  return "ACTIVE";
}

export function displayStatusLabel(status: CarePlanDisplayStatus) {
  switch (status) {
    case "NO_PLAN":
      return "No Plan";
    case "DUE_SOON":
      return "Due Soon";
    case "OVERDUE":
      return "Overdue";
    case "ARCHIVED":
      return "Archived";
    default:
      return "Active";
  }
}

export function displayStatusTone(status: CarePlanDisplayStatus) {
  switch (status) {
    case "NO_PLAN":
      return "critical";
    case "OVERDUE":
      return "critical";
    case "DUE_SOON":
      return "warning";
    case "ARCHIVED":
      return "muted";
    default:
      return "success";
  }
}

export function trendFromAttendanceCounts(current14DayCount: number, previous14DayCount: number): CarePlanTrend {
  if (current14DayCount > previous14DayCount) return "UP";
  if (current14DayCount < previous14DayCount) return "DOWN";
  return "FLAT";
}

export function trendFromReviewResult(result?: ReviewResult | null): CarePlanTrend {
  if (!result) return "FLAT";
  if (result === "IMPROVED") return "UP";
  if (result === "DECLINED") return "DOWN";
  return "FLAT";
}

export function trendLabel(trend: CarePlanTrend) {
  if (trend === "UP") return "Improving";
  if (trend === "DOWN") return "Needs attention";
  return "Stable";
}
