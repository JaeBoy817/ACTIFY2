import { VolunteersHubLazy } from "@/components/volunteers/VolunteersHubLazy";
import { requireModulePage } from "@/lib/page-guards";
import { canWrite } from "@/lib/permissions";
import { resolveTimeZone } from "@/lib/timezone";
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
    <div className="min-h-screen space-y-4">
      <VolunteersHubLazy
        initialPayload={initialPayload}
        initialTab={initialTab}
        canEdit={canWrite(context.role)}
        timeZone={resolveTimeZone(context.timeZone)}
      />
    </div>
  );
}
