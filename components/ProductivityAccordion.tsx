"use client";

import { DualSofascoreAccordion } from "@/components/DualSofascoreAccordion";
import { useI18n } from "@/lib/i18n/context";

type Props = {
  gradeGeral?: number | null;
  gradeRel?: number | null;
  gradeBlend?: number | null;
  relLiftBadge?: boolean;
  relGap?: number | null;
  relGapPoolMean?: number | null;
  relGapPoolP70?: number | null;
  animate?: boolean;
  animationKey?: string;
};

export function ProductivityAccordion({
  gradeGeral,
  gradeRel,
  gradeBlend,
  relLiftBadge = false,
  relGap,
  relGapPoolMean,
  relGapPoolP70,
}: Props) {
  const { m } = useI18n();

  return (
    <DualSofascoreAccordion
      title={m.productivity.title}
      summaryTip={m.tooltips.xpProfileBars.xp_activity_display}
      icon="fa-chart-simple"
      primaryLabel={m.productivity.general}
      secondaryLabel={m.productivity.relative}
      primaryTip={m.productivity.generalTip}
      secondaryTip={m.productivity.relativeTip}
      gradePrimary={gradeGeral}
      gradeSecondary={gradeRel}
      gradeBlend={gradeBlend}
      blendWeight={0.7}
      secondaryBadge={relLiftBadge}
      secondaryBadgeKind="prod-rel"
      secondaryBadgeGap={relGap}
      secondaryBadgePoolMean={relGapPoolMean}
      secondaryBadgePoolP70={relGapPoolP70}
    />
  );
}
