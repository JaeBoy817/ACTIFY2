import { cn } from "@/lib/utils";

export function Section({
  id,
  kicker,
  title,
  subtitle,
  children,
  className,
  contentClassName,
  headerAlign = "left",
  headerSeparate = false
}: {
  id?: string;
  kicker?: string;
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  className?: string;
  contentClassName?: string;
  headerAlign?: "left" | "center";
  headerSeparate?: boolean;
}) {
  const centered = headerAlign === "center";

  return (
    <section id={id} className={cn("py-16", className)}>
      <div
        className={cn(
          "space-y-4",
          centered && "mx-auto max-w-4xl text-center",
          headerSeparate && "mx-auto mb-8 max-w-4xl rounded-2xl border border-white/15 bg-white/8 p-5 backdrop-blur-sm md:p-6"
        )}
      >
        {kicker ? <p className="text-xs font-semibold uppercase tracking-[0.1em] text-foreground/65">{kicker}</p> : null}
        <h2 className="font-[var(--font-display)] text-3xl text-foreground md:text-4xl">{title}</h2>
        {subtitle ? (
          <p className={cn("max-w-3xl text-base text-foreground/75 md:text-lg", centered && "mx-auto")}>{subtitle}</p>
        ) : null}
      </div>
      <div className={cn("mt-8", contentClassName)}>{children}</div>
    </section>
  );
}
