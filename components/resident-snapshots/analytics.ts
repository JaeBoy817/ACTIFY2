import type { ResidentSnapshot } from "@/components/resident-snapshots/types";

export const ANALYTICS_TIMEFRAME_OPTIONS = [
  { key: "THIS_MONTH", label: "This Month" },
  { key: "LAST_30_DAYS", label: "Last 30 Days" },
  { key: "LAST_90_DAYS", label: "Last 90 Days" },
  { key: "YTD", label: "Year to Date" }
] as const;

export type AnalyticsTimeframeKey = (typeof ANALYTICS_TIMEFRAME_OPTIONS)[number]["key"];

function clampPercent(value: number) {
  if (!Number.isFinite(value)) return 0;
  return Math.max(0, Math.min(100, Math.round(value)));
}

function fallbackParticipation(resident: ResidentSnapshot) {
  return resident.participationPercentage ?? resident.last30DayParticipation ?? null;
}

function withMultiplier(value: number | null | undefined, multiplier: number) {
  if (!Number.isFinite(value ?? Number.NaN)) return 0;
  return Math.max(0, Math.round((value ?? 0) * multiplier));
}

export function getResidentAnalyticsWindow(resident: ResidentSnapshot, timeframe: AnalyticsTimeframeKey) {
  const baseParticipation = fallbackParticipation(resident);
  const baseOffered = resident.totalTrackedOpportunitiesThisMonth ?? resident.totalActivitiesOffered ?? 0;
  const baseAttended = resident.attendedCountThisMonth ?? resident.attendanceCount ?? resident.totalActivitiesAttended ?? 0;
  const baseParticipated = resident.totalActivitiesAttended ?? baseAttended + (resident.oneToOneCompletedCountThisMonth ?? 0);
  const baseOneToOne = resident.oneToOneCompletedCountThisMonth ?? resident.oneToOneCount ?? 0;
  const baseRefusals = resident.refusalCountThisMonth ?? resident.refusalCount ?? 0;
  const baseMissed = resident.missedCountThisMonth ?? resident.missedActivitiesCount ?? 0;

  if (timeframe === "THIS_MONTH" || timeframe === "LAST_30_DAYS") {
    return {
      participation: baseParticipation,
      offered: baseOffered,
      attended: baseParticipated,
      oneToOne: baseOneToOne,
      refusals: baseRefusals,
      missed: baseMissed,
      limitedData: false
    };
  }

  if (timeframe === "LAST_90_DAYS") {
    const participation = resident.last90DayParticipation ?? baseParticipation;
    const multiplier = resident.last90DayParticipation !== null && resident.last90DayParticipation !== undefined ? 2.8 : 1;
    return {
      participation,
      offered: withMultiplier(baseOffered, multiplier),
      attended: withMultiplier(baseAttended, multiplier),
      oneToOne: withMultiplier(baseOneToOne, multiplier),
      refusals: withMultiplier(baseRefusals, multiplier),
      missed: withMultiplier(baseMissed, multiplier),
      limitedData: multiplier === 1
    };
  }

  const participation = resident.yearToDateParticipation ?? resident.last90DayParticipation ?? baseParticipation;
  const multiplier =
    resident.yearToDateParticipation !== null && resident.yearToDateParticipation !== undefined
      ? 5.5
      : resident.last90DayParticipation !== null && resident.last90DayParticipation !== undefined
        ? 2.2
        : 1;

  return {
    participation,
    offered: withMultiplier(baseOffered, multiplier),
    attended: withMultiplier(baseAttended, multiplier),
    oneToOne: withMultiplier(baseOneToOne, multiplier),
    refusals: withMultiplier(baseRefusals, multiplier),
    missed: withMultiplier(baseMissed, multiplier),
    limitedData: multiplier === 1
  };
}

export function analyticsSummaryLabel(resident: ResidentSnapshot) {
  const participation = fallbackParticipation(resident);
  const offered = resident.totalTrackedOpportunitiesThisMonth ?? resident.totalActivitiesOffered ?? 0;
  const participated = resident.totalActivitiesAttended ?? resident.attendedCountThisMonth ?? resident.attendanceCount ?? 0;

  if (participation === null) {
    return "No attendance tracked yet this month";
  }

  return `${clampPercent(participation)}% this month · ${participated}/${offered} participated`;
}

export function analyticsPatternNotes(resident: ResidentSnapshot, timeframe: AnalyticsTimeframeKey) {
  const window = getResidentAnalyticsWindow(resident, timeframe);
  const notes: string[] = [];
  const trend = resident.lastParticipationTrend ?? "flat";

  if (window.participation !== null) {
    if (window.participation >= 70) {
      notes.push("Participation is consistently strong in the selected timeframe.");
    } else if (window.participation <= 40) {
      notes.push("Participation is below goal and may benefit from tailored 1:1 alternatives.");
    } else {
      notes.push("Participation is moderate with room to improve through targeted prompts.");
    }
  } else {
    notes.push("Not enough activity data is available yet to detect a clear trend.");
  }

  if (window.oneToOne >= Math.max(2, Math.round(window.attended * 0.5))) {
    notes.push("Resident appears to engage more consistently with 1:1 support.");
  }

  if (window.refusals >= 2) {
    notes.push("Recent refusals suggest trying lower-pressure entry activities.");
  }

  if (trend === "up") {
    notes.push("Participation trend is improving compared with recent snapshots.");
  } else if (trend === "down") {
    notes.push("Participation trend has declined recently and may need follow-up.");
  } else {
    notes.push("Participation trend appears stable.");
  }

  return notes.slice(0, 4);
}
