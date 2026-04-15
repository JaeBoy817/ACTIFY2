import { redirect } from "next/navigation";

export default function ResidentProfileRedirectPage({
  params
}: {
  params: { id: string };
}) {
  redirect(`/app/residents?resident=${params.id}`);
}
