import "server-only";

import fs from "fs";
import path from "path";

const XP_INDEX_ELITE_TOP_N = 10;
const PROFILES_DIR = path.join(process.cwd(), "data", "profiles");
const POOL_REF_PATH = path.join(process.cwd(), "data", "midfielder-pool-ref.json");

type PoolRefFile = {
  threat_pass_ranks: Record<string, { rank: number; rank_pool: number }>;
  impact_index_ranks: Record<string, { rank: number; rank_pool: number }>;
};

export type ImpactIndexComponent = {
  key: string;
  label: string;
  value: number;
  rank: number | null;
  rank_pool: number | null;
};

export type ImpactIndexStats = {
  tier: string;
  components: ImpactIndexComponent[];
};

type ImpactRow = {
  playerId: string;
  xpvPerPass: number;
  threatPassPct: number;
  xpvRank: number | null;
  xpvRankPool: number | null;
};

let impactIndexCache: Map<string, ImpactIndexStats> | null = null;
let poolRef: PoolRefFile | null = null;

function getPoolRef(): PoolRefFile {
  if (!poolRef) {
    poolRef = JSON.parse(fs.readFileSync(POOL_REF_PATH, "utf-8")) as PoolRefFile;
  }
  return poolRef;
}

function tierFromRank(rank: number, pool: number): string {
  if (rank <= 0 || pool <= 0) return "mid";
  if (rank <= XP_INDEX_ELITE_TOP_N) return "elite";
  const pct = rank / pool;
  if (pct <= 1 / 3) return "above";
  if (pct <= 2 / 3) return "mid";
  return "below";
}

function readImpactRows(): ImpactRow[] {
  const files = fs.readdirSync(PROFILES_DIR).filter((name) => name.endsWith(".json"));
  const rows: ImpactRow[] = [];

  for (const file of files) {
    const profile = JSON.parse(fs.readFileSync(path.join(PROFILES_DIR, file), "utf-8")) as Record<
      string,
      unknown
    >;
    const player = (profile.player as Record<string, unknown> | undefined) ?? {};
    const xp = (profile.xp as Record<string, unknown> | undefined) ?? {};
    const playerId = String(player.player_id ?? "");
    const impactItem = (profile.xp_indices as {
      key?: string;
      components?: { key?: string; rank?: number; rank_pool?: number; value?: unknown }[];
    }[] | undefined)?.find((item) => item.key === "impact");
    const xpvComponent = impactItem?.components?.find((c) => c.key === "xpv_per_pass");
    const xpvPerPass = xpvComponent?.value ?? xp.xpv_per_pass;
    const threatPassPct = player.threat_pass_pct;

    if (
      !playerId
      || xpvPerPass == null
      || threatPassPct == null
      || Number.isNaN(Number(xpvPerPass))
      || Number.isNaN(Number(threatPassPct))
    ) {
      continue;
    }

    rows.push({
      playerId,
      xpvPerPass: Number(xpvPerPass),
      threatPassPct: Number(threatPassPct),
      xpvRank: xpvComponent?.rank ?? (xp.xpv_per_pass_rank_in_group as number | null) ?? null,
      xpvRankPool: xpvComponent?.rank_pool ?? (xp.xpv_per_pass_rank_pool_in_group as number | null) ?? null,
    });
  }

  return rows;
}

function buildImpactIndexCache(): Map<string, ImpactIndexStats> {
  const rows = readImpactRows();
  const { threat_pass_ranks: threatPassRanks, impact_index_ranks: impactIndexRanks } = getPoolRef();
  const out = new Map<string, ImpactIndexStats>();

  for (const row of rows) {
    const rateRank = threatPassRanks[row.playerId] ?? null;
    const compositeRank = impactIndexRanks[row.playerId] ?? null;
    const tier = compositeRank
      ? tierFromRank(compositeRank.rank, compositeRank.rank_pool)
      : "mid";

    out.set(row.playerId, {
      tier,
      components: [
        {
          key: "xpv_per_pass",
          label: "xPV/Pass",
          value: row.xpvPerPass,
          rank: row.xpvRank,
          rank_pool: row.xpvRankPool,
        },
        {
          key: "threat_pass_pct",
          label: "Impact Rate",
          value: row.threatPassPct,
          rank: rateRank?.rank ?? null,
          rank_pool: rateRank?.rank_pool ?? null,
        },
      ],
    });
  }

  return out;
}

export function getImpactIndexStats(playerId: string): ImpactIndexStats | null {
  if (!impactIndexCache) impactIndexCache = buildImpactIndexCache();
  return impactIndexCache.get(playerId) ?? null;
}
