import type { ReactNode } from "react";

export function SnapshotSection({
  title,
  children,
  tone = "default"
}: {
  title: string;
  children: ReactNode;
  tone?: "default" | "accent";
}) {
  return (
    <section
      className={
        tone === "accent"
          ? "rounded-2xl border border-teal-200 bg-teal-50/50 p-4"
          : "rounded-2xl border border-slate-200 bg-white p-4"
      }
    >
      <h3 className="text-sm font-semibold uppercase tracking-[0.14em] text-slate-500">{title}</h3>
      <div className="mt-3 space-y-3">{children}</div>
    </section>
  );
}
