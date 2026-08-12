#!/usr/bin/env python3
"""Build pool reference + organizer badge data for the Brasileirão static site."""

from __future__ import annotations

import json
import math
from collections import defaultdict
from pathlib import Path

POOL_PATH = Path(__file__).resolve().parents[1] / "data" / "pool-metrics.json"
OUTPUT_DIR = Path(__file__).resolve().parents[1] / "data"


def _pctile(values: list[float], q: float) -> float:
    if not values:
        return 0.0
    ordered = sorted(values)
    pos = (len(ordered) - 1) * q
    lo = int(pos)
    hi = min(lo + 1, len(ordered) - 1)
    frac = pos - lo
    return ordered[lo] * (1 - frac) + ordered[hi] * frac


def _rank_desc(entries: list[tuple[str, float]]) -> dict[str, dict[str, int]]:
    ordered = sorted(entries, key=lambda item: item[1], reverse=True)
    return {
        player_id: {"rank": index + 1, "rank_pool": len(entries)}
        for index, (player_id, _) in enumerate(ordered)
    }


def _z_scores(values: list[float]) -> list[float]:
    if not values:
        return []
    mean = sum(values) / len(values)
    variance = sum((value - mean) ** 2 for value in values) / len(values)
    std = math.sqrt(variance)
    if not std or not math.isfinite(std):
        return [0.0] * len(values)
    return [(value - mean) / std for value in values]


def _impact_index_ranks(players: list[dict]) -> dict[str, dict[str, int]]:
    grouped: dict[str, list[tuple[str, float, float]]] = defaultdict(list)
    for player in players:
        pid = str(player.get("player_id", ""))
        position_group = str(player.get("position_group", "central_midfielders"))
        xpv = player.get("xpv_per_pass")
        threat = player.get("threat_pass_pct")
        if not pid or xpv is None or threat is None:
            continue
        grouped[position_group].append((pid, float(xpv), float(threat)))

    ranks: dict[str, dict[str, int]] = {}
    for entries in grouped.values():
        xpv_values = [entry[1] for entry in entries]
        threat_values = [entry[2] for entry in entries]
        xpv_z = _z_scores(xpv_values)
        threat_z = _z_scores(threat_values)
        composites = [
            (entries[index][0], (xpv_z[index] + threat_z[index]) / 2.0)
            for index in range(len(entries))
        ]
        ranks.update(_rank_desc(composites))
    return ranks


def main() -> None:
    players = json.loads(POOL_PATH.read_text(encoding="utf-8"))

    ref_rows: list[dict] = []
    metric_rows: list[dict] = []

    for player in players:
        pid = str(player.get("player_id", ""))
        position_group = str(player.get("position_group", "central_midfielders"))
        threat = player.get("threat_pass_pct")
        if not pid or threat is None:
            continue
        ref_rows.append(
            {
                "player_id": pid,
                "position_group": position_group,
                "threat_pass_pct": float(threat),
            }
        )

        xpv = player.get("xpv_per_pass")
        ir = player.get("threat_pass_pct")
        passes = player.get("passes_total")
        coe = player.get("xpass_coe_pct")
        if None in (xpv, ir, passes, coe):
            continue
        metric_rows.append(
            {
                "player_id": pid,
                "xpv_per_pass": float(xpv),
                "threat_pass_pct": float(ir),
                "passes_total": float(passes),
                "xpass_coe_pct": float(coe),
            }
        )

    threat_ranks: dict[str, dict[str, int]] = {}
    grouped: dict[str, list[tuple[str, float]]] = {}
    for row in ref_rows:
        grouped.setdefault(row["position_group"], []).append(
            (row["player_id"], row["threat_pass_pct"]),
        )
    for entries in grouped.values():
        threat_ranks.update(_rank_desc(entries))

    impact_ranks = _impact_index_ranks(players)

    thresholds = {
        "xpv_per_pass_p60": _pctile([r["xpv_per_pass"] for r in metric_rows], 0.60),
        "threat_pass_pct_p50": _pctile([r["threat_pass_pct"] for r in metric_rows], 0.50),
        "passes_total_p60": _pctile([r["passes_total"] for r in metric_rows], 0.60),
        "xpass_coe_pct_p60": _pctile([r["xpass_coe_pct"] for r in metric_rows], 0.60),
    }

    organizer_ids = sorted(
        row["player_id"]
        for row in metric_rows
        if row["xpv_per_pass"] > thresholds["xpv_per_pass_p60"]
        and row["threat_pass_pct"] < thresholds["threat_pass_pct_p50"]
        and row["passes_total"] > thresholds["passes_total_p60"]
        and row["xpass_coe_pct"] > thresholds["xpass_coe_pct_p60"]
    )

    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
    (OUTPUT_DIR / "midfielder-pool-ref.json").write_text(
        json.dumps(
            {
                "cache_version": 2,
                "player_count": len(ref_rows),
                "players": ref_rows,
                "threat_pass_ranks": threat_ranks,
                "impact_index_ranks": impact_ranks,
            },
            ensure_ascii=False,
        ),
        encoding="utf-8",
    )
    (OUTPUT_DIR / "organizer-badge.json").write_text(
        json.dumps(
            {
                "cache_version": 1,
                "criteria": {
                    "xpv_per_pass": "> P60",
                    "threat_pass_pct": "< P50",
                    "passes_total": "> P60",
                    "xpass_coe_pct": "> P60",
                },
                "thresholds": thresholds,
                "player_ids": organizer_ids,
                "player_count": len(organizer_ids),
            },
            ensure_ascii=False,
        ),
        encoding="utf-8",
    )
    print(f"Wrote midfielder-pool-ref.json ({len(ref_rows)} players)")
    print(f"Wrote organizer-badge.json ({len(organizer_ids)} badge holders)")


if __name__ == "__main__":
    main()
