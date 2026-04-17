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

function deriveParticipation(offered: number, participated: number, explicit: number | null | undefined) {
  if (Number.isFinite(explicit ?? Number.NaN)) {
    return clampPercent(explicit ?? 0);
  }

  if (offered <= 0) return null;
  return clampPercent((participated / offered) * 100);
}

export function getResidentAnalyticsWindow(resident: ResidentSnapshot, timeframe: AnalyticsTimeframeKey) {
  if (timeframe === "THIS_MONTH") {
    const offered = resident.totalTrackedOpportunitiesThisMonth ?? 0;
    const attended = resident.attendedCountThisMonth ?? 0;
    const oneToOne = resident.oneToOneCompletedCountThisMonth ?? 0;
    const refusals = resident.refusalCountThisMonth ?? 0;
    const missed = resident.missedCountThisMonth ?? 0;
    const participated = attended + oneToOne;

    return {
      participation: deriveParticipation(offered, participated, resident.participationPercentage),
      offered,
      attended: participated,
      oneToOne,
      refusals,
      missed,
      limitedData: false
    };
  }

  if (timeframe === "LAST_30_DAYS") {
    return {
      participation:
        resident.last30DayParticipation !== null && resident.last30DayParticipation !== undefined
          ? clampPercent(resident.last30DayParticipation)
          : null,
      offered: 0,
      attended: 0,
      oneToOne: 0,
      refusals: 0,
      missed: 0,
      limitedData: true
    };
  }

  if (timeframe === "LAST_90_DAYS") {
    return {
      participation:
        resident.last90DayParticipation !== null && resident.last90DayParticipation !== undefined
          ? clampPercent(resident.last90DayParticipation)
          : null,
      offered: 0,
      attended: 0,
      oneToOne: 0,
      refusals: 0,
      missed: 0,
      limitedData: true
    };
  }

  return {
    participation:
      resident.yearToDateParticipation !== null && resident.yearToDateParticipation !== undefined
        ? clampPercent(resident.yearToDateParticipation)
        : null,
    offered: 0,
    attended: 0,
    oneToOne: 0,
    refusals: 0,
    missed: 0,
    limitedData: true
  };
}

export function analyticsSummaryLabel(resident: ResidentSnapshot) {
  const offered = resident.totalTrackedOpportunitiesThisMonth ?? 0;
  const attended = resident.attendedCountThisMonth ?? 0;
  const oneToOne = resident.oneToOneCompletedCountThisMonth ?? 0;
  const participated = attended + oneToOne;
  const participation = deriveParticipation(offered, participated, resident.participationPercentage);

  if (participation === null) {
    return "No attendance tracked yet this month";
  }

  return `${participation}% this month · ${participated}/${offered} participated`;
}

export function analyticsPatternNotes(resident: ResidentSnapshot, timeframe: AnalyticsTimeframeKey) {
  const window = getResidentAnalyticsWindow(resident, timeframe);
  const notes: string[] = [];

  if (window.participation === null) {
    notes.push("No participation data for this timeframe yet.");
  } else if (window.participation >= 70) {
    notes.push("Participation is currently strong for this timeframe.");
  } else if (window.participation <= 40) {
    notes.push("Participation is currently below goal for this timeframe.");
  } else {
    notes.push("Participation is moderate in this timeframe.");
  }

  if (window.offered > 0) {
    notes.push(`${window.attended} of ${window.offered} tracked opportunities show participation.`);
  } else {
    notes.push("Track attendance from calendar activities to generate participation insights.");
  }

  if (resident.lastParticipationTrend === "up") {
    notes.push("Participation trend is improving from the previous period.");
  } else if (resident.lastParticipationTrend === "down") {
    notes.push("Participation trend is currently declining from the previous period.");
  } else {
    notes.push("Participation trend is currently stable.");
  }

  if (window.limitedData) {
    notes.push("Detailed counts are only available after attendance is tracked for this timeframe.");
  }

  return notes.slice(0, 4);
}
