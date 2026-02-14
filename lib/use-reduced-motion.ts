"use client";

import { useEffect, useState } from "react";

export function useReducedMotion() {
  const [reducedMotion, setReducedMotion] = useState(false);

  useEffect(() => {
    const media = window.matchMedia("(prefers-reduced-motion: reduce)");
    const getPreferredValue = () => {
      const override = document.documentElement.getAttribute("data-actify-reduce-motion");
      if (override === "true") return true;
      if (override === "false") return false;
      return media.matches;
    };
    const onChange = () => setReducedMotion(getPreferredValue());
    const observer = new MutationObserver(onChange);

    onChange();
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["data-actify-reduce-motion"]
    });
    media.addEventListener("change", onChange);
    return () => {
      observer.disconnect();
      media.removeEventListener("change", onChange);
    };
  }, []);

  return reducedMotion;
}
