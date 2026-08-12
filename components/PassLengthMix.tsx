"use client";

import { Tooltip } from "@/components/ui/Tooltip";
import { useI18n } from "@/lib/i18n/context";

const REF_CENTER_PCT = 11.4;

export type PassLengthData = {
  long_pass_share_pct?: number | null;
  long_pass_share_ref_avg_pct?: number | null;
  long_pass_share_pctile?: number | null;
};

export function PassLengthMix({ data }: { data: PassLengthData }) {
  const { m } = useI18n();
  const share = data.long_pass_share_pct;
  if (share == null) return null;

  const shortShare = 100 - share;
  const playerPos = Math.max(4, Math.min(96, share));
  const refPos = Math.max(4, Math.min(96, REF_CENTER_PCT));

  const card = (
    <div className="pass-mix-card">
      <div className="pass-mix-head">
        <span className="pass-mix-icon">
          <i className="fa-solid fa-ruler-horizontal" />
        </span>
        <span className="pass-mix-title">{m.passLengthMix.title}</span>
      </div>

      <div className="pass-mix-track">
        <span
          className="pass-mix-center"
          style={{ left: `${refPos}%` }}
          title={m.passLengthMix.leagueRefTitle.replace("{pct}", String(REF_CENTER_PCT))}
        />
        <span
          className="pass-mix-marker"
          style={{ left: `${playerPos}%` }}
          title={m.passLengthMix.playerLongTitle.replace("{pct}", share.toFixed(1))}
        />
      </div>

      <div className="pass-mix-axis">
        <span className="axis-short">{m.passLengthMix.short}</span>
        <span className="axis-long">{m.passLengthMix.long}</span>
      </div>

      <div className="pass-mix-legend">
        <span className="legend-short">
          <strong>{m.passLengthMix.shortLegend.replace("{pct}", shortShare.toFixed(1))}</strong>
        </span>
        <span className="legend-long">
          <strong>{m.passLengthMix.longLegend.replace("{pct}", share.toFixed(1))}</strong>
        </span>
      </div>
    </div>
  );

  return <Tooltip content={m.tooltips.passLength} block>{card}</Tooltip>;
}
