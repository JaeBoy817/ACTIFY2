"use client";

import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";

import { useReducedMotion } from "@/lib/use-reduced-motion";
import { cn } from "@/lib/utils";

const glassButtonVariants = cva(
  "glass-button relative inline-flex items-center justify-center rounded-xl border px-5 py-2.5 text-sm font-medium shadow-sm transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:pointer-events-none disabled:opacity-50",
  {
    variants: {
      variant: {
        default: "bg-actify-brand text-white border-white/45",
        warm: "bg-actify-warm text-foreground border-white/45",
        dense: "bg-white/70 text-foreground border-white/60"
      },
      size: {
        default: "h-10",
        sm: "h-9 px-4",
        lg: "h-11 px-6"
      }
    },
    defaultVariants: {
      variant: "default",
      size: "default"
    }
  }
);

export interface GlassButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement>, VariantProps<typeof glassButtonVariants> {
  asChild?: boolean;
  hover?: boolean;
  magnetic?: boolean;
}

export function GlassButton({ className, variant, size, asChild = false, hover = true, magnetic = false, onPointerMove, onPointerLeave, ...props }: GlassButtonProps) {
  const reducedMotion = useReducedMotion();
  const frame = React.useRef<number | null>(null);
  const Comp = asChild ? Slot : "button";
  const [canMagnet, setCanMagnet] = React.useState(false);

  React.useEffect(() => {
    if (reducedMotion || typeof window === "undefined" || !magnetic) {
      setCanMagnet(false);
      return;
    }
    const media = window.matchMedia("(hover: hover) and (pointer: fine)");
    const update = () => setCanMagnet(media.matches);
    update();
    media.addEventListener("change", update);
    return () => media.removeEventListener("change", update);
  }, [magnetic, reducedMotion]);

  React.useEffect(() => {
    return () => {
      if (frame.current) cancelAnimationFrame(frame.current);
    };
  }, []);

  const handlePointerMove = React.useCallback(
    (event: React.PointerEvent<HTMLButtonElement>) => {
      onPointerMove?.(event);
      if (!canMagnet) return;

      const node = event.currentTarget as HTMLElement;
      const rect = node.getBoundingClientRect();
      const dx = ((event.clientX - rect.left) / rect.width - 0.5) * 10;
      const dy = ((event.clientY - rect.top) / rect.height - 0.5) * 10;

      if (frame.current) cancelAnimationFrame(frame.current);
      frame.current = requestAnimationFrame(() => {
        node.style.setProperty("--mag-x", `${dx.toFixed(2)}px`);
        node.style.setProperty("--mag-y", `${dy.toFixed(2)}px`);
      });
    },
    [canMagnet, onPointerMove]
  );

  const handlePointerLeave = React.useCallback(
    (event: React.PointerEvent<HTMLButtonElement>) => {
      onPointerLeave?.(event);
      if (!canMagnet) return;

      const node = event.currentTarget as HTMLElement;
      if (frame.current) cancelAnimationFrame(frame.current);
      node.style.setProperty("--mag-x", "0px");
      node.style.setProperty("--mag-y", "0px");
    },
    [canMagnet, onPointerLeave]
  );

  return (
    <Comp
      className={cn(
        glassButtonVariants({ variant, size }),
        hover && !reducedMotion && "glass-button-hover",
        canMagnet && "magnetic-button",
        hover && "hover:-translate-y-0.5 hover:shadow-md",
        className
      )}
      onPointerMove={handlePointerMove}
      onPointerLeave={handlePointerLeave}
      {...props}
    />
  );
}
