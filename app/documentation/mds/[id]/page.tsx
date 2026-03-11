import { redirect } from "next/navigation";

export default function DocumentationMdsDetailRedirect({ params }: { params: { id: string } }) {
  const { id } = params;
  redirect(`/app/documentation/mds/${encodeURIComponent(id)}`);
}
