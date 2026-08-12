"use client";

import { useRouter } from "next/navigation";
import type { CSSProperties } from "react";
import { PROFILE_ALL_GROUP } from "@/lib/playerReports";
import { buildProfileUrl, type ProfileFilterState } from "@/lib/profileParams";
import { useI18n } from "@/lib/i18n/context";
import { ProfileTeamFilter } from "@/components/ProfileTeamFilter";

type Props = {
  current: ProfileFilterState;
  counts: Record<string, number>;
  teamCounts: Record<string, number>;
};

export function ProfileGroupCards({ current, counts, teamCounts }: Props) {
  const router = useRouter();
  const { m } = useI18n();
  const isAllActive = !current.team;
  const allCategory = m.profileCategories.all;

  function selectAll() {
    if (isAllActive) return;
    router.push(
      buildProfileUrl({
        ...current,
        team: undefined,
        player: undefined,
      }),
    );
  }

  return (
    <>
      <section className="reports-category-panel profile-group-panel">
        <button
          type="button"
          className={`reports-category-card profile-group-all-card${isAllActive ? " active" : ""}`}
          style={{ "--category-accent": PROFILE_ALL_GROUP.accent } as CSSProperties}
          onClick={selectAll}
        >
          <div className="profile-group-all-main">
            <span className="reports-category-card-eyebrow">{allCategory.subtitle}</span>
            <strong className="reports-category-card-title profile-group-all-title">
              {allCategory.title}
            </strong>
          </div>
          <span className="reports-category-card-count tabular profile-group-all-count">
            {counts[PROFILE_ALL_GROUP.id] ?? 0} {m.common.athletes}
          </span>
        </button>
      </section>

      <ProfileTeamFilter current={current} counts={teamCounts} />
    </>
  );
}
