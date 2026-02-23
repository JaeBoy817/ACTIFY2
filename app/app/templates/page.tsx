import { requireModulePage } from "@/lib/page-guards";
import { canWrite } from "@/lib/permissions";
import { getTemplatesLibrarySnapshot } from "@/lib/templates/service";
import { TemplatesPageShellLazy } from "@/components/templates/TemplatesPageShellLazy";

export default async function TemplatesPage({
  searchParams
}: {
  searchParams?: {
    templateId?: string;
  };
}) {
  const context = await requireModulePage("templates");
  const templates = await getTemplatesLibrarySnapshot({
    facilityId: context.facilityId
  });

  const requestedTemplateId = searchParams?.templateId?.trim() || null;
  const initialSelectedId = requestedTemplateId && templates.some((template) => template.id === requestedTemplateId)
    ? requestedTemplateId
    : null;

  return (
    <TemplatesPageShellLazy
      initialTemplates={templates}
      canEdit={canWrite(context.role)}
      initialSelectedId={initialSelectedId}
    />
  );
}
