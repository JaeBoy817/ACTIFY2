import { AttendanceStatus } from "@prisma/client";

import { prisma } from "@/lib/prisma";
import {
  buildResidentCompletionsMap,
  type DocumentationAssessmentEntry,
  type ResidentAssessmentCompletionSummary
} from "@/lib/residents/assessment-due";
import type { ResidentAttendanceSummary } from "@/lib/residents/serializers";

function lookbackDate(days: number) {
  const date = new Date();
  date.setDate(date.getDate() - days);
  return date;
}

export async function getAssessmentCompletionMapForFacility(facilityId: string) {
  const entries = await prisma.progressNote.findMany({
    where: {
      resident: {
        facilityId
      },
      narrative: {
        contains: "[[DOC_META]]"
      }
    },
    select: {
      residentId: true,
      narrative: true,
      createdAt: true
    },
    orderBy: {
      createdAt: "desc"
    },
    take: 3000
  });

  return buildResidentCompletionsMap(entries as DocumentationAssessmentEntry[]);
}

export async function getAttendanceSummaryMapForFacility(facilityId: string, days = 30) {
  const rows = await prisma.attendance.findMany({
    where: {
      resident: {
        facilityId
      },
      createdAt: {
        gte: lookbackDate(days)
      }
    },
    select: {
      residentId: true,
      status: true
    },
    orderBy: {
      createdAt: "desc"
    },
    take: 5000
  });

  const map = new Map<string, ResidentAttendanceSummary>();

  for (const row of rows) {
    const current =
      map.get(row.residentId) ?? {
        total30d: 0,
        engaged30d: 0,
        refused30d: 0,
        noShow30d: 0
      };

    current.total30d += 1;

    if (
      row.status === AttendanceStatus.PRESENT ||
      row.status === AttendanceStatus.ACTIVE ||
      row.status === AttendanceStatus.LEADING
    ) {
      current.engaged30d += 1;
    }

    if (row.status === AttendanceStatus.REFUSED) {
      current.refused30d += 1;
    }

    if (row.status === AttendanceStatus.NO_SHOW) {
      current.noShow30d += 1;
    }

    map.set(row.residentId, current);
  }

  return map;
}

export function getCompletionSummaryByResident(
  map: Map<string, ResidentAssessmentCompletionSummary>,
  residentId: string
): ResidentAssessmentCompletionSummary | undefined {
  return map.get(residentId);
}
