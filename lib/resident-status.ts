export const residentStatusOptions = [
  "ACTIVE",
  "BED_BOUND",
  "DISCHARGED",
  "HOSPITALIZED",
  "ON_LEAVE",
  "TRANSFERRED",
  "DECEASED",
  "OTHER"
] as const;

export type ResidentStatusValue = (typeof residentStatusOptions)[number];

export function formatResidentStatusLabel(status: ResidentStatusValue) {
  return status
    .replaceAll("_", " ")
    .toLowerCase()
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

export function statusIsActive(status: ResidentStatusValue) {
  return status === "ACTIVE" || status === "BED_BOUND";
}

function getRoomSortParts(room: string) {
  const normalized = room.trim().toUpperCase();
  const match = normalized.match(/^(\d+)\s*([A-Z]*)/);
  return {
    numeric: match ? Number(match[1]) : Number.POSITIVE_INFINITY,
    suffix: match ? match[2] : normalized,
    normalized
  };
}

export function compareResidentsByRoom(
  a: { room: string; lastName: string; firstName: string },
  b: { room: string; lastName: string; firstName: string }
) {
  const aRoom = getRoomSortParts(a.room);
  const bRoom = getRoomSortParts(b.room);

  if (aRoom.numeric !== bRoom.numeric) return aRoom.numeric - bRoom.numeric;

  const suffixCompare = aRoom.suffix.localeCompare(bRoom.suffix, undefined, {
    numeric: true,
    sensitivity: "base"
  });
  if (suffixCompare !== 0) return suffixCompare;

  const roomCompare = aRoom.normalized.localeCompare(bRoom.normalized, undefined, {
    numeric: true,
    sensitivity: "base"
  });
  if (roomCompare !== 0) return roomCompare;

  const lastCompare = a.lastName.localeCompare(b.lastName, undefined, { sensitivity: "base" });
  if (lastCompare !== 0) return lastCompare;

  return a.firstName.localeCompare(b.firstName, undefined, { sensitivity: "base" });
}
