import Link from "next/link";
import { Plus } from "lucide-react";

import { DocumentationShell } from "@/components/documentation/DocumentationShell";
import { DocumentationTypeWorkspace } from "@/components/documentation/DocumentationTypeWorkspace";
import { getDocumentationBaseContext, getDocumentationRowsForKind } from "@/app/app/documentation/_lib";

export default async function ProgressNotesPage() {
  const { context } = await getDocumentationBaseContext();
  const rows = await getDocumentationRowsForKind(context.facilityId, "PROGRESS");

  return (
    <DocumentationShell
      title="Progress Notes"
      description="Fast charting workspace for group and activity progress documentation with board, list, and due views."
      actions={
        <Link
          href="/app/documentation/progress-notes/new"
          className="inline-flex h-10 items-center gap-2 rounded-full border border-blue-300/45 bg-[linear-gradient(180deg,#294a7f_0%,#1d345d_100%)] px-4 text-xs font-semibold text-white"
        >
          <Plus className="h-3.5 w-3.5" />
          New Progress Note
        </Link>
      }
    >
      <DocumentationTypeWorkspace kind="PROGRESS" rows={rows} newHref="/app/documentation/progress-notes/new" />
    </DocumentationShell>
  );
}
