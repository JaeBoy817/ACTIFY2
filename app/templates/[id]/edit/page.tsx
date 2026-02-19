import { redirect } from "next/navigation";

export default function TemplatesEditRedirectPage({
  params
}: {
  params: {
    id: string;
  };
}) {
  redirect(`/app/templates/${encodeURIComponent(params.id)}/edit`);
}

