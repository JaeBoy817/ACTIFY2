import { redirect } from "next/navigation";

function asOneToOneType(raw?: string | null) {
  if (!raw) return false;
  const value = raw.toLowerCase();
  return value === "1on1" || value === "one_to_one" || value === "one-to-one" || value === "1:1" || value === "one-to-one";
}

export default function LegacyNotesBuilderRedirect({
  searchParams
}: {
  searchParams?: {
    type?: string;
    residentId?: string;
    noteId?: string;
  };
}) {
  const residentId = searchParams?.residentId?.trim();
  const noteId = searchParams?.noteId?.trim();
  const oneToOne = asOneToOneType(searchParams?.type);

  if (noteId) {
    if (oneToOne) {
      redirect(`/app/documentation/one-to-one/${encodeURIComponent(noteId)}`);
    }
    redirect(`/app/documentation/progress-notes/${encodeURIComponent(noteId)}`);
  }

  if (oneToOne) {
    if (residentId) {
      redirect(`/app/documentation/one-to-one/new?residentId=${encodeURIComponent(residentId)}`);
    }
    redirect("/app/documentation/one-to-one/new");
  }

  if (residentId) {
    redirect(`/app/documentation/progress-notes/new?residentId=${encodeURIComponent(residentId)}`);
  }

  redirect("/app/documentation/progress-notes/new");
}
