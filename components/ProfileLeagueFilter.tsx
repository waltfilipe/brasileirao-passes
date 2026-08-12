"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import type { CSSProperties } from "react";
import { EUROPEAN_LEAGUES } from "@/lib/europeanLeagues";
import { buildProfileUrl, type ProfileFilterState } from "@/lib/profileParams";
import { useI18n } from "@/lib/i18n/context";

type Props = {
  current: ProfileFilterState;
  counts: Record<string, number>;
};

export function ProfileLeagueFilter({ current, counts }: Props) {
  const router = useRouter();
  const { m } = useI18n();
  const activeLeague = current.league ?? null;

  function selectLeague(leagueKey: string) {
    const nextLeague = activeLeague === leagueKey ? undefined : leagueKey;
    router.push(
      buildProfileUrl({
        ...current,
        league: nextLeague,
        player: undefined,
      }),
    );
  }

  return (
    <section className="profile-league-filter" aria-label={m.profile.leagueFilter.ariaLabel}>
      <span className="profile-league-filter-eyebrow">{m.profile.leagueFilter.eyebrow}</span>
      <div className="profile-league-filter-grid">
        {EUROPEAN_LEAGUES.map((league) => {
          const isActive = activeLeague === league.key;
          const count = counts[league.key] ?? 0;
          return (
            <button
              key={league.key}
              type="button"
              className={`profile-league-card${isActive ? " active" : ""}`}
              style={{ "--league-accent": league.accent } as CSSProperties}
              aria-pressed={isActive}
              onClick={() => selectLeague(league.key)}
            >
              <span className="profile-league-card-logo-wrap">
                <Image
                  src={league.logoUrl}
                  alt=""
                  width={44}
                  height={44}
                  className="profile-league-card-logo"
                />
              </span>
              <span className="profile-league-card-copy">
                <strong className="profile-league-card-title">{league.label}</strong>
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
