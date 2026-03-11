import Link from "next/link";
import { Plus } from "lucide-react";

import { DocumentationInsightPanel } from "@/components/documentation/DocumentationInsightPanel";
import { DocumentationShell } from "@/components/documentation/DocumentationShell";
import { DocumentationTypeCard } from "@/components/documentation/DocumentationTypeCard";
import { DocumentationTypeWorkspace } from "@/components/documentation/DocumentationTypeWorkspace";
import { getDocumentationBaseContext, getDocumentationOverviewData } from "@/app/app/documentation/_lib";

export default async function DocumentationOverviewPage() {
  const { context } = await getDocumentationBaseContext();
  const data = await getDocumentationOverviewData(context.facilityId);

  return (
    <DocumentationShell
      title="Documentation"
      description="Resident documentation and compliance tracking across Progress Notes, 1:1, UDA, and MDS workflows."
      actions={
        <>
          <Link
            href="/app/documentation/progress-notes/new"
            className="inline-flex h-10 items-center gap-2 rounded-full border border-blue-300/45 bg-[linear-gradient(180deg,#294a7f_0%,#1d345d_100%)] px-4 text-xs font-semibold text-white"
          >
            <Plus className="h-3.5 w-3.5" />
            New Progress Note
          </Link>
          <Link
            href="/app/documentation/one-to-one/new"
            className="inline-flex h-10 items-center rounded-full border border-[#395b8a] bg-[#12233f] px-4 text-xs font-semibold text-[#d6e5ff]"
          >
            New 1:1 Note
          </Link>
          <Link
            href="/app/documentation/uda/new"
            className="inline-flex h-10 items-center rounded-full border border-[#395b8a] bg-[#12233f] px-4 text-xs font-semibold text-[#d6e5ff]"
          >
            New UDA
          </Link>
          <Link
            href="/app/documentation/mds/new"
            className="inline-flex h-10 items-center rounded-full border border-[#395b8a] bg-[#12233f] px-4 text-xs font-semibold text-[#d6e5ff]"
          >
            New MDS Entry
          </Link>
        </>
      }
    >
      <div className="grid gap-3 lg:grid-cols-2 xl:grid-cols-4">
        <DocumentationTypeCard kind="PROGRESS" counts={data.overview.byKind.get("PROGRESS")!} />
        <DocumentationTypeCard kind="ONE_TO_ONE" counts={data.overview.byKind.get("ONE_TO_ONE")!} />
        <DocumentationTypeCard kind="UDA" counts={data.overview.byKind.get("UDA")!} />
        <DocumentationTypeCard kind="MDS" counts={data.overview.byKind.get("MDS")!} />
      </div>

      <div className="mt-4 grid gap-4 xl:grid-cols-[minmax(0,1fr)_320px]">
        <DocumentationTypeWorkspace kind="ALL" rows={data.rows} newHref="/app/documentation/progress-notes/new" />
        <DocumentationInsightPanel
          completionPercentage={data.completionPercentage}
          oneToOneDue={data.oneToOneDue}
          recentProgress={data.recentProgress}
          udaDue={data.udaDue}
          mdsDue={data.mdsDue}
        />
      </div>
    </DocumentationShell>
  );
}
