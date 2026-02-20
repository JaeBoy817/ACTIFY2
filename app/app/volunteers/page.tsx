import { VolunteersHub } from "@/components/volunteers/VolunteersHub";
import { requireModulePage } from "@/lib/page-guards";
import { canWrite } from "@/lib/permissions";
import { getVolunteerHubPayload } from "@/lib/volunteers/service";

type VolunteersSearchParams = {
  tab?: string | string[];
};

export default async function VolunteersPage({
  searchParams
}: {
  searchParams?: VolunteersSearchParams;
}) {
  const context = await requireModulePage("volunteers");
  const initialPayload = await getVolunteerHubPayload({
    facilityId: context.facilityId
  });

  const requestedTab = Array.isArray(searchParams?.tab) ? searchParams?.tab[0] : searchParams?.tab;
  const initialTab =
    requestedTab === "schedule" || requestedTab === "hours" || requestedTab === "directory"
      ? requestedTab
      : "directory";

  return (
    <div className="min-h-screen space-y-4 bg-gradient-to-br from-[#EBFBEE]/70 via-[#E6FCF5]/60 to-[#E6FFFA]/70">
      <VolunteersHub initialPayload={initialPayload} initialTab={initialTab} canEdit={canWrite(context.role)} />
    </div>
  );
}
