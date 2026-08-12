"use client";

import { useI18n } from "@/lib/i18n/context";

type Props = {
  show?: boolean;
};

export function PassMetricStratumStar({ show }: Props) {
  const { m } = useI18n();
  if (!show) return null;
  return (
    <i
      className="pass-metric-stratum-star fa-solid fa-star"
      title={m.stratumStar}
      aria-label={m.stratumStar}
    />
  );
}
