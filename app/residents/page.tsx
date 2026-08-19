import { ResidentsTabWorkspace } from "@/components/resident-snapshots/ResidentsTabWorkspace";
import { AlertTriangle } from "lucide-react";
import { canWrite } from "@/lib/permissions";
import { getFacilityContextWithSubscription } from "@/lib/page-guards";
import { prisma } from "@/lib/prisma";
import { isNextControlFlowError } from "@/lib/next-control-flow";
import { getAssessmentCompletionMapForFacility, getAttendanceSummaryMapForFacility } from "@/lib/residents/metrics";
import {
  inflateLegacyResidentContextRow,
  isResidentSchemaDriftError,
  residentListContextLegacyQuery,
  residentListContextQuery
} from "@/lib/residents/query";
import { toResidentListRow } from "@/lib/residents/serializers";

function ResidentsUnavailableFallback() {
  return (
    <div className="min-h-[calc(100vh-9.5rem)] space-y-4">
      <section className="rounded-[2rem] border border-amber-200 bg-amber-50/90 p-5 text-amber-950 shadow-sm">
        <div className="flex gap-3">
          <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0" aria-hidden />
          <div>
            <h1 className="text-lg font-black">Residents are temporarily unavailable.</h1>
            <p className="mt-1 text-sm leading-6">
              Actify loaded the Residents page, but the resident database did not respond. You can still use the AI
              Assistant, Calendar, and Settings while the database connection is checked.
            </p>
          </div>
        </div>
      </section>
      <ResidentsTabWorkspace initialResidents={[]} canEdit={false} />
    </div>
  );
}

export default async function ResidentsPage() {
  try {
    const context = await getFacilityContextWithSubscription();

    const [completionByResident, attendanceByResident] = await Promise.all([
      getAssessmentCompletionMapForFacility(context.facilityId),
      getAttendanceSummaryMapForFacility(context.facilityId)
    ]);

    const residents = await prisma.resident
      .findMany({
        where: {
          facilityId: context.facilityId
        },
        ...residentListContextQuery,
        orderBy: [{ room: "asc" }, { lastName: "asc" }, { firstName: "asc" }]
      })
      .catch(async (error) => {
        if (!isResidentSchemaDriftError(error)) throw error;
        const legacyRows = await prisma.resident.findMany({
          where: {
            facilityId: context.facilityId
          },
          ...residentListContextLegacyQuery,
          orderBy: [{ room: "asc" }, { lastName: "asc" }, { firstName: "asc" }]
        });
        return legacyRows.map(inflateLegacyResidentContextRow);
      });

    return (
      <div className="min-h-[calc(100vh-9.5rem)] space-y-4">
        <ResidentsTabWorkspace
          initialResidents={residents.map((resident) =>
            toResidentListRow(resident, {
              completionByResident,
              attendanceByResident
            })
          )}
          canEdit={canWrite(context.role)}
        />
      </div>
    );
  } catch (error) {
    if (isNextControlFlowError(error)) throw error;
    console.error("[residents] page fallback rendered", error);
    return <ResidentsUnavailableFallback />;
  }
}
