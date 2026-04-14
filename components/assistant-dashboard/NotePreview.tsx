import { ClipboardCheck, Copy } from "lucide-react";

type NotePreviewProps = {
  value: string;
  onCopy: () => void;
  copyState: "idle" | "copied";
};

export function NotePreview({ value, onCopy, copyState }: NotePreviewProps) {
  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-3">
      <div className="mb-2 flex items-center justify-between">
        <p className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">Generated preview</p>
        <button
          type="button"
          onClick={onCopy}
          className="inline-flex items-center gap-1 rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-medium text-slate-700 transition hover:border-slate-300 hover:bg-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-300"
        >
          {copyState === "copied" ? <ClipboardCheck className="h-3.5 w-3.5" aria-hidden /> : <Copy className="h-3.5 w-3.5" aria-hidden />}
          {copyState === "copied" ? "Copied" : "Copy"}
        </button>
      </div>
      <p className="max-h-48 overflow-y-auto whitespace-pre-wrap rounded-xl bg-slate-50 p-3 text-sm leading-relaxed text-slate-700">
        {value}
      </p>
    </section>
  );
}
