import { FileCheck2 } from "lucide-react";
import type { ReactNode } from "react";

import { DocumentationSubNav } from "@/components/documentation/DocumentationSubNav";
import { cn } from "@/lib/utils";

export function DocumentationShell({
  title,
  description,
  actions,
  children,
  className
}: {
  title: string;
  description: string;
  actions?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("-mx-2 -mt-4 min-h-[calc(100vh-5.5rem)] bg-transparent px-2 pb-6 pt-4 md:-mx-3 md:px-3", className)}>
      <section className="relative isolate overflow-hidden rounded-[2rem] border border-[#1a2a48] bg-[#040814] px-3 pb-6 pt-4 md:px-5">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(1120px_500px_at_-8%_0%,rgba(56,189,248,0.17),transparent_62%),radial-gradient(920px_460px_at_95%_0%,rgba(139,92,246,0.22),transparent_62%),radial-gradient(760px_360px_at_50%_100%,rgba(45,212,191,0.1),transparent_72%)]" />

        <div className="relative z-10 space-y-4">
          <header className="rounded-[1.6rem] border border-[#21375a] bg-[linear-gradient(180deg,#091327_0%,#0a1427_100%)] p-4 md:p-5">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="inline-flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-[0.16em] text-[#94abd3]">
                  <FileCheck2 className="h-3.5 w-3.5 text-blue-300" />
                  Documentation Center
                </p>
                <h1 className="mt-1 text-3xl font-black text-white md:text-4xl">{title}</h1>
                <p className="mt-2 max-w-3xl text-sm text-[#afc4e6]">{description}</p>
              </div>
              {actions ? <div className="flex flex-wrap items-center gap-2">{actions}</div> : null}
            </div>
            <div className="mt-4">
              <DocumentationSubNav />
            </div>
          </header>
          {children}
        </div>
      </section>
    </div>
  );
}

