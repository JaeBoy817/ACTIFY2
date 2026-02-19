import { TemplateEditorPage } from "@/components/templates/TemplateEditorPage";
import { requireModulePage } from "@/lib/page-guards";
import { canWrite } from "@/lib/permissions";
import type { TemplateType } from "@/lib/templates/types";

function parseType(value: string | undefined): TemplateType | null {
  if (value === "activity" || value === "note") return value;
  return null;
}

export default async function NewTemplatePage({
  searchParams
}: {
  searchParams?: {
    type?: string;
  };
}) {
  const context = await requireModulePage("templates");
  const initialType = parseType(searchParams?.type);

  return (
    <TemplateEditorPage
      mode="create"
      canEdit={canWrite(context.role)}
      initialType={initialType}
    />
  );
}

