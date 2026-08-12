"use client";

import { useSearchParams } from "next/navigation";
import { Suspense, useEffect, useMemo, useState } from "react";
import { LoadingState } from "@/components/LoadingState";
import { PlayerSearchRow } from "@/components/PlayerSearchRow";
import { ProfileGroupCards } from "@/components/ProfileGroupCards";
import { ProfileView } from "@/components/ProfileView";
import { getPlayerOptions, getPlayers } from "@/lib/api";
import { PROFILE_ALL_GROUP, positionFamilyForPlayer, profileGroupCounts } from "@/lib/playerReports";
import { filtersFromRecord, filtersToApiParams, type ProfileFilterState } from "@/lib/profileParams";
import { useI18n } from "@/lib/i18n/context";

function filtersForGroup(filters: ProfileFilterState): ProfileFilterState {
  const group = filters.profile_group ?? PROFILE_ALL_GROUP.id;
  if (group === PROFILE_ALL_GROUP.id) {
    const { profile_group: _removed, ...rest } = filters;
    return rest;
  }
  return { ...filters, profile_group: group, position_family: group };
}

function ProfilePageBodyInner() {
  const { m } = useI18n();
  const searchParams = useSearchParams();
  const filters = useMemo(
    () => filtersFromRecord(Object.fromEntries(searchParams.entries())),
    [searchParams],
  );
  const profileGroup = filters.profile_group ?? PROFILE_ALL_GROUP.id;
  const activeFilters = useMemo(() => filtersForGroup(filters), [filters]);

  const [options, setOptions] = useState<{ player_id: string; label: string }[]>([]);
  const [groupCounts, setGroupCounts] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const filterKey = searchParams.toString();

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);

    const currentFilters = filtersFromRecord(Object.fromEntries(searchParams.entries()));
    const apiParams = filtersToApiParams(filtersForGroup(currentFilters));

    Promise.all([
      getPlayers({ limit: 100, ...apiParams }),
      getPlayerOptions(filtersForGroup(currentFilters)),
    ])
      .then(([playersRes, optionsRes]) => {
        if (cancelled) return;
        setGroupCounts(profileGroupCounts(playersRes.players));
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
  const positionFamily =
    filters.position_family ??
    (playerId ? positionFamilyForPlayer(playerId) : undefined) ??
    (profileGroup !== PROFILE_ALL_GROUP.id ? profileGroup : "midfielders");

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

      <ProfileGroupCards current={{ ...filters, profile_group: profileGroup }} counts={groupCounts} />

      {options.length > 0 ? (
        <PlayerSearchRow options={options} currentId={playerId} filters={activeFilters} />
      ) : !error ? (
        <p className="muted profile-empty-note">
          {m.profile.noPlayersInGroup}
        </p>
      ) : null}

      {playerId ? <ProfileView playerId={playerId} positionFamily={positionFamily} /> : null}
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
