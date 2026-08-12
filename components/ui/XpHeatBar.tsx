"use client";

import { barPosition, heatBarColor } from "@/lib/gradeColors";
import { useBarRevealAnimation } from "@/lib/useBarRevealAnimation";

type Props = {
  value: number | null | undefined;
  animate?: boolean;
  animationKey?: string;
  animationDelayMs?: number;
};

export function XpHeatBar({ value, animate = false, animationKey, animationDelayMs = 0 }: Props) {
  const pos = barPosition(value);
  const endColor = value != null ? heatBarColor(pos) : "#64748b";
  const revealKey = animationKey ?? value ?? 0;
  const revealed = useBarRevealAnimation(revealKey, animate && value != null);
  const shownPos = revealed ? pos : 0;

  return (
    <div className={`xp-heat-bar metric-gradient-bar${value == null ? " xp-heat-bar-empty" : ""}`}>
      <div className="xp-heat-bar-track metric-gradient-bar-track">
        <div className="xp-heat-bar-spectrum metric-gradient-bar-spectrum" aria-hidden="true" />
        {value != null && (
          <div
            className={`xp-heat-bar-fill metric-gradient-bar-fill${animate ? " metric-gradient-bar-fill-animated" : ""}`}
            style={{
              width: `${shownPos}%`,
              transitionDelay: animate ? `${animationDelayMs}ms` : undefined,
              background: `linear-gradient(90deg, rgba(100, 116, 139, 0.45) 0%, rgba(250, 204, 21, 0.55) 52%, ${endColor}99 100%)`,
            }}
          />
        )}
        {value != null && (
          <span
            className={`xp-heat-bar-marker metric-gradient-bar-marker${animate ? " metric-gradient-bar-marker-animated" : ""}`}
            style={{
              left: `${shownPos}%`,
              transitionDelay: animate ? `${animationDelayMs}ms` : undefined,
            }}
          />
        )}
      </div>
    </div>
  );
}
