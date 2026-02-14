"use client";

import { useEffect, useMemo, useState } from "react";

import { ReducedMotionPreferenceContext } from "@/components/marketing/animations/useReducedMotionPreference";

type MarketingMotionProviderProps = {
  children: React.ReactNode;
  userReducedMotion?: boolean | null;
};

export function MarketingMotionProvider({ children, userReducedMotion }: MarketingMotionProviderProps) {
  const [mediaReducedMotion, setMediaReducedMotion] = useState(false);
  const [isPageVisible, setIsPageVisible] = useState(true);

  useEffect(() => {
    const media = window.matchMedia("(prefers-reduced-motion: reduce)");
    const onMediaChange = () => setMediaReducedMotion(media.matches);
    const onVisibility = () => setIsPageVisible(document.visibilityState === "visible");

    onMediaChange();
    onVisibility();

    media.addEventListener("change", onMediaChange);
    document.addEventListener("visibilitychange", onVisibility);
    return () => {
      media.removeEventListener("change", onMediaChange);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, []);

  const reducedMotion = typeof userReducedMotion === "boolean" ? userReducedMotion : mediaReducedMotion;

  useEffect(() => {
    document.documentElement.setAttribute("data-actify-reduce-motion", reducedMotion ? "true" : "false");
    return () => {
      document.documentElement.removeAttribute("data-actify-reduce-motion");
    };
  }, [reducedMotion]);

  const contextValue = useMemo(
    () => ({
      reducedMotion,
      isPageVisible
    }),
    [isPageVisible, reducedMotion]
  );

  return (
    <ReducedMotionPreferenceContext.Provider value={contextValue}>
      {children}
    </ReducedMotionPreferenceContext.Provider>
  );
}
