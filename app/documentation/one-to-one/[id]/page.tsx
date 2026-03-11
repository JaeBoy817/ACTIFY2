import { redirect } from "next/navigation";

export default function DocumentationOneToOneDetailRedirect({ params }: { params: { id: string } }) {
  const { id } = params;
  redirect(`/app/documentation/one-to-one/${encodeURIComponent(id)}`);
}
