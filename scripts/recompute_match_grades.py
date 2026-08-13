#!/usr/bin/env python3
"""Recompute per-match composite grades for the Brasileirão static site."""

from __future__ import annotations

import json
import os
import sys
from pathlib import Path
from typing import Any

_REPO_ROOT = Path(__file__).resolve().parents[1]
_SCRIPTS_DIR = Path(__file__).resolve().parent
_BACKEND = Path(__file__).resolve().parents[2] / "xpv-xp_site" / "backend"

if str(_BACKEND) not in sys.path:
    sys.path.insert(0, str(_BACKEND))
if str(_SCRIPTS_DIR) not in sys.path:
    sys.path.insert(0, str(_SCRIPTS_DIR))

os.environ.setdefault("PASS_SCOUT_MODE", "local")

import xpass_engine as xpe  # noqa: E402
from services.profile_service import (  # noqa: E402
    build_round_grade_series,
    build_xp_indices,
    build_xp_profile_bars,
)
from xp_stats_engine import XP_ROUND_SERIES_KEY, round_production_series  # noqa: E402
import xp_stats_engine as xstats  # noqa: E402

from extract_brasileirao_site_data import (  # noqa: E402
    _POSITION_FAMILIES,
    _build_brasileirao_bundle,
    _ensure_br_csv,
)

DATA_DIR = _REPO_ROOT / "data"
PROFILES_DIR = DATA_DIR / "profiles"
PLAYER_IDS_FILE = DATA_DIR / "player-ids.json"

XP_COMPOSITE_PREFIXES = (
    "xp_game_grade",
    "xp_game_consistency",
    "xp_idx_",
    "xp_activity_",
    "xp_efficiency_",
    "xp_edge_",
    "xp_quality_",
    "xp_consistency_",
    "xp_profile_archetype",
)

POOL_METRICS_COMPOSITE_KEYS = (
    "xp_game_grades",
    "xp_game_grade_mean",
    "xp_game_grade_mad",
    "xp_game_consistency_score",
    "xp_idx_consistency",
    "xp_idx_consistency_tier",
    "xp_idx_impact",
    "xp_idx_impact_tier",
    "xp_consistency_display",
    "xp_activity_display",
    "xp_efficiency_display",
    "xp_edge_display",
    "xp_quality_display",
    "xp_profile_archetype",
)


def _refresh_round_series(
    rows: list[dict[str, Any]],
    passes_by_player: dict[str, Any],
) -> int:
    refreshed = 0
    for row in rows:
        pid = str(row.get("player_id") or "")
        grp = passes_by_player.get(pid)
        if grp is None or getattr(grp, "empty", True):
            continue
        try:
            prepared = xpe.attach_xpass_to_passes(grp.copy())
        except KeyError:
            continue
        series = round_production_series(prepared)
        if not series:
            continue
        row[XP_ROUND_SERIES_KEY] = series
        refreshed += 1
    return refreshed


def _merge_xp_composite_fields(xp: dict[str, Any], row: dict[str, Any]) -> None:
    for key, val in row.items():
        if key == XP_ROUND_SERIES_KEY:
            xp[key] = list(val) if val else []
        elif any(key.startswith(prefix) for prefix in XP_COMPOSITE_PREFIXES):
            xp[key] = val


def _force_featured_bar_eligibility(rows: list[dict[str, Any]], featured_ids: set[str]) -> None:
    for row in rows:
        if str(row.get("player_id")) in featured_ids:
            row["xp_profile_bars_eligible"] = True
            row.pop("xp_profile_ineligible_reason", None)


def _recompute_profile_bars_for_pool(rows: list[dict[str, Any]]) -> None:
    """Re-run profile bar and secondary index attachment after eligibility override."""
    eligible_rows = [row for row in rows if row.get("xp_profile_bars_eligible")]
    if not eligible_rows:
        return

    import pandas as pd

    xstats._ensure_xpass_total_coe_pct(eligible_rows)
    eligible_df = pd.DataFrame(eligible_rows)
    lethality_composite = xstats._mean_z_columns(eligible_df, xstats.LETHALITY_METRICS)
    xstats._attach_index_display_scores(
        eligible_rows,
        "xp_edge_index",
        "xp_edge_display",
        lethality_composite,
    )
    for raw_key, display_key, metric_cols in xstats.XP_PROFILE_BAR_SPECS:
        xstats._attach_median_rank_display_scores(
            eligible_rows,
            metric_cols,
            raw_key,
            display_key,
        )
    for metric in xstats.XP_PROFILE_SUBMETRICS:
        xstats._attach_median_rank_display_scores(
            eligible_rows,
            (metric,),
            f"{metric}_sub_index",
            f"{metric}_sub_display",
        )
    xstats._blend_precision_with_stratum(eligible_rows)
    xstats._attach_secondary_indices(eligible_rows)
    xstats._attach_xp_profile_archetypes(eligible_rows)

    for row in rows:
        if not row.get("xp_profile_bars_eligible"):
            xstats._clear_xp_profile_bar_scores(row)


def main() -> None:
    _ensure_br_csv()
    player_ids = [str(pid) for pid in json.loads(PLAYER_IDS_FILE.read_text(encoding="utf-8"))]
    featured = set(player_ids)
    xp_lookup: dict[str, dict[str, Any]] = {}

    for family, title, _plural, _accent in _POSITION_FAMILIES:
        print(f"\n=== {title} ({family}) ===")
        bundle = _build_brasileirao_bundle(family)
        pool_rows = [dict(xp) for xp in bundle["xp_by_id"].values()]
        passes_by_player = bundle["passes_by_player"]

        print(f"Refreshing per-match COE for {len(pool_rows)} pool players…")
        refreshed = _refresh_round_series(pool_rows, passes_by_player)
        print(f"  {refreshed} players with xPass round series")

        print("Recomputing composite match grades and profile indices…")
        xstats.attach_composite_indices(pool_rows)
        featured_in_family = {
            pid for pid in featured
            if pid in {str(row["player_id"]) for row in pool_rows}
        }
        if featured_in_family:
            _force_featured_bar_eligibility(pool_rows, featured_in_family)
            _recompute_profile_bars_for_pool(pool_rows)
        for row in pool_rows:
            xp_lookup[str(row["player_id"])] = row

    updated = 0
    with_eff = 0
    for pid in player_ids:
        row = xp_lookup.get(pid)
        profile_path = PROFILES_DIR / f"{pid}.json"
        if row is None or not profile_path.is_file():
            print(f"  WARNING: missing data for {pid}")
            continue

        profile = json.loads(profile_path.read_text(encoding="utf-8"))
        xp = profile.get("xp")
        if not isinstance(xp, dict):
            continue

        _merge_xp_composite_fields(xp, row)
        profile["xp"] = xp
        profile["xp_indices"] = build_xp_indices(xp)
        profile["xp_bars"] = build_xp_profile_bars(xp)
        profile["xp_round_grades"] = build_round_grade_series(xp, None)
        profile["xp_game_consistency_score"] = row.get("xp_game_consistency_score")
        profile_path.write_text(json.dumps(profile, ensure_ascii=False), encoding="utf-8")
        updated += 1

        games = profile.get("xp_round_grades") or []
        filled = sum(
            1
            for g in games
            if g.get("short_pass_eff_pct") is not None or g.get("long_pass_eff_pct") is not None
        )
        with_eff += filled
        grades = row.get("xp_game_grades") or ()
        if grades:
            print(
                f"  {row.get('player_name', pid)}: COE {filled}/{len(games)}, "
                f"grades {min(grades):.2f}–{max(grades):.2f}"
            )

    pool_metrics_path = DATA_DIR / "pool-metrics.json"
    if pool_metrics_path.is_file():
        pool_rows_json = json.loads(pool_metrics_path.read_text(encoding="utf-8"))
        for row in pool_rows_json:
            pid = str(row.get("player_id"))
            src = xp_lookup.get(pid)
            if not src:
                continue
            for key in POOL_METRICS_COMPOSITE_KEYS:
                if key in src:
                    row[key] = src[key]
        pool_metrics_path.write_text(json.dumps(pool_rows_json, ensure_ascii=False), encoding="utf-8")
        print("  updated pool-metrics.json")

    orphan_profiles = [
        path for path in PROFILES_DIR.glob("*.json")
        if path.stem not in featured
    ]
    for path in orphan_profiles:
        path.unlink()
    if orphan_profiles:
        print(f"  removed {len(orphan_profiles)} orphan profiles")

    print(f"\nDone — {updated} profiles updated, {with_eff} game rows with COE")


if __name__ == "__main__":
    main()
