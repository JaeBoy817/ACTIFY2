"use client";

import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";

import { useReducedMotionPreference } from "@/components/marketing/animations/useReducedMotionPreference";
import { cn } from "@/lib/utils";

type GlossaryTermProps = {
  term: string;
  definition: string;
  plainEnglishMode?: boolean;
  className?: string;
};

export function GlossaryTerm({ term, definition, plainEnglishMode = false, className }: GlossaryTermProps) {
  const { reducedMotion } = useReducedMotionPreference();
  const [open, setOpen] = useState(false);

  return (
    <span className={cn("inline-flex flex-col align-baseline", className)}>
      <span
        className="relative inline-flex"
        onMouseEnter={() => setOpen(true)}
        onMouseLeave={() => setOpen(false)}
      >
        <button
          type="button"
          className="relative inline-flex items-center rounded-md border border-white/70 bg-white/70 px-1.5 py-0.5 text-[0.9em] font-semibold text-actifyBlue outline-none transition hover:bg-white focus-visible:ring-2 focus-visible:ring-actifyBlue"
          onFocus={() => setOpen(true)}
          onBlur={() => setOpen(false)}
          aria-label={`${term} definition`}
        >
          {term}
          {!reducedMotion && open ? (
            <motion.span
              aria-hidden
              className="pointer-events-none absolute inset-0 rounded-md bg-[linear-gradient(100deg,transparent_30%,rgba(17,24,39,0.22)_48%,transparent_65%)]"
              initial={{ x: "-120%", opacity: 0 }}
              animate={{ x: "120%", opacity: [0, 0.28, 0] }}
              transition={{ duration: 0.32, ease: "easeOut" }}
            />
          ) : null}
        </button>

        {!plainEnglishMode ? (
          <AnimatePresence>
            {open ? (
              <motion.span
                role="tooltip"
                className="pointer-events-none absolute left-1/2 top-full z-20 mt-1 w-56 -translate-x-1/2 rounded-lg border border-white/70 bg-white/95 px-2.5 py-2 text-xs leading-relaxed text-foreground shadow-md"
                initial={{ opacity: 0, y: -4 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -4 }}
                transition={{ duration: 0.16 }}
              >
                {definition}
              </motion.span>
            ) : null}
          </AnimatePresence>
        ) : null}
      </span>

      {plainEnglishMode ? (
        <span className="mt-1 rounded-md border border-white/70 bg-white/75 px-2 py-1 text-xs leading-relaxed text-foreground/80">
          {definition}
        </span>
      ) : null}
    </span>
  );
}
