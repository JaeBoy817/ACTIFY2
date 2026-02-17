import { auth } from "@clerk/nextjs/server";

import { asModuleFlags } from "@/lib/module-flags";
import { prisma } from "@/lib/prisma";
import { resolveReportTheme } from "@/lib/report-pdf/ReportTheme";
import { generateResidentCouncilPdf } from "@/lib/report-pdf/resident-council-report";
import { getEffectiveReportSettings } from "@/lib/settings/service";

export const runtime = "nodejs";

export async function GET(req: Request) {
  const { userId } = await auth();
  if (!userId) return new Response("Unauthorized", { status: 401 });

  const user = await prisma.user.findUnique({
    where: { clerkUserId: userId },
    include: {
      facility: {
        select: {
          name: true,
          timezone: true,
          moduleFlags: true
        }
      }
    }
  });

  if (!user) return new Response("User not found", { status: 404 });

  const moduleFlags = asModuleFlags(user.facility?.moduleFlags);
  if (!moduleFlags.modules.residentCouncil) {
    return new Response("Resident Council module is disabled for this facility.", { status: 403 });
  }

  const url = new URL(req.url);
  const meetingId = url.searchParams.get("meetingId")?.trim();
  const isPreview = url.searchParams.get("preview") === "1";

  if (!meetingId) {
    return new Response("meetingId is required", { status: 400 });
  }

  const [meeting, effectiveSettings] = await Promise.all([
    prisma.residentCouncilMeeting.findFirst({
      where: {
        id: meetingId,
        facilityId: user.facilityId
      },
      include: {
        items: {
          orderBy: { updatedAt: "desc" }
        }
      }
    }),
    getEffectiveReportSettings(user.facilityId)
  ]);

  if (!meeting) {
    return new Response("Resident council meeting not found", { status: 404 });
  }

  const theme = resolveReportTheme({
    theme: effectiveSettings.reportSettings.theme,
    accent: effectiveSettings.reportSettings.accent
  });

  const generatedAt = new Date().toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit"
  });

  const pdfBytes = await generateResidentCouncilPdf(
    {
      meeting: {
        id: meeting.id,
        heldAt: meeting.heldAt,
        attendanceCount: meeting.attendanceCount,
        notes: meeting.notes,
        items: meeting.items.map((item) => ({
          id: item.id,
          category: item.category,
          concern: item.concern,
          followUp: item.followUp,
          status: item.status,
          owner: item.owner,
          updatedAt: item.updatedAt
        }))
      },
      facilityName: user.facility?.name ?? "My Facility",
      generatedAt,
      timeZone: user.facility?.timezone ?? "America/Chicago"
    },
    theme,
    {
      paperSize: effectiveSettings.printDefaults.paperSize,
      margins: effectiveSettings.printDefaults.margins,
      includeFooterMeta: effectiveSettings.printDefaults.includeFooterMeta
    }
  );

  const filename = `actify-resident-council-${meeting.heldAt.toISOString().slice(0, 10)}.pdf`;

  return new Response(Buffer.from(pdfBytes), {
    status: 200,
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `${isPreview ? "inline" : "attachment"}; filename=\"${filename}\"`,
      "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0",
      Pragma: "no-cache",
      Expires: "0"
    }
  });
}
