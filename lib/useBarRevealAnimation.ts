"use client";

import { useEffect, useState } from "react";

function prefersReducedMotion(): boolean {
  if (typeof window === "undefined") return false;
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

export function useBarRevealAnimation(resetKey: string | number | undefined, enabled = true) {
  const [revealed, setRevealed] = useState(!enabled);

  useEffect(() => {
    if (!enabled || prefersReducedMotion()) {
      setRevealed(true);
      return;
    }

    setRevealed(false);
    const frame = requestAnimationFrame(() => {
      requestAnimationFrame(() => setRevealed(true));
    });

    return () => cancelAnimationFrame(frame);
  }, [resetKey, enabled]);

  return revealed;
}

export function useCountUp(
  target: number,
  resetKey: string | number | undefined,
  enabled = true,
  durationMs = 650,
) {
  const [value, setValue] = useState(enabled ? 0 : target);

  useEffect(() => {
    if (!enabled || prefersReducedMotion()) {
      setValue(target);
      return;
    }

    setValue(0);
    const start = performance.now();

    let frame = 0;
    const tick = (now: number) => {
      const progress = Math.min(1, (now - start) / durationMs);
      const eased = 1 - (1 - progress) ** 3;
      setValue(target * eased);
      if (progress < 1) frame = requestAnimationFrame(tick);
    };

    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [target, resetKey, enabled, durationMs]);

  return value;
}
