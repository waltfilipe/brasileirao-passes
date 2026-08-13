"use client";

import { DualSofascoreAccordion } from "@/components/DualSofascoreAccordion";
import { useI18n } from "@/lib/i18n/context";

type Props = {
  gradeXpv?: number | null;
  gradeThreat?: number | null;
  gradeBlend?: number | null;
  animate?: boolean;
  animationKey?: string;
};

export function LethalityAccordion({
  gradeXpv,
  gradeThreat,
  gradeBlend,
}: Props) {
  const { m } = useI18n();

  return (
    <DualSofascoreAccordion
      title={m.lethality.title}
      summaryTip={m.tooltips.xpProfileBars.xp_edge_display}
      icon="fa-bolt"
      primaryLabel={m.lethality.xpvPerPass}
      secondaryLabel={m.lethality.impactRate}
      primaryTip={m.lethality.xpvPerPassTip}
      secondaryTip={m.lethality.impactRateTip}
      gradePrimary={gradeXpv}
      gradeSecondary={gradeThreat}
      gradeBlend={gradeBlend}
      blendWeight={0.5}
    />
  );
}
