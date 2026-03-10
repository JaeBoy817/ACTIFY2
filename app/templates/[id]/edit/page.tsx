import { redirect } from "next/navigation";

export default function TemplatesEditRedirectPage({
  params
}: {
  params: {
    id: string;
  };
}) {
  redirect(`/app/calendar?section=library&patternId=${encodeURIComponent(params.id)}`);
}
