"use client";

import { useEffect, useMemo, useState } from "react";

type UseReducedMotionPreferenceResult = {
  reducedMotion: boolean;
  isHydrated: boolean;
};

function getDocumentOverride() {
  if (typeof document === "undefined") return null;
  const override = document.documentElement.getAttribute("data-actify-reduce-motion");
  if (override === "true") return true;
  if (override === "false") return false;
  return null;
}

export function useReducedMotionPreference(userReducedMotion?: boolean | null): UseReducedMotionPreferenceResult {
  const [mediaReducedMotion, setMediaReducedMotion] = useState(false);
  const [isHydrated, setIsHydrated] = useState(false);

  useEffect(() => {
    const media = window.matchMedia("(prefers-reduced-motion: reduce)");
    const onChange = () => setMediaReducedMotion(media.matches);
    const observer = new MutationObserver(onChange);

    onChange();
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["data-actify-reduce-motion"]
    });
    media.addEventListener("change", onChange);
    setIsHydrated(true);

    return () => {
      observer.disconnect();
      media.removeEventListener("change", onChange);
    };
  }, []);

  const reducedMotion = useMemo(() => {
    if (typeof userReducedMotion === "boolean") return userReducedMotion;
    const override = getDocumentOverride();
    if (typeof override === "boolean") return override;
    return mediaReducedMotion;
  }, [mediaReducedMotion, userReducedMotion]);

  return { reducedMotion, isHydrated };
}
