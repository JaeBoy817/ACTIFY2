import Link from "next/link";
import { Plus } from "lucide-react";

import { DocumentationShell } from "@/components/documentation/DocumentationShell";
import { DocumentationTypeWorkspace } from "@/components/documentation/DocumentationTypeWorkspace";
import { getDocumentationBaseContext, getDocumentationRowsForKind } from "@/app/app/documentation/_lib";

export default async function UdaDocumentationPage() {
  const { context } = await getDocumentationBaseContext();
  const rows = await getDocumentationRowsForKind(context.facilityId, "UDA");

  return (
    <DocumentationShell
      title="UDA's"
      description="Structured activity assessment documentation with section tracking, draft states, and review-ready formatting."
      actions={
        <Link
          href="/app/documentation/uda/new"
          className="inline-flex h-10 items-center gap-2 rounded-full border border-amber-300/45 bg-[linear-gradient(180deg,#6a4a1d_0%,#573b16_100%)] px-4 text-xs font-semibold text-amber-100"
        >
          <Plus className="h-3.5 w-3.5" />
          New UDA
        </Link>
      }
    >
      <DocumentationTypeWorkspace kind="UDA" rows={rows} newHref="/app/documentation/uda/new" />
    </DocumentationShell>
  );
}
