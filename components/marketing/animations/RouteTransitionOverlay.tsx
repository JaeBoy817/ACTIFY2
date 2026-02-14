"use client";

import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { usePathname } from "next/navigation";

import { useReducedMotionPreference } from "@/components/marketing/animations/useReducedMotionPreference";

export function RouteTransitionOverlay() {
  const pathname = usePathname();
  const { reducedMotion, isPageVisible } = useReducedMotionPreference();
  const [transitionKey, setTransitionKey] = useState<string | null>(null);

  useEffect(() => {
    if (reducedMotion || !isPageVisible) return;
    const key = `${pathname}-${Date.now()}`;
    setTransitionKey(key);
    const timeout = window.setTimeout(() => setTransitionKey(null), 600);
    return () => window.clearTimeout(timeout);
  }, [isPageVisible, pathname, reducedMotion]);

  if (reducedMotion || !isPageVisible) return null;

  return (
    <AnimatePresence>
      {transitionKey ? (
        <motion.div
          key={transitionKey}
          className="pointer-events-none fixed inset-0 z-30 overflow-hidden"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.18 }}
        >
          <motion.div
            className="absolute inset-y-0 -left-[60%] w-[160%]"
            initial={{ x: "-100%" }}
            animate={{ x: "120%" }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.58, ease: [0.22, 1, 0.36, 1] }}
            style={{
              background:
                "linear-gradient(100deg, rgba(255,255,255,0) 0%, rgba(255,255,255,0.2) 35%, rgba(37,99,235,0.18) 50%, rgba(45,212,191,0.14) 62%, rgba(255,255,255,0) 100%)"
            }}
          >
            <div className="h-full w-full bg-[repeating-radial-gradient(circle_at_0_0,rgba(255,255,255,0.18)_0_1px,transparent_1px_7px)] opacity-20" />
          </motion.div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}
