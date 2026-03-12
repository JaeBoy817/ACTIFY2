import { prisma } from "@/lib/prisma";

let residentExtendedColumnsEnsured = false;
let residentExtendedColumnsEnsurePromise: Promise<boolean> | null = null;

const RESIDENT_EXTENDED_COLUMN_DDL: string[] = [
  'ALTER TABLE "Resident" ADD COLUMN IF NOT EXISTS "preferredName" TEXT',
  'ALTER TABLE "Resident" ADD COLUMN IF NOT EXISTS "admissionDate" TIMESTAMP(3)',
  'ALTER TABLE "Resident" ADD COLUMN IF NOT EXISTS "mdsManualDueDate" TIMESTAMP(3)'
];

export async function ensureResidentExtendedColumns() {
  if (residentExtendedColumnsEnsured) return true;
  if (residentExtendedColumnsEnsurePromise) return residentExtendedColumnsEnsurePromise;

  residentExtendedColumnsEnsurePromise = (async () => {
    try {
      for (const ddl of RESIDENT_EXTENDED_COLUMN_DDL) {
        await prisma.$executeRawUnsafe(ddl);
      }
      residentExtendedColumnsEnsured = true;
      return true;
    } catch {
      return false;
    } finally {
      residentExtendedColumnsEnsurePromise = null;
    }
  })();

  return residentExtendedColumnsEnsurePromise;
}
