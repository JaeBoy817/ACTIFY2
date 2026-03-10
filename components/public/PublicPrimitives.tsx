import Link from "next/link";
import type { LucideIcon } from "lucide-react";

import { cn } from "@/lib/utils";

export function PublicContainer({
  className,
  children
}: {
  className?: string;
  children: React.ReactNode;
}) {
  return <div className={cn("mx-auto w-full max-w-[1240px] px-4 md:px-8", className)}>{children}</div>;
}

export function PublicSection({
  className,
  children,
  ...props
}: {
  className?: string;
  children: React.ReactNode;
} & React.HTMLAttributes<HTMLElement>) {
  return (
    <section className={cn("py-14 md:py-20", className)} {...props}>
      {children}
    </section>
  );
}

export function Eyebrow({
  className,
  children
}: {
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <p
      className={cn(
        "text-[11px] font-semibold uppercase tracking-[0.16em] text-zinc-500",
        className
      )}
    >
      {children}
    </p>
  );
}

export function SectionHeading({
  title,
  subtitle,
  className
}: {
  title: string;
  subtitle?: string;
  className?: string;
}) {
  return (
    <div className={cn("max-w-3xl space-y-3", className)}>
      <h2 className="font-[var(--font-display)] text-4xl leading-[1.02] text-zinc-950 md:text-5xl">
        {title}
      </h2>
      {subtitle ? <p className="text-base leading-7 text-zinc-600 md:text-lg">{subtitle}</p> : null}
    </div>
  );
}

export function MattePanel({
  className,
  children
}: {
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <div
      className={cn(
        "rounded-[1.4rem] border border-zinc-200 bg-white p-5 shadow-[0_24px_44px_-34px_rgba(15,23,42,0.32)]",
        className
      )}
    >
      {children}
    </div>
  );
}

export function AccentTag({
  icon: Icon,
  label,
  className
}: {
  icon?: LucideIcon;
  label: string;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-2 rounded-full border border-zinc-300 bg-zinc-50 px-3 py-1 text-xs font-semibold text-zinc-700",
        className
      )}
    >
      {Icon ? <Icon className="h-3.5 w-3.5" aria-hidden /> : null}
      {label}
    </span>
  );
}

const baseCtaClass =
  "inline-flex h-11 items-center justify-center rounded-xl border px-5 text-sm font-semibold transition hover:-translate-y-px focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-500/35";

export function PrimaryCta({
  href,
  children,
  className
}: {
  href: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <Link
      href={href}
      className={cn(
        baseCtaClass,
        "border-yellow-500 bg-yellow-500 text-zinc-950 hover:bg-yellow-400",
        className
      )}
    >
      {children}
    </Link>
  );
}

export function SecondaryCta({
  href,
  children,
  className
}: {
  href: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <Link
      href={href}
      className={cn(
        baseCtaClass,
        "border-zinc-900 bg-zinc-900 text-zinc-50 hover:bg-zinc-800",
        className
      )}
    >
      {children}
    </Link>
  );
}
