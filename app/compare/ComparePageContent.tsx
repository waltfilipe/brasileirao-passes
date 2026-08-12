"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import type { CSSProperties } from "react";
import { CompareCenter } from "@/components/CompareCenter";
import { ComparePlayerCard } from "@/components/ComparePlayerCard";
import { LoadingState } from "@/components/LoadingState";
import { getCompare, getPlayerOptionsLegacy, type ComparePayload } from "@/lib/api";
import { POSITION_FAMILIES, positionFamilyForPlayer } from "@/lib/playerReports";
import { useI18n } from "@/lib/i18n/context";

export default function ComparePageContent() {
  const { m } = useI18n();
  const searchParams = useSearchParams();
  const [positionFamily, setPositionFamily] = useState(
  searchParams.get("position_family") ?? "midfielders",
  );
  const [playerA, setPlayerA] = useState(searchParams.get("a") ?? "");
  const [playerB, setPlayerB] = useState(searchParams.get("b") ?? "");
  const [data, setData] = useState<ComparePayload | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [mapsMode, setMapsMode] = useState(false);

  useEffect(() => {
    getPlayerOptionsLegacy({ position_family: positionFamily }).then((r) => {
      const options = r.options;
      const validA = options.some((o) => o.player_id === playerA);
      const validB = options.some((o) => o.player_id === playerB);
      if (!validA) setPlayerA(options[0]?.player_id ?? "");
      if (!validB) setPlayerB(options.find((o) => o.player_id !== playerA)?.player_id ?? options[1]?.player_id ?? "");
    }).catch(() => setError(m.compare.backendUnavailable));
  }, [positionFamily, m.compare.backendUnavailable]);

  useEffect(() => {
    if (!playerA || !playerB || playerA === playerB) return;
    const familyA = positionFamilyForPlayer(playerA);
    const familyB = positionFamilyForPlayer(playerB);
    if (familyA && familyB && familyA !== familyB) {
      setError(m.compare.samePositionRequired);
      setData(null);
      return;
    }
    setLoading(true);
    setError(null);
    getCompare(playerA, playerB, positionFamily)
      .then(setData)
      .catch((e) => setError(e instanceof Error ? e.message : m.common.loadFailed))
      .finally(() => setLoading(false));
  }, [playerA, playerB, positionFamily, m.common.loadFailed, m.compare.samePositionRequired]);

  function selectPositionFamily(nextFamily: string) {
    if (nextFamily === positionFamily) return;
    setPositionFamily(nextFamily);
    setPlayerA("");
    setPlayerB("");
    setData(null);
    setError(null);
  }

  const nameA = data ? String(data.player_a.player_name ?? m.common.playerA) : m.common.playerA;
  const nameB = data ? String(data.player_b.player_name ?? m.common.playerB) : m.common.playerB;

  return (
    <div className="profile-page compare-page">
      <header className="profile-page-hero compare-page-hero">
        <div className="container">
          <div className="profile-page-hero-inner">
            <div>
              <span className="profile-page-eyebrow">{m.brand.name}</span>
              <h1>{m.nav.compare}</h1>
              <p>{m.compare.pageLead}</p>
            </div>
          </div>
        </div>
      </header>

      <div className="container profile-page-body">
        <section className="reports-category-panel compare-position-panel">
          <div className="reports-category-grid profile-group-age-grid">
            {POSITION_FAMILIES.map((family) => {
              const isActive = positionFamily === family.key;
              const meta = m.profileCategories[family.key] ?? {
                title: family.label,
                subtitle: family.label,
                description: "",
              };
              return (
                <button
                  key={family.key}
                  type="button"
                  className={`reports-category-card${isActive ? " active" : ""}`}
                  style={{ "--category-accent": family.accent } as CSSProperties}
                  onClick={() => selectPositionFamily(family.key)}
                >
                  <span className="reports-category-card-eyebrow">{meta.subtitle}</span>
                  <strong className="reports-category-card-title">{meta.title}</strong>
                  <p className="reports-category-card-desc">{meta.description}</p>
                </button>
              );
            })}
          </div>
        </section>

        {loading && <LoadingState message={m.compare.loading} />}
        {error && <div className="error-box">{error}</div>}

        {data && !loading && (
          <div className={`compare-layout${mapsMode ? " compare-layout-maps" : ""}`}>
            <ComparePlayerCard
              side="a"
              player={data.player_a}
              heatmap={data.heatmap_a_b64}
              playerId={playerA}
              excludePlayerId={playerB}
              positionFamily={positionFamily}
              onPlayerChange={setPlayerA}
              mapsMode={mapsMode}
              onToggleMaps={() => setMapsMode((v) => !v)}
            />
            <div className="player-card compare-charts-card">
              <CompareCenter
                pillars={data.pillars}
                passGrid={data.pass_grid}
                nameA={nameA}
                nameB={nameB}
              />
            </div>
            <ComparePlayerCard
              side="b"
              player={data.player_b}
              heatmap={data.heatmap_b_b64}
              playerId={playerB}
              excludePlayerId={playerA}
              positionFamily={positionFamily}
              onPlayerChange={setPlayerB}
              mapsMode={mapsMode}
              onToggleMaps={() => setMapsMode((v) => !v)}
            />
          </div>
        )}
      </div>
    </div>
  );
}
