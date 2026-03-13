import Link from "next/link";
import { Plus } from "lucide-react";

import { DocumentationShell } from "@/components/documentation/DocumentationShell";
import { DocumentationTypeWorkspace } from "@/components/documentation/DocumentationTypeWorkspace";
import { getDocumentationBaseContext, getDocumentationRowsForKind } from "@/app/app/documentation/_lib";

export default async function OneToOneDocumentationPage() {
  const { context } = await getDocumentationBaseContext();
  const rows = await getDocumentationRowsForKind(context.facilityId, "ONE_TO_ONE", context.timeZone);

  return (
    <DocumentationShell
      title="1:1 Notes"
      description="Resident-centric monthly compliance workspace for individualized visit documentation."
      actions={
        <Link
          href="/app/documentation/one-to-one/new"
          className="inline-flex h-10 items-center gap-2 rounded-full border border-violet-300/45 bg-[linear-gradient(180deg,#3a2f74_0%,#2a235a_100%)] px-4 text-xs font-semibold text-white"
        >
          <Plus className="h-3.5 w-3.5" />
          New 1:1 Note
        </Link>
      }
    >
      <DocumentationTypeWorkspace kind="ONE_TO_ONE" rows={rows} newHref="/app/documentation/one-to-one/new" />
    </DocumentationShell>
  );
}
