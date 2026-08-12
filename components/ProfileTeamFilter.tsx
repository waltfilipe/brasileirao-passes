"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import type { CSSProperties } from "react";
import { BRASILEIRAO_TEAMS } from "@/lib/brasileiraoTeams";
import { buildProfileUrl, type ProfileFilterState } from "@/lib/profileParams";
import { useI18n } from "@/lib/i18n/context";

type Props = {
  current: ProfileFilterState;
  counts: Record<string, number>;
};

export function ProfileTeamFilter({ current, counts }: Props) {
  const router = useRouter();
  const { m } = useI18n();
  const activeTeam = current.team ?? null;

  function selectTeam(teamKey: string) {
    const nextTeam = activeTeam === teamKey ? undefined : teamKey;
    router.push(
      buildProfileUrl({
        ...current,
        team: nextTeam,
        player: undefined,
      }),
    );
  }

  return (
    <section className="profile-league-filter" aria-label={m.profile.teamFilter.ariaLabel}>
      <span className="profile-league-filter-eyebrow">{m.profile.teamFilter.eyebrow}</span>
      <div className="profile-league-filter-grid">
        {BRASILEIRAO_TEAMS.map((team) => {
          const isActive = activeTeam === team.key;
          const count = counts[team.key] ?? 0;
          return (
            <button
              key={team.key}
              type="button"
              className={`profile-league-card${isActive ? " active" : ""}`}
              style={{ "--league-accent": team.accent } as CSSProperties}
              aria-pressed={isActive}
              onClick={() => selectTeam(team.key)}
            >
              <span className="profile-league-card-logo-wrap">
                <Image
                  src={team.logoUrl}
                  alt=""
                  width={44}
                  height={44}
                  className="profile-league-card-logo"
                />
              </span>
              <span className="profile-league-card-copy">
                <strong className="profile-league-card-title">{team.label}</strong>
                <span className="profile-league-card-count tabular">
                  {count} {m.common.athletes}
                </span>
              </span>
            </button>
          );
        })}
      </div>
    </section>
  );
}
