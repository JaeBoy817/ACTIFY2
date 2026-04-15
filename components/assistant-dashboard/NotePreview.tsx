import { ClipboardCheck, Copy } from "lucide-react";

type NotePreviewProps = {
  value: string;
  onCopy: () => void;
  copyState: "idle" | "copied";
  label?: string;
  preservedDetails?: string[];
  preservationScore?: number;
  genericPhraseHits?: string[];
};

const IS_DEV = process.env.NODE_ENV !== "production";

export function NotePreview({
  value,
  onCopy,
  copyState,
  label = "Generated preview",
  preservedDetails,
  preservationScore,
  genericPhraseHits
}: NotePreviewProps) {
  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-3">
      <div className="mb-2 flex items-center justify-between">
        <p className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">{label}</p>
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

      {IS_DEV && ((preservedDetails && preservedDetails.length > 0) || (genericPhraseHits && genericPhraseHits.length > 0)) ? (
        <div className="mt-3 rounded-xl border border-slate-200 bg-slate-50 p-3">
          <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-600">Preserved details</p>
          {typeof preservationScore === "number" ? (
            <p className="mt-1 text-xs text-slate-600">Score: {(preservationScore * 100).toFixed(0)}%</p>
          ) : null}

          {preservedDetails && preservedDetails.length > 0 ? (
            <ul className="mt-2 space-y-1 text-xs text-slate-700">
              {preservedDetails.map((detail) => (
                <li key={detail}>- {detail}</li>
              ))}
            </ul>
          ) : (
            <p className="mt-2 text-xs text-slate-600">No detail matches were preserved.</p>
          )}

          {genericPhraseHits && genericPhraseHits.length > 0 ? (
            <div className="mt-2 rounded-lg border border-amber-200 bg-amber-50 px-2 py-1.5 text-xs text-amber-700">
              Generic phrase warning: {genericPhraseHits.join(", ")}
            </div>
          ) : null}
        </div>
      ) : null}
    </section>
  );
}
