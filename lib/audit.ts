import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";

type AuditPayload = {
  facilityId: string;
  actorUserId?: string | null;
  action: string;
  entityType: string;
  entityId: string;
  before?: unknown;
  after?: unknown;
};

export async function logAudit(payload: AuditPayload) {
  const normalize = (value: unknown): Prisma.InputJsonValue | Prisma.NullableJsonNullValueInput | undefined => {
    if (value === undefined) return undefined;
    if (value === null) return Prisma.JsonNull;
    return value as Prisma.InputJsonValue;
  };

  await prisma.auditLog.create({
    data: {
      facilityId: payload.facilityId,
      actorUserId: payload.actorUserId ?? null,
      action: payload.action,
      entityType: payload.entityType,
      entityId: payload.entityId,
      before: normalize(payload.before),
      after: normalize(payload.after)
    }
  });
}
