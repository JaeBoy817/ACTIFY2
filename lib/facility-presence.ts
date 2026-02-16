import {
  endOfZonedDay,
  startOfZonedDay,
  startOfZonedMonth,
  startOfZonedMonthShift
} from "@/lib/timezone";

export interface FacilityPresenceRow {
  residentId: string;
  status: string;
  occurredAt: Date;
}

export interface FacilityPresenceMetrics {
  activeResidentCount: number;
  todayPresentResidents: number;
  todayPresentPercent: number;
  currentMonthPresentResidents: number;
  currentMonthPresentPercent: number;
  previousMonthPresentResidents: number;
  previousMonthPresentPercent: number;
  hasPreviousMonthData: boolean;
  monthOverMonthDelta: number | null;
}

const presentStatuses = new Set(["PRESENT", "ACTIVE", "LEADING"]);

function percent(part: number, total: number) {
  if (total === 0) return 0;
  return Number(((part / total) * 100).toFixed(1));
}

function inRange(date: Date, start: Date, end: Date) {
  return date >= start && date <= end;
}

export function computeFacilityPresenceMetrics({
  rows,
  activeResidentCount,
  activeResidentIds,
  now,
  timeZone
}: {
  rows: FacilityPresenceRow[];
  activeResidentCount: number;
  activeResidentIds?: Iterable<string>;
  now: Date;
  timeZone?: string | null;
}): FacilityPresenceMetrics {
  const todayStart = startOfZonedDay(now, timeZone);
  const todayEnd = endOfZonedDay(now, timeZone);

  const currentMonthStart = startOfZonedMonth(now, timeZone);
  const currentMonthEnd = todayEnd;

  const previousMonthStart = startOfZonedMonthShift(now, timeZone, -1);
  const previousMonthEnd = new Date(currentMonthStart.getTime() - 1);

  const todayResidents = new Set<string>();
  const currentMonthResidents = new Set<string>();
  const previousMonthResidents = new Set<string>();
  const allowedResidentIds = activeResidentIds ? new Set(activeResidentIds) : null;

  let previousMonthAnyRows = false;

  for (const row of rows) {
    if (allowedResidentIds && !allowedResidentIds.has(row.residentId)) {
      continue;
    }

    const occurredAt = row.occurredAt;
    const isPresent = presentStatuses.has(row.status);

    if (inRange(occurredAt, previousMonthStart, previousMonthEnd)) {
      previousMonthAnyRows = true;
      if (isPresent) previousMonthResidents.add(row.residentId);
    }

    if (!isPresent) continue;

    if (inRange(occurredAt, todayStart, todayEnd)) {
      todayResidents.add(row.residentId);
    }

    if (inRange(occurredAt, currentMonthStart, currentMonthEnd)) {
      currentMonthResidents.add(row.residentId);
    }
  }

  const todayPresentResidents = todayResidents.size;
  const currentMonthPresentResidents = currentMonthResidents.size;
  const previousMonthPresentResidents = previousMonthResidents.size;

  const todayPresentPercent = percent(todayPresentResidents, activeResidentCount);
  const currentMonthPresentPercent = percent(currentMonthPresentResidents, activeResidentCount);
  const previousMonthPresentPercent = percent(previousMonthPresentResidents, activeResidentCount);

  return {
    activeResidentCount,
    todayPresentResidents,
    todayPresentPercent,
    currentMonthPresentResidents,
    currentMonthPresentPercent,
    previousMonthPresentResidents,
    previousMonthPresentPercent,
    hasPreviousMonthData: previousMonthAnyRows,
    monthOverMonthDelta: previousMonthAnyRows
      ? Number((currentMonthPresentPercent - previousMonthPresentPercent).toFixed(1))
      : null
  };
}
