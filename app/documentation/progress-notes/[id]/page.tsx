import { redirect } from "next/navigation";

export default function DocumentationProgressDetailRedirect({ params }: { params: { id: string } }) {
  const { id } = params;
  redirect(`/app/documentation/progress-notes/${encodeURIComponent(id)}`);
}
