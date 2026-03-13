"use client";

import { useEffect, useState } from "react";

export function useLiveNow(intervalMs = 1000) {
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    setNow(new Date());
    const timer = window.setInterval(() => {
      setNow(new Date());
    }, Math.max(250, intervalMs));

    return () => {
      window.clearInterval(timer);
    };
  }, [intervalMs]);

  return now;
}
