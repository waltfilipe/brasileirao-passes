"use client";

import { useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";
import { LoadingState } from "@/components/LoadingState";
import { PageHero } from "@/components/PageHero";
import {
  getAggregatedMaps,
  getMapsOptions,
  getPassMap,
  getPlayerOptions,
} from "@/lib/api";
import { useI18n } from "@/lib/i18n/context";

function MapsContent() {
  const { m } = useI18n();
  const searchParams = useSearchParams();
  const positionFamily = "all";
  const [options, setOptions] = useState<{ player_id: string; label: string }[]>([]);
  const [mapOpts, setMapOpts] = useState<{ pass_filters: { key: string; label: string }[] } | null>(null);
  const [playerId, setPlayerId] = useState(searchParams.get("player") ?? "");
  const [passFilter, setPassFilter] = useState("progressive");
  const [passMap, setPassMap] = useState<{ pass_map_b64?: string | null; dest_map_b64?: string | null; caption: string } | null>(null);
  const [aggregated, setAggregated] = useState<{ common_map_b64?: string | null; rare_map_b64?: string | null; quadrant_stats: { quadrant: string; passes: number; share_pct: number }[] } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    Promise.all([
      getPlayerOptions({ position_family: positionFamily }),
      getMapsOptions(),
      getAggregatedMaps(positionFamily),
    ])
      .then(([opts, mopts, agg]) => {
        setOptions(opts.options);
        setMapOpts(mopts);
        setAggregated(agg);
        setPlayerId((current) => {
          const stillValid = opts.options.some((o) => o.player_id === current);
          if (stillValid) return current;
          return opts.options[0]?.player_id ?? "";
        });
      })
      .catch(() => setError(m.maps.backendUnavailable));
  }, [positionFamily, m.maps.backendUnavailable]);

  useEffect(() => {
    if (!playerId) return;
    setLoading(true);
    getPassMap(playerId, passFilter, "all", positionFamily)
      .then(setPassMap)
      .catch((e) => setError(String(e)))
      .finally(() => setLoading(false));
  }, [passFilter, playerId, positionFamily]);

  return (
    <div className="container">
      <PageHero title={m.nav.maps} subtitle={m.maps.subtitle} icon="fa-map-location-dot" />

      {error && <div className="error-box">{error}</div>}

      <div className="filter-card">
        <div className="filters" style={{ marginBottom: 0 }}>
          <select value={playerId} onChange={(e) => setPlayerId(e.target.value)}>
            {options.map((o) => <option key={o.player_id} value={o.player_id}>{o.label}</option>)}
          </select>
          {mapOpts && (
            <select value={passFilter} onChange={(e) => setPassFilter(e.target.value)}>
              {mapOpts.pass_filters.map((f) => <option key={f.key} value={f.key}>{f.label}</option>)}
            </select>
          )}
        </div>
      </div>

      {loading && <LoadingState message={m.maps.generating} />}

      {!loading && passMap && (
        <div className="maps-grid">
          {passMap.pass_map_b64 && <img src={`data:image/png;base64,${passMap.pass_map_b64}`} alt={m.maps.passMapAlt} className="map-img" />}
          {passMap.dest_map_b64 && <img src={`data:image/png;base64,${passMap.dest_map_b64}`} alt={m.maps.destMapAlt} className="map-img" />}
          <p className="muted" style={{ gridColumn: "1 / -1" }}>{passMap.caption}</p>
        </div>
      )}

      {aggregated && (
        <section style={{ marginTop: "2rem" }}>
          <h3 className="section-label" style={{ fontSize: "0.75rem", marginBottom: "0.75rem" }}>{m.maps.aggregateNote}</h3>
          <div className="maps-grid">
            {aggregated.common_map_b64 && <img src={`data:image/png;base64,${aggregated.common_map_b64}`} alt={m.maps.commonPassesAlt} className="map-img" />}
            {aggregated.rare_map_b64 && <img src={`data:image/png;base64,${aggregated.rare_map_b64}`} alt={m.maps.rarePassesAlt} className="map-img" />}
          </div>
        </section>
      )}
    </div>
  );
}

export function MapsPageContent() {
  return (
    <Suspense fallback={<LoadingState />}>
      <MapsContent />
    </Suspense>
  );
}
