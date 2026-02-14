import { Role } from "@prisma/client";

export const canWrite = (role: Role) => role !== Role.READ_ONLY;
export const canExportMonthlyReport = (role: Role) => role === Role.ADMIN || role === Role.AD;
export const canManageRoles = (role: Role) => role === Role.ADMIN;

export function assertWritable(role: Role) {
  if (!canWrite(role)) {
    throw new Error("You have read-only access.");
  }
}

export function assertCanExport(role: Role) {
  if (!canExportMonthlyReport(role)) {
    throw new Error("You do not have permission to export reports.");
  }
}

export function assertAdmin(role: Role) {
  if (!canManageRoles(role)) {
    throw new Error("Admin access required.");
  }
}
