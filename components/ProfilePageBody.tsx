"use client";

import { useSearchParams } from "next/navigation";
import { Suspense, useEffect, useMemo, useState } from "react";
import { LoadingState } from "@/components/LoadingState";
import { PlayerSearchRow } from "@/components/PlayerSearchRow";
import { ProfileGroupCards } from "@/components/ProfileGroupCards";
import { ProfileView } from "@/components/ProfileView";
import { getPlayerOptions, getPlayers } from "@/lib/api";
import { POSITION_FAMILY, PROFILE_ALL_GROUP, profileGroupCounts, profileTeamCounts } from "@/lib/playerReports";
import { filtersFromRecord, filtersToApiParams, type ProfileFilterState } from "@/lib/profileParams";
import { useI18n } from "@/lib/i18n/context";

function filtersForTeam(filters: ProfileFilterState): ProfileFilterState {
  if (!filters.team) {
    const { team: _removed, ...rest } = filters;
    return rest;
  }
  return filters;
}

function ProfilePageBodyInner() {
  const { m } = useI18n();
  const searchParams = useSearchParams();
  const filters = useMemo(
    () => filtersFromRecord(Object.fromEntries(searchParams.entries())),
    [searchParams],
  );
  const activeFilters = useMemo(() => filtersForTeam(filters), [filters]);

  const [options, setOptions] = useState<{ player_id: string; label: string }[]>([]);
  const [groupCounts, setGroupCounts] = useState<Record<string, number>>({});
  const [teamCounts, setTeamCounts] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const filterKey = searchParams.toString();

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);

    const currentFilters = filtersFromRecord(Object.fromEntries(searchParams.entries()));
    const apiParams = filtersToApiParams(filtersForTeam(currentFilters));

    Promise.all([
      getPlayers({ limit: 100, ...apiParams }),
      getPlayerOptions(filtersForTeam(currentFilters)),
    ])
      .then(([playersRes, optionsRes]) => {
        if (cancelled) return;
        setGroupCounts(profileGroupCounts(playersRes.players));
        setTeamCounts(profileTeamCounts(playersRes.players));
        setOptions(optionsRes.options);
      })
      .catch((e) => {
        if (cancelled) return;
        setError(e instanceof Error ? e.message : m.compare.backendUnavailable);
        setOptions([]);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [filterKey, searchParams, m.compare.backendUnavailable]);

  const playerId = filters.player ?? options[0]?.player_id;

  if (loading) {
    return <LoadingState message={m.profile.loadingPool} />;
  }

  return (
    <>
      {error && (
        <p className="muted profile-empty-note">
          {error}. {m.profile.backendRetryNote}
        </p>
      )}

      <ProfileGroupCards
        current={filters}
        counts={groupCounts}
        teamCounts={teamCounts}
      />

      {options.length > 0 ? (
        <PlayerSearchRow options={options} currentId={playerId} filters={activeFilters} />
      ) : !error ? (
        <p className="muted profile-empty-note">
          {m.profile.noPlayersInGroup}
        </p>
      ) : null}

      {playerId ? <ProfileView playerId={playerId} positionFamily={POSITION_FAMILY} /> : null}
    </>
  );
}

export function ProfilePageBody() {
  const { m } = useI18n();

  return (
    <Suspense fallback={<LoadingState message={m.profile.loadingProfile} />}>
      <ProfilePageBodyInner />
    </Suspense>
  );
}
