"use client";

import { Tooltip } from "@/components/ui/Tooltip";
import { useI18n } from "@/lib/i18n/context";

type Props = {
  gap?: number | null;
  poolMean?: number | null;
  poolP70?: number | null;
};

export function PrecStratumLiftBadge({ gap, poolMean, poolP70 }: Props) {
  const { m } = useI18n();
  const tip = m.badges.precStratumLiftTooltip
    .replace("{gap}", gap != null ? gap.toFixed(2) : "—")
    .replace("{mean}", poolMean != null ? poolMean.toFixed(2) : "—")
    .replace("{p70}", poolP70 != null ? poolP70.toFixed(2) : "—");

  return (
    <Tooltip content={tip}>
      <span
        className="prec-stratum-lift-badge"
        aria-label={m.badges.precStratumLift}
        title={tip}
      >
        <i className="fa-solid fa-layer-group" aria-hidden="true" />
      </span>
    </Tooltip>
  );
}
