import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "glass-button glass-button-hover liquid-shadow-float inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-xl border border-white/45 bg-white/65 text-sm font-medium shadow-lg shadow-black/15 backdrop-blur-md transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring hover:shadow-xl hover:shadow-black/20 disabled:pointer-events-none disabled:opacity-50 disabled:shadow-sm disabled:shadow-black/10",
  {
    variants: {
      variant: {
        default: "border-blue-300/60 bg-gradient-to-r from-primary/80 to-secondary/70 text-primary-foreground hover:brightness-110",
        destructive: "border-rose-300/60 bg-gradient-to-r from-destructive/80 to-rose-500/70 text-destructive-foreground hover:brightness-110",
        outline: "border-white/55 bg-white/55 text-foreground hover:bg-white/75 hover:text-foreground",
        secondary: "border-cyan-300/55 bg-gradient-to-r from-secondary/70 to-cyan-400/60 text-secondary-foreground hover:brightness-110",
        ghost: "border-white/45 bg-white/45 text-foreground hover:bg-white/70 hover:text-foreground",
        link: "text-primary underline-offset-4 hover:underline"
      },
      size: {
        default: "h-10 px-4 py-2",
        sm: "h-9 rounded-md px-3",
        lg: "h-11 rounded-md px-8",
        icon: "h-10 w-10"
      }
    },
    defaultVariants: {
      variant: "default",
      size: "default"
    }
  }
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button";
    return <Comp className={cn(buttonVariants({ variant, size, className }))} ref={ref} {...props} />;
  }
);
Button.displayName = "Button";

export { Button, buttonVariants };
