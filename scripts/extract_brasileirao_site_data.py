#!/usr/bin/env python3
"""Extract static API payloads for the Brasileirão pass-scout site (top 30 midfielders and fullbacks)."""

from __future__ import annotations

import json
import os
import shutil
import sys
from pathlib import Path
from typing import Any

_BACKEND = Path("/agent/repos/xpv-xp_site/backend")
_REPO_ROOT = Path(__file__).resolve().parents[1]
_SCRIPTS_DIR = Path(__file__).resolve().parent
_CSV_SOURCE = _REPO_ROOT / "br2026_passes.csv"
_OUTPUT_DIR = _REPO_ROOT / "data"
_TOP_N = 30
_POSITION_FAMILIES: tuple[tuple[str, str, str, str], ...] = (
    ("midfielders", "Meio-campistas", "meio-campistas", "#34d399"),
    ("fullbacks", "Laterais", "laterais", "#a78bfa"),
)

if str(_BACKEND) not in sys.path:
    sys.path.insert(0, str(_BACKEND))
if str(_SCRIPTS_DIR) not in sys.path:
    sys.path.insert(0, str(_SCRIPTS_DIR))

os.environ.setdefault("PASS_SCOUT_MODE", "local")
os.environ.setdefault("HEAVY_MAPS_ENABLED", "1")

from position_families import (  # noqa: E402
    normalize_position_family,
    position_family_label,
    player_belongs_to_family,
)
from services.compare_service import build_compare_payload  # noqa: E402
from services.filters import filter_options_meta, player_options  # noqa: E402
from services.maps_service import (  # noqa: E402
    REPORT_PASS_MAP_KEYS,
    build_pass_map_images,
    build_report_pass_map_images,
    _grid_map_b64,
)
from services.profile_service import build_profile_payload  # noqa: E402
from services.serialization import sanitize_for_json  # noqa: E402
import midfield_origin as mo  # noqa: E402
import passes_engine as pe  # noqa: E402
import progression_engine as pge  # noqa: E402
import xp_engine as xe  # noqa: E402
import xp_stats_engine as xstats  # noqa: E402
from xp_study_maps import draw_midfielder_common_passes_map, draw_midfielder_rare_passes_map  # noqa: E402

PLAYER_LIST_FIELDS = (
    "player_id", "player_name", "position", "position_group", "position_family",
    "league", "league_source", "age", "height", "nationality", "dominant_foot",
    "market_value", "market_value_eur", "contract_until", "photo_url",
    "pass_rating", "pass_rating_rank", "pass_rating_total",
    "progression_rating", "progression_rating_rank", "progression_rating_total",
    "total_passes", "total_xt", "xt_per_pass", "midfield_origin_profile",
    "eligible_for_rating", "xp_pass_rating", "team", "team_key", "minutes",
    "pass_volume_letter", "pass_efficiency_letter", "pass_buildup_letter",
    "pass_chance_creation_letter", "defense_letter", "defense_display",
)

# Manual corrections when coordinate-based position inference misclassifies a player.
POSITION_OVERRIDES: dict[str, str] = {
    "905453": "CM",      # Marcos Antônio → meio-campista
    "981452": "RB",      # Gastón Benavídez → lateral
    "881110": "LB",      # Joaquín Piquerez → lateral
    "840398": "CM",      # Tchê Tchê → meio-campista
    "1656036": "CM",     # Gabriel Bontempo → meio-campista
    "1106487": "CB",     # Victor Gabriel → zagueiro
}


def _load_br_frame():
    frame = pe._load_br_pass_frame()
    if frame.empty:
        return frame
    frame = frame.copy()
    frame["player_id"] = frame["player_id"].astype(str)
    if "position" in frame.columns:
        frame["position"] = frame["position"].astype(str).str.strip().str.upper()
    for pid, pos in POSITION_OVERRIDES.items():
        frame.loc[frame["player_id"] == pid, "position"] = pos.upper()
    frame["league_source"] = "brasileirao"
    return frame


def _ensure_br_csv() -> None:
    dst = _BACKEND / "season_all_brfull.csv"
    if not _CSV_SOURCE.exists():
        raise SystemExit(f"CSV not found: {_CSV_SOURCE}")
    if not dst.exists() or dst.stat().st_mtime < _CSV_SOURCE.stat().st_mtime:
        shutil.copy(_CSV_SOURCE, dst)
        print(f"Copied {_CSV_SOURCE.name} → {dst}")


def _pick_fields(player: dict[str, Any], fields: tuple[str, ...]) -> dict[str, Any]:
    return {k: player.get(k) for k in fields if k in player}


def _build_brasileirao_bundle(position_family: str) -> dict[str, Any]:
    """Build full analysis bundle from Brasileirão CSV for one position family."""
    family = normalize_position_family(position_family)
    frame = _load_br_frame()
    if frame.empty:
        raise RuntimeError("Brasileirão pass frame is empty")

    filtered = pe._filter_pass_frame_by_position_family(frame, family)
    if filtered.empty:
        raise RuntimeError(f"No players for position family {family!r}")

    passes = pe._enrich_passes(filtered)
    passes_by_player = {
        str(pid): grp.copy()
        for pid, grp in passes.groupby("player_id", sort=False)
    }

    analysis_players = pe._build_players_from_enriched_frame(
        filtered,
        passes,
        position_family=family,
        min_passes=50,
    )
    for player in analysis_players:
        player["league"] = "Brasileirão"
        player["league_source"] = "brasileirao"
        player["position_family"] = family

    empty_carries: dict[str, Any] = {}
    if family == "midfielders":
        analysis_players = mo.apply_midfield_position_groups(
            analysis_players,
            passes_by_player,
            empty_carries,
        )

    _, players_by_id, _pool_by_position = pe.compute_pass_ratings(analysis_players)
    carries_by_id: dict[str, dict] = {}
    _, progression_by_id, _progression_pool = pge.compute_progression_ratings(
        analysis_players,
        [],
        pass_by_id=players_by_id,
        carry_by_id=carries_by_id,
    )

    season = xe._build_season_passes_from_frame(
        filtered,
        blend_league_reference=False,
    )
    if season.empty:
        raise RuntimeError(f"Could not build xP season passes for {family!r}")

    minutes_info = pe._minutes_from_passes_frame(filtered)
    registry = pe.build_player_registry(filtered)
    ti_v2_progress_cutoffs = xstats.test_impact_v2_attempt_progress_cutoffs(season)
    registry_by_id = {str(p["code"]): p for p in registry}
    xp_players: list[dict] = []

    for pid, grp in season.groupby("player_id", sort=False):
        pid = str(pid)
        player = registry_by_id.get(pid)
        if player is None or not player_belongs_to_family(
            {"position": player.get("position"), "position_group": pe.rating_position_group(player.get("position"))},
            family,
        ):
            continue
        completed = int((grp["is_won"] & grp["has_end"]).sum())
        if completed < 50:
            continue
        mins = minutes_info.get(pid, {})
        metrics = xstats.compute_extended_xp_stats(
            grp,
            test_impact_v2_progress_cutoffs=ti_v2_progress_cutoffs,
        )
        if not metrics:
            continue
        minutes = mins.get("minutes")
        player_raw = filtered[filtered["player_id"].astype(str) == pid]
        xstats.attach_regular_pass_stats(metrics, player_raw, minutes)
        xstats.apply_per90_metrics(metrics, minutes)
        xp_players.append({
            "player_id": pid,
            "player_name": player["name"],
            "position": player.get("position", "—"),
            "position_group": pe.rating_position_group(player.get("position")),
            "position_family": family,
            "team": mins.get("team", "—"),
            "minutes": mins.get("minutes"),
            "minutes_pct": mins.get("minutes_pct"),
            "league": "Brasileirão",
            "league_source": "brasileirao",
            "passes_completed": completed,
            **metrics,
        })

    xp_players.sort(key=lambda p: float(p.get("xp_m4_total", 0.0)), reverse=True)
    for i, p in enumerate(xp_players, start=1):
        p["xp_m4_rank"] = i
    import xpass_engine as xpass_mod
    xpass_mod.attach_xpass_metrics_to_players(xp_players, season=season)
    xstats.attach_distance_indices(xp_players)
    xstats.attach_pass_length_profile(xp_players)
    xstats.attach_regular_pass_scores(xp_players)
    xstats.attach_composite_indices(xp_players)
    xstats.attach_xp_pass_ratings(xp_players)
    xstats.attach_all_stats_ranks(xp_players)
    xe.attach_xp_metric_ranks(xp_players)

    xp_by_id = {str(p["player_id"]): p for p in xp_players}
    for player in analysis_players:
        pid = str(player["player_id"])
        player["position_family"] = family
        if pid in xp_by_id:
            player["xp_pass_rating"] = xp_by_id[pid].get("xp_pass_rating")
        if pid in players_by_id:
            player.update({k: v for k, v in players_by_id[pid].items() if k not in player or player[k] is None})

    return {
        "position_family": family,
        "analysis_players": analysis_players,
        "passes_by_player": passes_by_player,
        "progression_by_id": progression_by_id,
        "players_by_id": players_by_id,
        "xp_by_id": xp_by_id,
        "season": season,
    }


def _override_family_for_player(player_id: str) -> str | None:
    from position_families import family_for_position_code

    pos = POSITION_OVERRIDES.get(str(player_id))
    if not pos:
        return None
    return family_for_position_code(pos)


def _top_player_ids(bundle: dict[str, Any], family: str, n: int = _TOP_N) -> list[str]:
    players = bundle["analysis_players"]
    rated = []
    for player in players:
        pid = str(player["player_id"])
        xp = bundle["xp_by_id"].get(pid, {})
        rating = xp.get("xp_pass_rating") or player.get("pass_rating") or 0
        rated.append((pid, float(rating or 0)))
    rated.sort(key=lambda x: x[1], reverse=True)
    ids = [pid for pid, _ in rated[:n]]

    must_include = [
        pid for pid in POSITION_OVERRIDES
        if _override_family_for_player(pid) == family
        and pid in {str(p["player_id"]) for p in players}
    ]
    missing = [pid for pid in must_include if pid not in ids]
    if missing:
        keep = max(0, n - len(missing))
        ids = [pid for pid, _ in rated[:keep]] + missing

    return ids


def _write_json(path: Path, payload: Any) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(sanitize_for_json(payload), ensure_ascii=False), encoding="utf-8")
    print(f"  wrote {path.relative_to(_OUTPUT_DIR)}")


def _write_player_reports_ts(family_player_ids: dict[str, list[str]]) -> None:
    categories = []
    for family, title, plural, accent in _POSITION_FAMILIES:
        ids = family_player_ids.get(family, [])
        players_lines = "\n".join(f'          p("{pid}", "{family}"),' for pid in ids)
        categories.append(
            f"""  {{
    id: "{family}",
    title: {json.dumps(title, ensure_ascii=False)},
    subtitle: "Top 30 {plural}",
    description: {json.dumps(f"Os 30 {plural} com melhor perfil de passe no Brasileirão 2026.", ensure_ascii=False)},
    accent: "{accent}",
    groups: [
      {{
        players: [
{players_lines}
        ],
      }},
    ],
  }}"""
        )

    family_lines = "\n".join(
        f'  {{ key: "{family}", label: {json.dumps(title, ensure_ascii=False)}, accent: "{accent}" }},'
        for family, title, _plural, accent in _POSITION_FAMILIES
    )

    content = f'''export type ReportPlayerRef = {{
  playerId: string;
  positionFamily?: string;
  note?: string;
}};

export type ReportPlayerGroup = {{
  label?: string;
  players: ReportPlayerRef[];
}};

export type PlayerReportCategory = {{
  id: string;
  title: string;
  subtitle: string;
  description: string;
  accent: string;
  groups: ReportPlayerGroup[];
}};

export const POSITION_FAMILIES = [
{family_lines}
] as const;

export type PositionFamilyKey = (typeof POSITION_FAMILIES)[number]["key"];

export const PROFILE_ALL_GROUP = {{
  id: "all",
  title: "Todos os jogadores",
  subtitle: "Pool completo",
  description: "Top 30 meio-campistas e 30 laterais no Brasileirão 2026.",
  accent: "#cbd5e1",
}} as const;

function p(playerId: string, positionFamily: PositionFamilyKey, note?: string): ReportPlayerRef {{
  return {{ playerId, positionFamily, note }};
}}

/** Top 30 per position family — auto-generated by scripts/extract_brasileirao_site_data.py */
export const PLAYER_REPORT_CATEGORIES: PlayerReportCategory[] = [
{",\n".join(categories)},
];

export function allReportPlayerRefs(): ReportPlayerRef[] {{
  const seen = new Set<string>();
  const out: ReportPlayerRef[] = [];
  for (const category of PLAYER_REPORT_CATEGORIES) {{
    for (const group of category.groups) {{
      for (const player of group.players) {{
        if (seen.has(player.playerId)) continue;
        seen.add(player.playerId);
        out.push(player);
      }}
    }}
  }}
  return out;
}}

export function totalReportCount(): number {{
  return allReportPlayerRefs().length;
}}

export type EnrichedReportPlayer = ReportPlayerRef & {{
  category: PlayerReportCategory;
  groupLabel?: string;
  categoryIndex: number;
}};

export function enrichedReportPlayers(): EnrichedReportPlayer[] {{
  const out: EnrichedReportPlayer[] = [];
  for (const category of PLAYER_REPORT_CATEGORIES) {{
    let categoryIndex = 0;
    for (const group of category.groups) {{
      for (const player of group.players) {{
        categoryIndex += 1;
        out.push({{
          ...player,
          category,
          groupLabel: group.label,
          categoryIndex,
        }});
      }}
    }}
  }}
  return out;
}}

export function playerIdsForProfileGroup(groupId: string): Set<string> {{
  if (groupId === PROFILE_ALL_GROUP.id) {{
    return new Set(allReportPlayerRefs().map((p) => p.playerId));
  }}
  const category = PLAYER_REPORT_CATEGORIES.find((cat) => cat.id === groupId);
  if (!category) return new Set();
  const ids = new Set<string>();
  for (const group of category.groups) {{
    for (const player of group.players) {{
      ids.add(player.playerId);
    }}
  }}
  return ids;
}}

export function profileGroupCounts(
  players: {{ player_id?: string | number | null }}[],
): Record<string, number> {{
  const available = new Set(players.map((p) => String(p.player_id)));
  const counts: Record<string, number> = {{
    [PROFILE_ALL_GROUP.id]: players.length,
  }};
  for (const category of PLAYER_REPORT_CATEGORIES) {{
    const ids = playerIdsForProfileGroup(category.id);
    counts[category.id] = [...ids].filter((id) => available.has(id)).length;
  }}
  return counts;
}}

export function positionFamilyForPlayer(playerId: string): PositionFamilyKey | undefined {{
  for (const category of PLAYER_REPORT_CATEGORIES) {{
    const ids = playerIdsForProfileGroup(category.id);
    if (ids.has(playerId)) return category.id as PositionFamilyKey;
  }}
  return undefined;
}}
'''
    out_path = _REPO_ROOT / "lib" / "playerReports.ts"
    out_path.write_text(content, encoding="utf-8")
    print(f"  wrote {out_path.relative_to(_REPO_ROOT)}")


def main() -> None:
    print("Preparing Brasileirão CSV…")
    _ensure_br_csv()
    _OUTPUT_DIR.mkdir(parents=True, exist_ok=True)

    all_player_ids: list[str] = []
    all_rows: list[dict[str, Any]] = []
    all_profiles: dict[str, Any] = {}
    all_pool_metrics: list[dict[str, Any]] = []
    family_player_ids: dict[str, list[str]] = {}
    bundles: dict[str, dict[str, Any]] = {}

    for family, title, _plural, _accent in _POSITION_FAMILIES:
        label = position_family_label(family)
        print(f"\n=== {label} ({family}) ===")
        bundle = _build_brasileirao_bundle(family)
        bundles[family] = bundle
        top_ids = _top_player_ids(bundle, family, _TOP_N)
        family_player_ids[family] = top_ids
        all_player_ids.extend(top_ids)
        print(f"  Top {_TOP_N}: {', '.join(top_ids)}")

        analysis_by_id = {str(p["player_id"]): p for p in bundle["analysis_players"]}
        for pid in top_ids:
            player = analysis_by_id.get(pid) or bundle["players_by_id"].get(pid, {})
            progression = bundle["progression_by_id"].get(pid, {})
            xp = bundle["xp_by_id"].get(pid, {})
            row = {**player, **({"xp_pass_rating": xp.get("xp_pass_rating")} if xp else {})}
            if xp.get("minutes") is not None:
                row["minutes"] = xp.get("minutes")
            if progression:
                row["progression_rating"] = progression.get("progression_rating")
                row["progression_rating_rank"] = progression.get("progression_rating_rank")
                row["progression_rating_total"] = progression.get("progression_rating_total")
            all_rows.append(_pick_fields(row, PLAYER_LIST_FIELDS))

    all_rows.sort(key=lambda r: (r.get("position_family", ""), r.get("pass_rating_rank") or 9999))
    player_id_set = set(all_player_ids)

    position_families_meta = [
        {"key": family, "label": title} for family, title, _plural, _accent in _POSITION_FAMILIES
    ]
    position_options = [
        {"key": family, "label": title, "player_count": len(family_player_ids.get(family, []))}
        for family, title, _plural, _accent in _POSITION_FAMILIES
    ]

    meta = {
        "position_family": "all",
        "position_family_label": "Brasileirão 2026",
        "player_count": len(all_rows),
        "leagues": ["brasileirao"],
        "league_options": [{"key": "brasileirao", "label": "Brasileirão"}],
        "position_groups": sorted(
            {str(r.get("position_group")) for r in all_rows if r.get("position_group")}
        ),
        "position_families": position_families_meta,
        "position_options": position_options,
        "nationalities": sorted({str(r.get("nationality")) for r in all_rows if r.get("nationality")}),
        "filter_options": {
            **filter_options_meta("midfielders"),
            "leagues": [{"key": "brasileirao", "label": "Brasileirão"}],
            "position_families": position_families_meta,
            "defaults": {
                "league": "brasileirao",
                "position_family": "midfielders",
                "position_block": "all",
                "age_band": "all",
            },
        },
        "family_player_ids": family_player_ids,
        "description": "Top 30 meio-campistas e 30 laterais — Brasileirão 2026",
    }
    _write_json(_OUTPUT_DIR / "meta.json", meta)
    _write_json(_OUTPUT_DIR / "players.json", {
        "position_family": "all",
        "total": len(all_rows),
        "offset": 0,
        "limit": len(all_rows),
        "players": all_rows,
    })

    merged_progression: dict[str, dict] = {}
    merged_xp: dict[str, dict] = {}
    all_options: list[dict[str, str]] = []
    for family, _title, _plural, _accent in _POSITION_FAMILIES:
        bundle = bundles[family]
        family_analysis = []
        for pid in family_player_ids[family]:
            if pid in bundle["progression_by_id"]:
                merged_progression[pid] = bundle["progression_by_id"][pid]
            if pid in bundle["xp_by_id"]:
                merged_xp[pid] = bundle["xp_by_id"][pid]
            analysis_by_id = {str(p["player_id"]): p for p in bundle["analysis_players"]}
            if pid in analysis_by_id:
                family_analysis.append(analysis_by_id[pid])
        family_opts = player_options(
            family_analysis,
            {pid: merged_progression[pid] for pid in family_player_ids[family] if pid in merged_progression},
            xp_by_id={pid: merged_xp[pid] for pid in family_player_ids[family] if pid in merged_xp},
            position_family=family,
        )
        all_options.extend(family_opts)

    _write_json(_OUTPUT_DIR / "players-options.json", {
        "position_family": "all",
        "options": all_options,
    })

    _write_json(_OUTPUT_DIR / "maps-options.json", {
        "pass_filters": [{"key": k, "label": label} for k, label in xstats.maps_tab_pass_options()],
    })

    import services.profile_service as profile_service
    _orig_prepare = profile_service._prepare_passes_for_round_series
    profile_service._prepare_passes_for_round_series = lambda _df: None

    pass_filters = [k for k, _ in xstats.maps_tab_pass_options()]
    try:
        for family, _title, _plural, _accent in _POSITION_FAMILIES:
            bundle = bundles[family]
            players_by_id = bundle["players_by_id"]
            progression_by_id = bundle["progression_by_id"]
            xp_by_id = bundle["xp_by_id"]
            passes_by_player = bundle["passes_by_player"]

            for pid in family_player_ids[family]:
                payload = build_profile_payload(
                    pid,
                    players_by_id=players_by_id,
                    progression_by_id=progression_by_id,
                    xp_by_id=xp_by_id,
                    passes_by_player=passes_by_player,
                )
                if payload is None:
                    print(f"  WARNING: no profile for {pid}")
                    continue
                all_profiles[pid] = payload
                _write_json(_OUTPUT_DIR / "profiles" / f"{pid}.json", payload)

                player = xp_by_id.get(pid) or progression_by_id.get(pid) or players_by_id.get(pid)
                name = str(player.get("player_name", "—")) if player else "—"
                for pf in pass_filters:
                    try:
                        pmap = build_pass_map_images(
                            pid, name, pass_filter=pf, round_key="all",
                            position_family=family,
                        )
                        _write_json(_OUTPUT_DIR / "pass-maps" / pid / f"{pf}.json", pmap)
                    except Exception as exc:
                        print(f"  WARNING: pass map {pid}/{pf}: {exc}")

                for rk in REPORT_PASS_MAP_KEYS:
                    try:
                        rmap = build_report_pass_map_images(
                            pid, name, report_key=rk, round_key="all",
                            position_family=family,
                        )
                        _write_json(_OUTPUT_DIR / "pass-maps" / pid / f"{rk}.json", rmap)
                    except Exception as exc:
                        print(f"  WARNING: report map {pid}/{rk}: {exc}")

                profile = progression_by_id.get(pid, players_by_id.get(pid, {}))
                xp = xp_by_id.get(pid, {})
                all_pool_metrics.append({**profile, **xp, "player_id": pid, "position_family": family})
    finally:
        profile_service._prepare_passes_for_round_series = _orig_prepare

    _write_json(_OUTPUT_DIR / "pool-metrics.json", all_pool_metrics)

    completed_frames = []
    for family, _title, _plural, _accent in _POSITION_FAMILIES:
        bundle = bundles[family]
        season = bundle["season"]
        ids = set(family_player_ids[family])
        sub = season[season["player_id"].astype(str).isin(ids)]
        completed = sub[sub["is_won"] & sub["has_end"]].copy()
        completed_frames.append(completed)

    import pandas as pd
    if completed_frames:
        all_completed = pd.concat(completed_frames, ignore_index=True)
        import xp_study_engine as xpe
        agg = xpe.aggregate_pass_destination_grids(all_completed)
        _write_json(_OUTPUT_DIR / "aggregated.json", {
            "position_family": "all",
            "player_count": len(player_id_set),
            "total_passes": int(len(all_completed)),
            "min_passes_cutoff": 0,
            "quadrant_stats": agg.get("quadrant_stats", []),
            "common_map_b64": _grid_map_b64(agg.get("count_grid"), draw_midfielder_common_passes_map, "Passes comuns"),
            "rare_map_b64": _grid_map_b64(agg.get("mean_xp_grid"), draw_midfielder_rare_passes_map, "Passes raros (xP)"),
        })

    _write_json(_OUTPUT_DIR / "player-ids.json", all_player_ids)
    _write_json(_OUTPUT_DIR / "index.json", {
        "player_count": len(all_player_ids),
        "player_ids": all_player_ids,
        "profiles": list(all_profiles.keys()),
        "family_player_ids": family_player_ids,
    })

    organizer_script = _REPO_ROOT / "scripts" / "build_organizer_data.py"
    if organizer_script.exists():
        import subprocess
        subprocess.run([sys.executable, str(organizer_script)], check=True)

    _write_player_reports_ts(family_player_ids)

    print(f"\nDone — {len(all_profiles)} profiles in {_OUTPUT_DIR}")


if __name__ == "__main__":
    main()
