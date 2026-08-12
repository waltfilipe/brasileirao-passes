#!/usr/bin/env python3
"""Build pool-derived metrics for the static test site (full midfielder pool)."""

from __future__ import annotations

import json
import os
import sys
from pathlib import Path
from typing import Any

import numpy as np
import pandas as pd

_BACKEND = Path(__file__).resolve().parents[2] / "xpv-xp_site" / "backend"
if str(_BACKEND) not in sys.path:
    sys.path.insert(0, str(_BACKEND))

os.environ.setdefault("PASS_SCOUT_MODE", "local")

import passes_engine as pe  # noqa: E402
import xp_engine as xe  # noqa: E402
import xp_stats_engine as xstats  # noqa: E402

OUTPUT = Path(__file__).resolve().parents[1] / "data" / "pool-derived-metrics.json"
POSITION_FAMILY = "midfielders"


def _metric_rank_pool_key(player: dict[str, Any]) -> str:
    origin = str(player.get("midfield_origin_profile") or "").strip().lower()
    if origin in {"campo_ofensivo", "campo_defensivo"}:
        return origin
    return str(player.get("position_group") or "CM")


def defensive_actions_p90(xp: dict[str, Any]) -> float | None:
    parts = [
        xp.get("def_won_tackle_p90"),
        xp.get("def_interception_p90"),
        xp.get("def_clearance_p90"),
    ]
    if any(v is None for v in parts):
        return None
    return round(float(parts[0]) + float(parts[1]) + float(parts[2]), 3)


def chance_creation_xpv(grp: pd.DataFrame) -> float | None:
    if grp is None or grp.empty:
        return None
    completed = grp.loc[grp["is_won"] & grp["has_end"]].copy()
    if completed.empty or "xp_m4" not in completed.columns:
        return None

    key_mask = (
        completed["is_key_pass"].astype(bool)
        if "is_key_pass" in completed.columns
        else pd.Series(False, index=completed.index)
    )
    box_mask = pe._ended_in_penalty_box(completed)

    ti_v2 = xe.filter_test_impact_v2_passes(grp)
    if ti_v2 is not None and not ti_v2.empty:
        ti_completed = ti_v2.loc[ti_v2["is_won"] & ti_v2["has_end"]].copy()
        ft_mask = ti_completed["x_start"].astype(float) >= xstats.FINAL_X_MIN
        impact_ft = ti_completed.loc[ft_mask]
    else:
        impact_ft = completed.iloc[0:0]

    xpv_col = completed["xp_m4"].astype(float)
    xpv_sum = (
        float(xpv_col.loc[key_mask].sum())
        + float(xpv_col.loc[box_mask].sum())
        + float(impact_ft["xp_m4"].astype(float).sum())
    )
    count = int(key_mask.sum()) + int(box_mask.sum()) + len(impact_ft)
    if count <= 0:
        return None
    return round(xpv_sum / count, 4)


def rank_desc(values: list[tuple[str, float]]) -> dict[str, tuple[int, int]]:
    pool_size = len(values)
    ordered = sorted(values, key=lambda item: item[1], reverse=True)
    out: dict[str, tuple[int, int]] = {}
    for rank, (pid, _) in enumerate(ordered, start=1):
        out[pid] = (rank, pool_size)
    return out


def main() -> None:
    print("Loading full midfielder pool…")
    pool_path = _BACKEND / "data" / "api_pool_midfielders.json"
    with pool_path.open(encoding="utf-8") as fh:
        pool_payload = json.load(fh)
    analysis_players = pool_payload.get("players", pool_payload)
    xp_passes_by_player = xe.load_european_league_xp_passes_grouped(POSITION_FAMILY)

    records: dict[str, dict[str, Any]] = {}

    for player in analysis_players:
        pid = str(player["player_id"])
        da = defensive_actions_p90(player)
        cc_xpv = chance_creation_xpv(xp_passes_by_player.get(pid))
        records[pid] = {
            "defensive_actions_p90": da,
            "chance_creation_xpv": cc_xpv,
            "league_source": player.get("league_source"),
            "position_group": player.get("position_group"),
            "midfield_origin_profile": player.get("midfield_origin_profile"),
        }

    # Defensive actions: rank within league (higher is better).
    league_pools: dict[str, list[tuple[str, float]]] = {}
    for pid, row in records.items():
        val = row.get("defensive_actions_p90")
        if val is None:
            continue
        league = str(row.get("league_source") or "unknown")
        league_pools.setdefault(league, []).append((pid, float(val)))

    for league, values in league_pools.items():
        ranks = rank_desc(values)
        for pid, (rank, pool) in ranks.items():
            records[pid]["defensive_actions_p90_rank_in_league"] = rank
            records[pid]["defensive_actions_p90_rank_pool_in_league"] = pool

    # Chance creation xPV: rank within position / origin group.
    group_pools: dict[str, list[tuple[str, float]]] = {}
    for pid, row in records.items():
        val = row.get("chance_creation_xpv")
        if val is None:
            continue
        group = _metric_rank_pool_key(row)
        group_pools.setdefault(group, []).append((pid, float(val)))

    for group, values in group_pools.items():
        ranks = rank_desc(values)
        for pid, (rank, pool) in ranks.items():
            records[pid]["chance_creation_xpv_rank_in_group"] = rank
            records[pid]["chance_creation_xpv_rank_pool_in_group"] = pool

    payload = {
        "position_family": POSITION_FAMILY,
        "player_count": len(records),
        "players": records,
    }
    OUTPUT.parent.mkdir(parents=True, exist_ok=True)
    OUTPUT.write_text(json.dumps(payload, ensure_ascii=False), encoding="utf-8")
    print(f"Wrote {OUTPUT} ({len(records)} players)")


if __name__ == "__main__":
    main()
