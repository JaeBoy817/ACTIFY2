"use client";

import { useEffect, useRef } from "react";

type DevRenderTraceOptions = {
  every?: number;
  details?: Record<string, unknown>;
};

const ENABLED = process.env.NODE_ENV === "development" && process.env.NEXT_PUBLIC_DEBUG_RENDERS === "1";

export function useDevRenderTrace(name: string, options: DevRenderTraceOptions = {}) {
  const renderCount = useRef(0);
  renderCount.current += 1;

  useEffect(() => {
    if (!ENABLED) return;

    const every = options.every ?? 10;
    if (renderCount.current === 1 || renderCount.current % every === 0) {
      // eslint-disable-next-line no-console
      console.debug("[ACTIFY render]", {
        component: name,
        count: renderCount.current,
        ...(options.details ?? {})
      });
    }
  });
}

