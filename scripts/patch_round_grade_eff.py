#!/usr/bin/env python3
"""Patch per-match short/long pass COE into static profile JSONs."""

from __future__ import annotations

import json
import os
import sys
from pathlib import Path
from typing import Any

_BACKEND = Path(__file__).resolve().parents[2] / "xpv-xp_site" / "backend"
if str(_BACKEND) not in sys.path:
    sys.path.insert(0, str(_BACKEND))

os.environ.setdefault("PASS_SCOUT_MODE", "local")

import xpass_engine as xpe  # noqa: E402
import xp_engine as xe  # noqa: E402
from xp_stats_engine import round_production_series  # noqa: E402

DATA_DIR = Path(__file__).resolve().parents[1] / "data"
PROFILES_DIR = DATA_DIR / "profiles"
PLAYER_IDS_FILE = DATA_DIR / "player-ids.json"
POSITION_FAMILY = "midfielders"

ROUND_FIELDS = (
    "short_pass_eff_pct",
    "long_pass_eff_pct",
    "breakline_passes",
    "key_passes",
    "passes",
    "impact",
    "xp",
)


def _series_lookup(series: tuple[dict[str, Any], ...]) -> tuple[dict[str, dict], dict[int, dict]]:
    by_event: dict[str, dict] = {}
    by_round: dict[int, dict] = {}
    for point in series:
        event_id = point.get("event_id")
        if event_id is not None:
            by_event[str(event_id)] = point
        round_no = point.get("round")
        if round_no is not None:
            by_round[int(round_no)] = point
    return by_event, by_round


def _merge_round_point(existing: dict[str, Any], source: dict[str, Any] | None) -> dict[str, Any]:
    if not source:
        return existing
    merged = dict(existing)
    for key in ROUND_FIELDS:
        if key in source:
            merged[key] = source[key]
    return merged


def patch_profile(profile: dict[str, Any], series: tuple[dict[str, Any], ...]) -> dict[str, Any]:
    by_event, by_round = _series_lookup(series)

    grades = profile.get("xp_round_grades") or []
    profile["xp_round_grades"] = [
        _merge_round_point(
            point,
            by_event.get(str(point.get("event_id") or ""))
            or by_round.get(int(point["round"])) if point.get("round") is not None else None,
        )
        for point in grades
    ]

    xp = profile.get("xp")
    if isinstance(xp, dict) and isinstance(xp.get("xp_round_series"), list):
        xp["xp_round_series"] = [
            _merge_round_point(
                point,
                by_event.get(str(point.get("event_id") or ""))
                or by_round.get(int(point["round"])) if point.get("round") is not None else None,
            )
            for point in xp["xp_round_series"]
        ]

    return profile


def main() -> None:
    player_ids = json.loads(PLAYER_IDS_FILE.read_text(encoding="utf-8"))
    print(f"Loading scored passes for {POSITION_FAMILY}…")
    passes_by_player = xe.load_european_league_xp_passes_grouped(POSITION_FAMILY)

    patched = 0
    missing = 0
    with_eff = 0

    for pid in player_ids:
        profile_path = PROFILES_DIR / f"{pid}.json"
        if not profile_path.is_file():
            print(f"  WARNING: missing profile {pid}")
            missing += 1
            continue

        grp = passes_by_player.get(str(pid))
        if grp is None or grp.empty:
            print(f"  WARNING: no passes for {pid}")
            missing += 1
            continue

        prepared = xpe.attach_xpass_to_passes(grp.copy())
        series = round_production_series(prepared)
        if not series:
            print(f"  WARNING: empty round series for {pid}")
            missing += 1
            continue

        profile = json.loads(profile_path.read_text(encoding="utf-8"))
        profile = patch_profile(profile, series)
        profile_path.write_text(json.dumps(profile, ensure_ascii=False), encoding="utf-8")

        games = profile.get("xp_round_grades") or []
        filled = sum(
            1
            for g in games
            if g.get("short_pass_eff_pct") is not None or g.get("long_pass_eff_pct") is not None
        )
        with_eff += filled
        patched += 1
        print(f"  patched {pid}: {filled}/{len(games)} games with COE")

    print(f"Done: {patched} profiles patched, {missing} skipped, {with_eff} game rows with COE")


if __name__ == "__main__":
    main()
