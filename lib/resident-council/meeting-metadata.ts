export type ResidentCouncilMeetingStatusLabel = "Draft" | "Finalized";

export type ResidentCouncilMeetingMetadata = {
  timeIn: string | null;
  timeOut: string | null;
  staffInAttendance: string[];
  residentRightsReviewed: boolean;
  policyUpdates: string | null;
  mealOfTheMonth: string | null;
  meetingStatus: ResidentCouncilMeetingStatusLabel;
  additionalContext: string | null;
};

export const RESIDENT_COUNCIL_MEAL_DEFAULT = "Fried Chicken & Pizza";

const LABELS = {
  timeIn: "Time In:",
  timeOut: "Time Out:",
  staffInAttendance: "Staff In Attendance:",
  residentRightsReviewed: "Resident Rights Reviewed:",
  policyUpdates: "Facility Policies and Procedures Developed/Revised/Updated in the past 30 Days:",
  mealOfTheMonth: "Meal of the Month:",
  meetingStatus: "Meeting Status:"
} as const;

function normalizeLineBreaks(value: string) {
  return value.replace(/\r\n/g, "\n");
}

function isKnownHeader(line: string) {
  const normalized = line.trim().toLowerCase();
  return (
    normalized.startsWith(LABELS.timeIn.toLowerCase()) ||
    normalized.startsWith(LABELS.timeOut.toLowerCase()) ||
    normalized.startsWith(LABELS.staffInAttendance.toLowerCase()) ||
    normalized.startsWith(LABELS.residentRightsReviewed.toLowerCase()) ||
    normalized.startsWith(LABELS.policyUpdates.toLowerCase()) ||
    normalized.startsWith(LABELS.mealOfTheMonth.toLowerCase()) ||
    normalized.startsWith(LABELS.meetingStatus.toLowerCase())
  );
}

function parseYesNo(value: string | null | undefined, fallback = false) {
  if (!value) return fallback;
  const normalized = value.trim().toLowerCase();
  if (normalized === "yes" || normalized === "true" || normalized === "1") return true;
  if (normalized === "no" || normalized === "false" || normalized === "0") return false;
  return fallback;
}

function splitList(value: string | null | undefined) {
  if (!value) return [];
  return value
    .split(/\n|,/)
    .map((entry) => entry.replace(/^\s*-\s*/, "").trim())
    .filter(Boolean);
}

export function parseResidentCouncilMeetingMetadata(value?: string | null): ResidentCouncilMeetingMetadata {
  const text = normalizeLineBreaks(value ?? "");
  const lines = text.split("\n");

  let timeIn: string | null = null;
  let timeOut: string | null = null;
  let residentRightsReviewed = true;
  let policyUpdates: string | null = null;
  let mealOfTheMonth: string | null = null;
  let meetingStatus: ResidentCouncilMeetingStatusLabel = "Draft";
  const staffInAttendance: string[] = [];
  const freeform: string[] = [];

  for (let index = 0; index < lines.length; index += 1) {
    const raw = lines[index] ?? "";
    const line = raw.trim();
    if (!line) {
      freeform.push("");
      continue;
    }

    if (line.toLowerCase().startsWith(LABELS.timeIn.toLowerCase())) {
      const parsed = line.slice(LABELS.timeIn.length).trim();
      timeIn = parsed || null;
      continue;
    }

    if (line.toLowerCase().startsWith(LABELS.timeOut.toLowerCase())) {
      const parsed = line.slice(LABELS.timeOut.length).trim();
      timeOut = parsed || null;
      continue;
    }

    if (line.toLowerCase().startsWith(LABELS.residentRightsReviewed.toLowerCase())) {
      residentRightsReviewed = parseYesNo(line.slice(LABELS.residentRightsReviewed.length).trim(), true);
      continue;
    }

    if (line.toLowerCase().startsWith(LABELS.mealOfTheMonth.toLowerCase())) {
      const parsed = line.slice(LABELS.mealOfTheMonth.length).trim();
      mealOfTheMonth = parsed || null;
      continue;
    }

    if (line.toLowerCase().startsWith(LABELS.meetingStatus.toLowerCase())) {
      const parsed = line.slice(LABELS.meetingStatus.length).trim().toLowerCase();
      meetingStatus = parsed === "finalized" || parsed === "final" ? "Finalized" : "Draft";
      continue;
    }

    if (line.toLowerCase() === LABELS.staffInAttendance.toLowerCase()) {
      const staffLines: string[] = [];
      let cursor = index + 1;
      while (cursor < lines.length) {
        const candidate = (lines[cursor] ?? "").trim();
        if (!candidate) {
          cursor += 1;
          if (cursor < lines.length && isKnownHeader((lines[cursor] ?? "").trim())) {
            break;
          }
          continue;
        }
        if (isKnownHeader(candidate)) break;
        staffLines.push(candidate);
        cursor += 1;
      }
      staffInAttendance.push(...splitList(staffLines.join("\n")));
      index = cursor - 1;
      continue;
    }

    if (line.toLowerCase() === LABELS.policyUpdates.toLowerCase()) {
      const policyLines: string[] = [];
      let cursor = index + 1;
      while (cursor < lines.length) {
        const candidate = (lines[cursor] ?? "").trim();
        if (!candidate) {
          policyLines.push("");
          cursor += 1;
          continue;
        }
        if (isKnownHeader(candidate)) break;
        policyLines.push(candidate);
        cursor += 1;
      }
      const merged = policyLines.join("\n").trim();
      policyUpdates = merged.length > 0 ? merged : null;
      index = cursor - 1;
      continue;
    }

    freeform.push(raw);
  }

  const additionalContext = freeform.join("\n").trim();
  return {
    timeIn,
    timeOut,
    staffInAttendance,
    residentRightsReviewed,
    policyUpdates,
    mealOfTheMonth,
    meetingStatus,
    additionalContext: additionalContext.length > 0 ? additionalContext : null
  };
}

export function formatResidentCouncilMeetingMetadata(payload: {
  timeIn?: string | null;
  timeOut?: string | null;
  staffInAttendance?: string[] | string | null;
  residentRightsReviewed?: boolean | null;
  policyUpdates?: string | null;
  mealOfTheMonth?: string | null;
  meetingStatus?: ResidentCouncilMeetingStatusLabel | null;
  additionalContext?: string | null;
}) {
  const lines: string[] = [];
  const timeIn = payload.timeIn?.trim();
  const timeOut = payload.timeOut?.trim();
  const staffLines = Array.isArray(payload.staffInAttendance)
    ? payload.staffInAttendance.map((entry) => entry.trim()).filter(Boolean)
    : splitList(payload.staffInAttendance ?? null);
  const meal = payload.mealOfTheMonth?.trim();
  const policyUpdates = payload.policyUpdates?.trim();
  const meetingStatus = payload.meetingStatus ?? "Draft";
  const rightsValue = payload.residentRightsReviewed ?? true;
  const additionalContext = payload.additionalContext?.trim();

  if (timeIn) lines.push(`${LABELS.timeIn} ${timeIn}`);
  if (timeOut) lines.push(`${LABELS.timeOut} ${timeOut}`);

  lines.push(LABELS.staffInAttendance);
  if (staffLines.length < 1) {
    lines.push("- None listed");
  } else {
    for (const staff of staffLines) {
      lines.push(`- ${staff}`);
    }
  }

  lines.push(`${LABELS.residentRightsReviewed} ${rightsValue ? "Yes" : "No"}`);
  lines.push(LABELS.policyUpdates);
  if (policyUpdates) {
    lines.push(policyUpdates);
  } else {
    lines.push("No policy updates discussed.");
  }
  lines.push(`${LABELS.mealOfTheMonth} ${meal || RESIDENT_COUNCIL_MEAL_DEFAULT}`);
  lines.push(`${LABELS.meetingStatus} ${meetingStatus}`);

  if (additionalContext) {
    lines.push("");
    lines.push(additionalContext);
  }

  return lines.join("\n");
}

