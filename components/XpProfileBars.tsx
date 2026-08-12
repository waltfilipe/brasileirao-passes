"use client";

import type { XpBar } from "@/lib/api";
import { XpHeatBar } from "@/components/ui/XpHeatBar";
import { Tooltip } from "@/components/ui/Tooltip";
import { useI18n } from "@/lib/i18n/context";

const ICONS: Record<string, string> = {
  xp_activity_display: "fa-chart-simple",
  xp_efficiency_display: "fa-gauge-high",
  xp_edge_display: "fa-bolt",
};

export function XpProfileBars({
  bars,
  animate = false,
  animationKey,
}: {
  bars: XpBar[];
  animate?: boolean;
  animationKey?: string;
}) {
  const { m } = useI18n();
  const tips = m.tooltips.xpProfileBars;

  return (
    <div className="xp-profile-bars">
      {bars.map((bar, index) => (
        <Tooltip key={bar.key} content={tips[bar.key] ?? ""} block>
          <div className="xp-metric-block">
            <div className="pass-metric-head">
              <span className="pass-metric-label xp-metric-label">
                {ICONS[bar.key] && (
                  <i className={`fa-solid ${ICONS[bar.key]} xp-metric-icon`} aria-hidden="true" />
                )}
                {bar.label}
              </span>
            </div>
            <XpHeatBar
              value={bar.value}
              animate={animate}
              animationKey={animationKey ? `${animationKey}-${bar.key}` : bar.key}
              animationDelayMs={animate ? index * 90 : 0}
            />
          </div>
        </Tooltip>
      ))}
    </div>
  );
}
