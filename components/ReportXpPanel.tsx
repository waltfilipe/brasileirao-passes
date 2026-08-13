import { PassLengthMix } from "@/components/PassLengthMix";
import { XpProfileBars } from "@/components/XpProfileBars";
import type { PlayerProfile } from "@/lib/api";
import { XpIndicesPanel } from "@/components/XpIndicesPanel";

type Props = {
  profile: PlayerProfile;
  accent?: string;
  expandAll?: boolean;
};

export function ReportXpPanel({ profile, accent = "#a78bfa", expandAll = false }: Props) {
  return (
    <div className="player-card xp-profile-card report-xp-card">
      <h3 className="section-label">xP Profile</h3>
      <XpProfileBars
        bars={profile.xp_bars}
        productivity={{
          geral: profile.prod_grade_geral,
          secondary: profile.prod_grade_rel,
          blend: profile.prod_grade_blend,
          relLiftBadge: profile.prod_rel_lift_badge,
          relGap: profile.prod_rel_gap,
          relGapPoolMean: profile.prod_rel_gap_pool_mean,
          relGapPoolP70: profile.prod_rel_gap_pool_p70,
        }}
        precision={{
          geral: profile.prec_grade_geral,
          secondary: profile.prec_grade_stratum,
          blend: profile.prec_grade_blend,
          stratumLiftBadge: profile.prec_stratum_lift_badge,
          stratumGap: profile.prec_stratum_gap,
          stratumGapPoolMean: profile.prec_stratum_gap_pool_mean,
          stratumGapPoolP70: profile.prec_stratum_gap_pool_p70,
        }}
        lethality={{
          geral: profile.leth_grade_xpv,
          secondary: profile.leth_grade_threat,
          blend: profile.leth_grade_blend,
        }}
      />

      {(profile.xp_indices?.length ?? 0) > 0 && (
        <XpIndicesPanel
          indices={profile.xp_indices ?? []}
          roundGrades={profile.xp_round_grades ?? []}
          accent={accent}
          expandAll={expandAll}
        />
      )}

      <PassLengthMix data={profile} />
    </div>
  );
}
