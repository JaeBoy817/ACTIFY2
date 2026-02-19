export type QuickAttendanceStatus =
  | "CLEAR"
  | "PRESENT"
  | "REFUSED"
  | "ASLEEP"
  | "OUT_OF_ROOM"
  | "ONE_TO_ONE"
  | "NOT_APPLICABLE";

export const QUICK_ATTENDANCE_CYCLE = [
  "CLEAR",
  "PRESENT",
  "REFUSED",
  "ASLEEP",
  "OUT_OF_ROOM",
  "ONE_TO_ONE",
  "NOT_APPLICABLE"
 ] as const;

export const QUICK_ATTENDANCE_ACTIONABLE = [
  "PRESENT",
  "REFUSED",
  "ASLEEP",
  "OUT_OF_ROOM",
  "ONE_TO_ONE",
  "NOT_APPLICABLE"
 ] as const;

export const QUICK_ATTENDANCE_HOTKEYS: Array<{
  key: string;
  status: QuickAttendanceStatus;
  label: string;
}> = [
  { key: "1", status: "PRESENT", label: "Present" },
  { key: "2", status: "REFUSED", label: "Refused" },
  { key: "3", status: "ASLEEP", label: "Asleep" },
  { key: "4", status: "OUT_OF_ROOM", label: "Out of Room" },
  { key: "5", status: "ONE_TO_ONE", label: "1:1 Completed" },
  { key: "0", status: "CLEAR", label: "Clear" }
];

type DbAttendanceStatus = "PRESENT" | "ACTIVE" | "LEADING" | "REFUSED" | "NO_SHOW";
type DbBarrierReason =
  | "ASLEEP"
  | "BED_BOUND"
  | "THERAPY"
  | "AT_APPOINTMENT"
  | "REFUSED"
  | "NOT_INFORMED"
  | "PAIN"
  | "ISOLATION_PRECAUTIONS"
  | "OTHER";

export function cycleAttendanceStatus(current: QuickAttendanceStatus): QuickAttendanceStatus {
  const index = QUICK_ATTENDANCE_CYCLE.indexOf(current);
  if (index < 0 || index >= QUICK_ATTENDANCE_CYCLE.length - 1) {
    return QUICK_ATTENDANCE_CYCLE[1];
  }
  return QUICK_ATTENDANCE_CYCLE[index + 1];
}

export function quickStatusLabel(status: QuickAttendanceStatus): string {
  switch (status) {
    case "PRESENT":
      return "Present";
    case "REFUSED":
      return "Refused";
    case "ASLEEP":
      return "Asleep";
    case "OUT_OF_ROOM":
      return "Out of Room";
    case "ONE_TO_ONE":
      return "1:1 Completed";
    case "NOT_APPLICABLE":
      return "Not Applicable";
    default:
      return "Clear";
  }
}

export function fromAttendanceRecord(params: {
  status: DbAttendanceStatus;
  barrierReason: DbBarrierReason | null;
  notes: string | null;
}): QuickAttendanceStatus {
  if (params.status === "REFUSED" || params.barrierReason === "REFUSED") {
    return "REFUSED";
  }

  if (params.status === "PRESENT") {
    return "PRESENT";
  }

  if (params.status === "ACTIVE" || params.status === "LEADING") {
    return "ONE_TO_ONE";
  }

  if (params.status === "NO_SHOW") {
    if (params.barrierReason === "ASLEEP") return "ASLEEP";
    if (params.barrierReason === "AT_APPOINTMENT" || params.barrierReason === "NOT_INFORMED") {
      return "OUT_OF_ROOM";
    }
    if (params.barrierReason === "OTHER" || (params.notes ?? "").toLowerCase().includes("not applicable")) {
      return "NOT_APPLICABLE";
    }
    if (params.barrierReason === "BED_BOUND") return "ASLEEP";
  }

  return "NOT_APPLICABLE";
}

export function toAttendanceRecord(params: {
  quickStatus: QuickAttendanceStatus;
  residentStatus?: string;
  notes?: string | null;
}): {
  clear: boolean;
  status?: DbAttendanceStatus;
  barrierReason?: DbBarrierReason | null;
  notes?: string | null;
} {
  const notes = params.notes?.trim() ? params.notes.trim() : null;

  if (params.quickStatus === "CLEAR") {
    if (params.residentStatus === "BED_BOUND") {
      return {
        clear: false,
        status: "NO_SHOW",
        barrierReason: "BED_BOUND",
        notes
      };
    }
    return {
      clear: true
    };
  }

  if (params.quickStatus === "PRESENT") {
    return {
      clear: false,
      status: "PRESENT",
      barrierReason: null,
      notes
    };
  }

  if (params.quickStatus === "REFUSED") {
    return {
      clear: false,
      status: "REFUSED",
      barrierReason: "REFUSED",
      notes
    };
  }

  if (params.quickStatus === "ASLEEP") {
    return {
      clear: false,
      status: "NO_SHOW",
      barrierReason: "ASLEEP",
      notes
    };
  }

  if (params.quickStatus === "OUT_OF_ROOM") {
    return {
      clear: false,
      status: "NO_SHOW",
      barrierReason: "AT_APPOINTMENT",
      notes
    };
  }

  if (params.quickStatus === "ONE_TO_ONE") {
    return {
      clear: false,
      status: "ACTIVE",
      barrierReason: null,
      notes
    };
  }

  return {
    clear: false,
    status: "NO_SHOW",
    barrierReason: "OTHER",
    notes: notes ?? "Not applicable"
  };
}
