"use client";

import { passGradeGradientColor, sofascoreBarPosition, sofascoreGradePct } from "@/lib/gradeColors";
import { useBarRevealAnimation, useCountUp } from "@/lib/useBarRevealAnimation";
import { Tooltip } from "@/components/ui/Tooltip";
import { useI18n } from "@/lib/i18n/context";
import type { Messages } from "@/lib/i18n/messages";

type Props = {
  rating: number | null | undefined;
  animate?: boolean;
  animationKey?: string;
};

function tierKey(score: number): keyof Messages["passGrade"]["tiers"] {
  if (score >= 8.5) return "elite";
  if (score >= 7.8) return "veryGood";
  if (score >= 6.9) return "good";
  if (score >= 5.8) return "average";
  return "belowAverage";
}

const TIER_CSS: Record<keyof Messages["passGrade"]["tiers"], string> = {
  elite: "elite",
  veryGood: "very-good",
  good: "good",
  average: "average",
  belowAverage: "below-average",
};

export function PassGradePanel({ rating, animate = false, animationKey }: Props) {
  const { m } = useI18n();

  const displayScore = rating != null ? rating * 10 : null;
  const revealKey = animationKey ?? displayScore ?? 0;
  const revealed = useBarRevealAnimation(revealKey, animate && displayScore != null);
  const animatedScore = useCountUp(displayScore ?? 0, revealKey, animate && displayScore != null);

  if (rating == null || displayScore == null) {
    return (
      <div className="player-card pass-grade-card">
        <div className="pass-grade-head">
          <span className="pass-grade-title">{m.passGrade.title}</span>
        </div>
        <p className="placeholder-note">{m.passGrade.unavailable}</p>
      </div>
    );
  }

  const pct = sofascoreGradePct(displayScore);
  const markerPct = sofascoreBarPosition(displayScore);
  const shownPct = revealed ? pct : 0;
  const shownMarkerPct = revealed ? markerPct : 0;
  const color = passGradeGradientColor(pct);
  const tierId = tierKey(displayScore);
  const tier = m.passGrade.tiers[tierId];
  const tierKeyClass = TIER_CSS[tierId];

  const panel = (
    <div className={`player-card pass-grade-card pass-grade-tier-${tierKeyClass}`}>
      <div className="pass-grade-head">
        <span className="pass-grade-title">{m.passGrade.title}</span>
        <span
          className="pass-grade-tier"
          style={{ color, borderColor: `${color}55`, background: `${color}1a` }}
        >
          {tier}
        </span>
      </div>

      <div className="pass-grade-body pass-grade-body-horizontal">
        <div className="pass-grade-value">
          <span className="pass-grade-score tabular" style={{ color }}>
            {(animate ? animatedScore : displayScore).toFixed(1)}
          </span>
          <span className="pass-grade-scale">/ 10</span>
        </div>

        <div className="pass-grade-meter">
          <div className="pass-grade-track">
            <span className="pass-grade-shade">
              <span
                className={`pass-grade-rest${animate ? " pass-grade-rest-animated" : ""}`}
                style={{ left: `${shownPct}%` }}
              />
            </span>
            <span
              className={`pass-grade-marker${animate ? " pass-grade-marker-animated" : ""}`}
              style={{ left: `${shownMarkerPct}%` }}
            />
          </div>
        </div>
      </div>
    </div>
  );

  return <Tooltip content={m.tooltips.passGrade} block>{panel}</Tooltip>;
}
