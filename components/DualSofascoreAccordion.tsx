"use client";

import { passGradeGradientColor, sofascoreGradePct } from "@/lib/gradeColors";
import { PrecStratumLiftBadge } from "@/components/ui/PrecStratumLiftBadge";
import { ProdRelLiftBadge } from "@/components/ui/ProdRelLiftBadge";
import { Tooltip } from "@/components/ui/Tooltip";

type LiftBadgeKind = "prod-rel" | "prec-stratum";

function GradeRow({
  label,
  weightPct,
  grade,
  tip,
  badge,
  badgeKind = "prod-rel",
  badgeGap,
  badgePoolMean,
  badgePoolP70,
}: {
  label: string;
  weightPct?: number;
  grade?: number | null;
  tip: string;
  badge?: boolean;
  badgeKind?: LiftBadgeKind;
  badgeGap?: number | null;
  badgePoolMean?: number | null;
  badgePoolP70?: number | null;
}) {
  const color =
    grade != null ? passGradeGradientColor(sofascoreGradePct(grade)) : "#64748b";

  const row = (
    <div className="sofascore-grade-row">
      <div className="sofascore-grade-head">
        <span className="sofascore-grade-label">
          {label}
          {weightPct != null && (
            <span className="sofascore-grade-weight">{weightPct}%</span>
          )}
        </span>
        <span className="sofascore-grade-value-wrap">
          <span className="sofascore-grade-value tabular" style={{ color }}>
            {grade != null ? grade.toFixed(1) : "—"}
          </span>
          {badge && badgeKind === "prec-stratum" && (
            <PrecStratumLiftBadge
              gap={badgeGap}
              poolMean={badgePoolMean}
              poolP70={badgePoolP70}
            />
          )}
          {badge && badgeKind === "prod-rel" && (
            <ProdRelLiftBadge
              gap={badgeGap}
              poolMean={badgePoolMean}
              poolP70={badgePoolP70}
            />
          )}
        </span>
      </div>
    </div>
  );

  return (
    <Tooltip content={tip} block>
      {row}
    </Tooltip>
  );
}

type Props = {
  title: string;
  summaryTip?: string;
  icon: string;
  primaryLabel: string;
  secondaryLabel: string;
  primaryTip: string;
  secondaryTip: string;
  gradePrimary?: number | null;
  gradeSecondary?: number | null;
  gradeBlend?: number | null;
  blendWeight?: number;
  secondaryBadge?: boolean;
  secondaryBadgeKind?: LiftBadgeKind;
  secondaryBadgeGap?: number | null;
  secondaryBadgePoolMean?: number | null;
  secondaryBadgePoolP70?: number | null;
};

export function DualSofascoreAccordion({
  title,
  summaryTip,
  icon,
  primaryLabel,
  secondaryLabel,
  primaryTip,
  secondaryTip,
  gradePrimary,
  gradeSecondary,
  gradeBlend,
  blendWeight = 0.7,
  secondaryBadge = false,
  secondaryBadgeKind = "prod-rel",
  secondaryBadgeGap,
  secondaryBadgePoolMean,
  secondaryBadgePoolP70,
}: Props) {
  const w = blendWeight;
  const computedBlend =
    gradeBlend ??
    (gradePrimary != null && gradeSecondary != null
      ? w * gradePrimary + (1 - w) * gradeSecondary
      : gradePrimary ?? gradeSecondary);
  const headPct = computedBlend != null ? sofascoreGradePct(computedBlend) : 0;
  const headColor =
    computedBlend != null ? passGradeGradientColor(headPct) : "#94a3b8";
  const primaryWeightPct = Math.round(w * 100);
  const secondaryWeightPct = 100 - primaryWeightPct;

  return (
    <details className="sofascore-pillar-accordion consistency-accordion">
      <summary className="sofascore-pillar-trigger consistency-accordion-trigger" title={summaryTip}>
        <span className="sofascore-pillar-trigger-left consistency-accordion-left">
          <i
            className="fa-solid fa-chevron-right consistency-accordion-chevron sofascore-pillar-chevron"
            aria-hidden="true"
          />
          <span className="xp-index-row-icon sofascore-pillar-icon">
            <i className={`fa-solid ${icon}`} />
          </span>
          <span className="sofascore-pillar-title consistency-accordion-title">{title}</span>
        </span>
        <span className="sofascore-pillar-score tabular" style={{ color: headColor }}>
          {computedBlend != null ? computedBlend.toFixed(1) : "—"}
        </span>
      </summary>
      <div className="sofascore-pillar-panel consistency-accordion-panel">
        <div className="sofascore-pillar-rows">
          <GradeRow
            label={primaryLabel}
            weightPct={primaryWeightPct}
            grade={gradePrimary}
            tip={primaryTip}
          />
          <GradeRow
            label={secondaryLabel}
            weightPct={secondaryWeightPct}
            grade={gradeSecondary}
            tip={secondaryTip}
            badge={secondaryBadge}
            badgeKind={secondaryBadgeKind}
            badgeGap={secondaryBadgeGap}
            badgePoolMean={secondaryBadgePoolMean}
            badgePoolP70={secondaryBadgePoolP70}
          />
        </div>
      </div>
    </details>
  );
}
