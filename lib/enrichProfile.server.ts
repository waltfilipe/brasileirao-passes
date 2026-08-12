import "server-only";

import fs from "fs";
import path from "path";
import { getImpactIndexStats } from "@/lib/xpImpactIndex.server";
import { hasOrganizerBadge } from "@/lib/organizerBadge.server";

type JsonRecord = Record<string, unknown>;

type DerivedPlayerMetrics = {
  defensive_actions_p90?: number | null;
  defensive_actions_p90_rank_in_league?: number | null;
  defensive_actions_p90_rank_pool_in_league?: number | null;
  chance_creation_xpv?: number | null;
  chance_creation_xpv_rank_in_group?: number | null;
  chance_creation_xpv_rank_pool_in_group?: number | null;
};

type DerivedPoolFile = {
  players: Record<string, DerivedPlayerMetrics>;
};

const DEFENSE_REPLACE_KEYS = new Set([
  "def_won_tackle_p90",
  "def_interception_p90",
  "def_clearance_p90",
]);

let derivedCache: DerivedPoolFile | null = null;

function getDerivedPool(): DerivedPoolFile {
  if (!derivedCache) {
    const filePath = path.join(process.cwd(), "data", "pool-derived-metrics.json");
    derivedCache = JSON.parse(fs.readFileSync(filePath, "utf-8")) as DerivedPoolFile;
  }
  return derivedCache;
}

function getDerivedForPlayer(playerId: string): DerivedPlayerMetrics | null {
  return getDerivedPool().players[playerId] ?? null;
}

function enrichDefenseComponents(
  components: { key: string; label: string; value?: number | null; rank?: number | null; rank_pool?: number | null }[],
  derived: DerivedPlayerMetrics,
) {
  const kept = components.filter((c) => !DEFENSE_REPLACE_KEYS.has(c.key));
  if (derived.defensive_actions_p90 == null) return kept;

  return [
    {
      key: "defensive_actions_p90",
      label: "Defensive actions / 90",
      value: derived.defensive_actions_p90,
      rank: derived.defensive_actions_p90_rank_in_league ?? null,
      rank_pool: derived.defensive_actions_p90_rank_pool_in_league ?? null,
    },
    ...kept,
  ];
}

function enrichChanceCreationSection(section: JsonRecord, derived: DerivedPlayerMetrics): JsonRecord {
  if (section.title !== "Chance creation") return section;
  const components = (section.components as JsonRecord[] | undefined) ?? [];
  if (derived.chance_creation_xpv == null) return section;

  return {
    ...section,
    components: [
      ...components,
      {
        key: "chance_creation_xpv",
        value: derived.chance_creation_xpv,
        rank: derived.chance_creation_xpv_rank_in_group ?? null,
        rank_pool: derived.chance_creation_xpv_rank_pool_in_group ?? null,
        stratum_star: false,
      },
    ],
  };
}

function enrichImpactIndex(indices: JsonRecord[] | undefined, playerId: string): JsonRecord[] | undefined {
  if (!indices) return indices;

  const impact = getImpactIndexStats(playerId);
  if (!impact) return indices;

  return indices.map((item) => {
    if (item.key !== "impact") return item;
    return {
      ...item,
      tier: impact.tier,
      components: impact.components,
    };
  });
}

export function enrichPlayerProfile(profile: JsonRecord): JsonRecord {
  const playerId = String((profile.player as JsonRecord | undefined)?.player_id ?? "");
  if (!playerId) return profile;

  const derived = getDerivedForPlayer(playerId);

  let xpIndices = (profile.xp_indices as JsonRecord[] | undefined)?.map((item) => {
    if (!derived || item.key !== "defense" || !Array.isArray(item.components)) return item;
    return {
      ...item,
      components: enrichDefenseComponents(
        item.components as {
          key: string;
          label: string;
          value?: number | null;
          rank?: number | null;
          rank_pool?: number | null;
        }[],
        derived,
      ),
    };
  });

  xpIndices = enrichImpactIndex(xpIndices, playerId);

  const passScores = derived
    ? (profile.pass_scores as JsonRecord[] | undefined)?.map((section) =>
        enrichChanceCreationSection(section, derived),
      )
    : profile.pass_scores;

  return {
    ...profile,
    ...(xpIndices ? { xp_indices: xpIndices } : {}),
    ...(passScores ? { pass_scores: passScores } : {}),
    organizer_badge: hasOrganizerBadge(playerId),
  };
}
