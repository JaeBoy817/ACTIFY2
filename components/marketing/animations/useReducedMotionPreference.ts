"use client";

import { createContext, useContext, useEffect, useMemo, useState } from "react";

export type ReducedMotionPreference = {
  reducedMotion: boolean;
  isPageVisible: boolean;
};

export const ReducedMotionPreferenceContext = createContext<ReducedMotionPreference | null>(null);

export function useReducedMotionPreference(): ReducedMotionPreference {
  const contextValue = useContext(ReducedMotionPreferenceContext);
  const [reducedMotion, setReducedMotion] = useState(false);
  const [isPageVisible, setIsPageVisible] = useState(true);

  useEffect(() => {
    if (contextValue) return;
    const media = window.matchMedia("(prefers-reduced-motion: reduce)");
    const onMediaChange = () => setReducedMotion(media.matches);
    const onVisibility = () => setIsPageVisible(document.visibilityState === "visible");

    onMediaChange();
    onVisibility();
    media.addEventListener("change", onMediaChange);
    document.addEventListener("visibilitychange", onVisibility);
    return () => {
      media.removeEventListener("change", onMediaChange);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, [contextValue]);

  return useMemo(
    () =>
      contextValue ?? {
        reducedMotion,
        isPageVisible
      },
    [contextValue, isPageVisible, reducedMotion]
  );
}
