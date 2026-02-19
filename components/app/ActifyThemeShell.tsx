"use client";

import { useMemo } from "react";
import type { CSSProperties, ReactNode } from "react";
import { usePathname } from "next/navigation";

import { getActifyThemeFromPath } from "@/lib/actifyTheme";
import { cn } from "@/lib/utils";

type CssVarStyle = CSSProperties & {
  "--actify-grad-primary"?: string;
  "--actify-grad-wash"?: string;
  "--actify-accent"?: string;
};

export function ActifyThemeShell({ children, className }: { children: ReactNode; className?: string }) {
  const pathname = usePathname();

  const theme = useMemo(() => getActifyThemeFromPath(pathname ?? "/"), [pathname]);

  const style: CssVarStyle = {
    "--actify-grad-primary": theme.primaryGradient,
    "--actify-grad-wash": theme.softWash,
    "--actify-accent": theme.accent
  };

  return (
    <div data-actify-theme={theme.key} className={cn("actify-page-shell", className)} style={style}>
      {children}
    </div>
  );
}
