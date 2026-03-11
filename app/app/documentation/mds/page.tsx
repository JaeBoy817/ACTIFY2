import Link from "next/link";
import { Plus } from "lucide-react";

import { DocumentationShell } from "@/components/documentation/DocumentationShell";
import { DocumentationTypeWorkspace } from "@/components/documentation/DocumentationTypeWorkspace";
import { getDocumentationBaseContext, getDocumentationRowsForKind } from "@/app/app/documentation/_lib";

export default async function MdsDocumentationPage() {
  const { context } = await getDocumentationBaseContext();
  const rows = await getDocumentationRowsForKind(context.facilityId, "MDS");

  return (
    <DocumentationShell
      title="MDS"
      description="Deadline-aware activity MDS support entries with resident preferences, barriers, and observed response summaries."
      actions={
        <Link
          href="/app/documentation/mds/new"
          className="inline-flex h-10 items-center gap-2 rounded-full border border-emerald-300/45 bg-[linear-gradient(180deg,#0f4a3b_0%,#113a31_100%)] px-4 text-xs font-semibold text-emerald-100"
        >
          <Plus className="h-3.5 w-3.5" />
          New MDS Entry
        </Link>
      }
    >
      <DocumentationTypeWorkspace kind="MDS" rows={rows} newHref="/app/documentation/mds/new" />
    </DocumentationShell>
  );
}
