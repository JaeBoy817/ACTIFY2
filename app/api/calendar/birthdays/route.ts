import { asCalendarApiErrorResponse, requireCalendarApiContext } from "@/lib/calendar/api-context";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

function publicResidentName(resident: { firstName: string; lastName: string; preferredName: string | null }) {
  const first = (resident.preferredName || resident.firstName || "Resident").trim();
  const lastInitial = resident.lastName?.trim().charAt(0);
  return lastInitial ? `${first} ${lastInitial}.` : first;
}

export async function GET() {
  try {
    const context = await requireCalendarApiContext();
    const residents = await prisma.resident.findMany({
      where: {
        facilityId: context.facilityId,
        birthDate: { not: null },
        isActive: true,
        status: { notIn: ["DISCHARGED", "TRANSFERRED", "DECEASED"] }
      },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        preferredName: true,
        birthDate: true
      },
      orderBy: [{ lastName: "asc" }, { firstName: "asc" }]
    });

    return Response.json({
      residents: residents.map((resident) => ({
        residentId: resident.id,
        residentName: publicResidentName(resident),
        birthDate: resident.birthDate?.toISOString() ?? ""
      }))
    });
  } catch (error) {
    return asCalendarApiErrorResponse(error);
  }
}
