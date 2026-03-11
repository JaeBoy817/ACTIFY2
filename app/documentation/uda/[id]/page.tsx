import { redirect } from "next/navigation";

export default function DocumentationUdaDetailRedirect({ params }: { params: { id: string } }) {
  const { id } = params;
  redirect(`/app/documentation/uda/${encodeURIComponent(id)}`);
}
