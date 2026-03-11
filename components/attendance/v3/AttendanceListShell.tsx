import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

export function AttendanceListShell({
  title,
  subtitle,
  actions,
  children,
  className
}: {
  title: string;
  subtitle?: string;
  actions?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section
      className={cn(
        "rounded-[1.7rem] border border-[#1f3152] bg-[linear-gradient(180deg,#091123_0%,#0a1325_45%,#091121_100%)] shadow-[0_24px_48px_-34px_rgba(37,99,235,0.82)]",
        className
      )}
    >
      <div className="flex flex-wrap items-start justify-between gap-3 border-b border-white/10 px-4 py-4 md:px-5">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.15em] text-[#90a8d1]">Workspace</p>
          <h2 className="mt-1 text-2xl font-black text-white">{title}</h2>
          {subtitle ? <p className="mt-1 text-sm text-[#9db3d8]">{subtitle}</p> : null}
        </div>
        {actions ? <div className="flex flex-wrap items-center gap-2">{actions}</div> : null}
      </div>
      <div className="p-4 md:p-5">{children}</div>
    </section>
  );
}

