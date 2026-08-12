import "server-only";

import fs from "fs";
import path from "path";
import { playerIdsForProfileGroup } from "@/lib/playerReports";
import { enrichPlayerProfile } from "@/lib/enrichProfile.server";

const DATA_DIR = path.join(process.cwd(), "data");

const LETTER_GRADE_SCORES: Record<string, number> = {
  "A+": 8.9,
  A: 8.4,
  "A-": 7.9,
  "B+": 7.4,
  B: 6.9,
  "B-": 6.4,
  "C+": 5.9,
  C: 5.4,
  "C-": 4.9,
  D: 4.2,
};

const SCATTER_LABELS: Record<string, string> = {
  xpass_coe_pct: "COE",
  test_impact_v2_p90: "Impact Passes",
  xpv_per_pass_p90: "xPV/Game",
  xpv_per_pass: "xPV/Pass",
  xp_per_90: "xP",
};

const PASS_LETTER_FIELDS: Record<string, string> = {
  volume_grade: "pass_volume_letter",
  efficiency_grade: "pass_efficiency_letter",
  buildup_grade: "pass_buildup_letter",
  chance_grade: "pass_chance_creation_letter",
};

const PLAYER_LIST_LETTER_FIELDS = [
  "pass_volume_letter",
  "pass_efficiency_letter",
  "pass_buildup_letter",
  "pass_chance_creation_letter",
  "defense_letter",
  "defense_display",
] as const;

const AGE_BANDS: Record<string, [number | null, number | null]> = {
  all: [null, null],
  u21: [null, 21],
  u23: [22, 23],
  "24_30": [24, 30],
  over30: [31, null],
};

const POSITION_BLOCKS: Record<string, string | null> = {
  cm: "central_midfielders",
  am: "attacking_midfielders",
};

type JsonRecord = Record<string, unknown>;

let footOverrides: Record<string, string> | null = null;

function normalizeFoot(value: unknown): string | null {
  if (value == null) return null;
  const text = String(value).trim().toLowerCase();
  if (!text) return null;
  if (text === "both") return "Both";
  if (text.startsWith("left")) return "Left";
  if (text.startsWith("right")) return "Right";
  return String(value).trim();
}

function getFootOverrides(): Record<string, string> {
  if (!footOverrides) {
    try {
      footOverrides = readJson<Record<string, string>>("foot-overrides.json");
    } catch {
      footOverrides = {};
    }
  }
  return footOverrides;
}

function resolveDominantFoot(playerId: string, value: unknown): string | null {
  return normalizeFoot(getFootOverrides()[playerId] ?? value);
}

function readJson<T>(filename: string): T {
  const filePath = path.join(DATA_DIR, filename);
  return JSON.parse(fs.readFileSync(filePath, "utf-8")) as T;
}

let cache: {
  meta?: JsonRecord;
  players?: { players: JsonRecord[]; total: number };
  mapsOptions?: JsonRecord;
  aggregated?: JsonRecord;
  poolMetrics?: JsonRecord[];
  profiles?: Map<string, JsonRecord>;
} = {};

function getPlayersData(): { players: JsonRecord[]; total: number } {
  if (!cache.players) cache.players = readJson("players.json");
  return cache.players!;
}

function getPoolMetrics(): JsonRecord[] {
  if (!cache.poolMetrics) cache.poolMetrics = readJson("pool-metrics.json");
  return cache.poolMetrics!;
}

function getXpById(): Record<string, JsonRecord> {
  const metrics = getPoolMetrics();
  const out: Record<string, JsonRecord> = {};
  for (const row of metrics) {
    out[String(row.player_id)] = row;
  }
  return out;
}

function mergePlayerListRow(player: JsonRecord): JsonRecord {
  const pid = String(player.player_id);
  const xp = getXpById()[pid] ?? {};
  const merged: JsonRecord = { ...player };

  for (const field of PLAYER_LIST_LETTER_FIELDS) {
    if (xp[field] != null) merged[field] = xp[field];
  }

  const profile = getProfile(pid);
  const profilePlayer = profile?.player as JsonRecord | undefined;
  if (profilePlayer?.age != null) {
    merged.age = profilePlayer.age;
  }

  return merged;
}

function getProfile(playerId: string): JsonRecord | null {
  if (!cache.profiles) cache.profiles = new Map();
  if (!cache.profiles.has(playerId)) {
    const relativePath = `profiles/${playerId}.json`;
    const filePath = path.join(DATA_DIR, relativePath);
    if (!fs.existsSync(filePath)) return null;
    cache.profiles.set(playerId, readJson(relativePath));
  }
  const profile = cache.profiles.get(playerId) ?? null;
  if (!profile) return null;
  const player = profile.player as JsonRecord | undefined;
  if (player) {
    const foot = resolveDominantFoot(playerId, player.dominant_foot);
    if (foot) player.dominant_foot = foot;
  }
  return profile;
}

function normalizeLetter(letter: unknown): string {
  return String(letter ?? "")
    .trim()
    .toUpperCase()
    .replace("−", "-");
}

function letterMeetsMinimum(playerLetter: unknown, minimum: string): boolean {
  const minScore = LETTER_GRADE_SCORES[normalizeLetter(minimum)];
  if (minScore == null) return true;
  const playerScore = LETTER_GRADE_SCORES[normalizeLetter(playerLetter)];
  if (playerScore == null) return false;
  return playerScore >= minScore;
}

function parseAgeBand(ageBand?: string | null): [number | null, number | null] {
  return AGE_BANDS[(ageBand ?? "all").toLowerCase()] ?? [null, null];
}

function parseHeightMeters(value: unknown): number | null {
  if (value == null) return null;
  const text = String(value).trim().replace(",", ".");
  const n = Number(text);
  if (!Number.isFinite(n)) return null;
  return n > 3 ? n / 100 : n;
}

function filterPool(players: JsonRecord[], params: URLSearchParams): JsonRecord[] {
  const league = params.get("league") ?? "all";
  const search = (params.get("search") ?? "").toLowerCase();
  const positionGroup = params.get("position_group");
  const [ageMin, ageMax] = parseAgeBand(params.get("age_band"));
  const ageSliderMin = Number(params.get("age_slider_min") ?? 16);
  const ageSliderMax = Number(params.get("age_slider_max") ?? 42);
  const foot = params.get("foot") ?? "all";
  const valueMin = Number(params.get("value_min_m") ?? 0) * 1_000_000;
  const valueMax = Number(params.get("value_max_m") ?? 150) * 1_000_000;
  const contractMin = Number(params.get("contract_year_min") ?? 2026);
  const contractMax = Number(params.get("contract_year_max") ?? 2033);
  const minutesMin = Number(params.get("minutes_min") ?? 0);
  const minutesMax = Number(params.get("minutes_max") ?? 3600);
  const heightMin = Number(params.get("height_min_m") ?? 1.6);
  const heightMax = Number(params.get("height_max_m") ?? 2.05);
  const positionBlock = params.get("position_block") ?? "all";
  const xpById = getXpById();

  const effectiveAgeMin = Math.max(ageMin ?? 16, ageSliderMin);
  const effectiveAgeMax = Math.min(ageMax ?? 42, ageSliderMax);

  let filtered = players.filter((player) => {
    const pid = String(player.player_id);
    const xp = xpById[pid] ?? player;

    if (league !== "all" && String(player.league_source ?? "") !== league) return false;
    if (positionGroup && String(player.position_group ?? "") !== positionGroup) return false;
    if (search && !String(player.player_name ?? "").toLowerCase().includes(search)) return false;

    const age = player.age != null ? Number(player.age) : null;
    if (age != null) {
      if (age < effectiveAgeMin || age > effectiveAgeMax) return false;
    } else if (ageMin != null || ageMax != null) {
      return false;
    }

    if (foot !== "all") {
      const playerFoot = normalizeFoot(resolveDominantFoot(String(player.player_id ?? ""), player.dominant_foot))?.toLowerCase();
      if (playerFoot !== foot) return false;
    }

    if (valueMin > 0 || valueMax < 150_000_000) {
      const mv = player.market_value_eur != null ? Number(player.market_value_eur) : null;
      if (mv == null || mv < valueMin || mv > valueMax) return false;
    }

    if (contractMin > 2026 || contractMax < 2033) {
      const contract = String(player.contract_until ?? "");
      const year = contract ? Number(contract.slice(0, 4)) : NaN;
      if (!Number.isFinite(year) || year < contractMin || year > contractMax) return false;
    }

    if (minutesMin > 0 || minutesMax < 3600) {
      const minutes = player.minutes != null ? Number(player.minutes) : null;
      if (minutes == null || minutes < minutesMin || minutes > minutesMax) return false;
    }

    if (heightMin > 1.6 || heightMax < 2.05) {
      const height = parseHeightMeters(player.height);
      if (height == null || height < heightMin || height > heightMax) return false;
    }

    if (positionBlock !== "all") {
      const group = POSITION_BLOCKS[positionBlock];
      if (group && String(player.position_group ?? "") !== group) return false;
    }

    for (const [param, field] of Object.entries(PASS_LETTER_FIELDS)) {
      const selected = params.get(param) ?? "all";
      if (!selected || selected === "all") continue;
      if (!letterMeetsMinimum(xp[field], selected)) return false;
    }

    return true;
  });

  const exclude = params.get("exclude");
  if (exclude) {
    filtered = filtered.filter((p) => String(p.player_id) !== exclude);
  }

  const profileGroup = params.get("profile_group");
  if (profileGroup && profileGroup !== "all") {
    const allowed = playerIdsForProfileGroup(profileGroup);
    if (allowed.size) {
      filtered = filtered.filter((p) => allowed.has(String(p.player_id)));
    }
  }

  const team = params.get("team");
  if (team && team !== "all") {
    filtered = filtered.filter((p) => String(p.team_key ?? "") === team);
  }

  const positionFamily = params.get("position_family");
  if (positionFamily && positionFamily !== "all") {
    filtered = filtered.filter((p) => String(p.position_family ?? "") === positionFamily);
  }

  return filtered;
}

export function getStaticMeta() {
  if (!cache.meta) cache.meta = readJson("meta.json");
  return cache.meta;
}

export function getStaticPlayers(params: URLSearchParams) {
  const data = getPlayersData();
  const filtered = filterPool(data.players, params).map(mergePlayerListRow);
  const limit = Math.min(Number(params.get("limit") ?? 200), 2000);
  const offset = Number(params.get("offset") ?? 0);
  return {
    position_family: params.get("position_family") ?? "all",
    total: filtered.length,
    offset,
    limit,
    players: filtered.slice(offset, offset + limit),
  };
}

export function getStaticPlayerOptions(params: URLSearchParams) {
  const data = getPlayersData();
  const filtered = filterPool(data.players, params);
  const xpById = getXpById();
  const ranked = filtered
    .map((player) => {
      const pid = String(player.player_id);
      const xp = xpById[pid] ?? {};
      const rating = xp.xp_pass_rating != null ? Number(xp.xp_pass_rating) : -Infinity;
      return { player, pid, rating };
    })
    .sort((a, b) => b.rating - a.rating || String(a.player.player_name).localeCompare(String(b.player.player_name)));

  const options = ranked.map(({ player, pid, rating }) => {
    const name = String(player.player_name ?? "—");
    const team = String(player.team ?? "—");
    const score =
      Number.isFinite(rating) && rating > -Infinity
        ? (rating * 10).toFixed(1)
        : "—";
    return {
      player_id: pid,
      player_name: name,
      team,
      label: `${name} (${team}) - ${score}`,
    };
  });

  return { position_family: params.get("position_family") ?? "all", options };
}

export function getStaticPlayerProfile(playerId: string) {
  const profile = getProfile(playerId);
  if (!profile) return null;
  return enrichPlayerProfile(profile);
}

export function getStaticCompare(playerA: string, playerB: string) {
  const profileA = enrichPlayerProfile(getProfile(playerA) ?? {});
  const profileB = enrichPlayerProfile(getProfile(playerB) ?? {});
  if (!profileA?.player || !profileB?.player) return null;

  const sourceA = { ...(profileA.player as JsonRecord), ...(profileA.xp as JsonRecord) };
  const sourceB = { ...(profileB.player as JsonRecord), ...(profileB.xp as JsonRecord) };

  const pillarKeys = [
    ["xp_activity_display", "Productivity"],
    ["xp_efficiency_display", "Precision"],
    ["xp_edge_display", "Lethality"],
  ] as const;

  const passKeys = [
    ["pass_volume_display", "Volume"],
    ["pass_efficiency_display", "Efficiency"],
    ["pass_buildup_display", "Build-up"],
    ["pass_chance_creation_display", "Chance creation"],
  ] as const;

  const metric = (source: JsonRecord, key: string) => {
    const val = source[key];
    return val == null ? null : Number(val);
  };

  const winner = (a: number | null, b: number | null): "a" | "b" | "tie" => {
    if ((a ?? 0) > (b ?? 0)) return "a";
    if ((b ?? 0) > (a ?? 0)) return "b";
    return "tie";
  };

  const playerCard = (pid: string, source: JsonRecord, xp: JsonRecord, profile: JsonRecord) => {
    const poolPlayer = getPlayersData().players.find((row) => String(row.player_id) === pid);
    const dominantFoot = resolveDominantFoot(pid, source.dominant_foot ?? poolPlayer?.dominant_foot);

    return {
      player_id: pid,
      player_name: source.player_name,
      team: source.team,
      position: source.position,
      position_group: source.position_group,
      photo_url: source.photo_url,
      market_value: source.market_value,
      contract_until: source.contract_until,
      dominant_foot: dominantFoot,
      age: source.age,
      height: source.height,
      nationality: source.nationality,
      minutes: source.minutes,
      minutes_pct: source.minutes_pct,
      long_pass_share_pct: xp.long_pass_share_pct,
      long_pass_share_ref_avg_pct: xp.long_pass_share_ref_avg_pct,
      long_pass_share_pctile: xp.long_pass_share_pctile,
      xp_bars: profile.xp_bars,
      xp_indices: profile.xp_indices,
      xp_game_consistency_score: xp.xp_game_consistency_score,
      test_impact_v2_p90: xp.test_impact_v2_p90,
    };
  };

  const sectionForLabel = (profile: JsonRecord, label: string) => {
    const sections = (profile.pass_scores as { title: string; display_score?: unknown; letter?: unknown; index?: unknown; components?: JsonRecord[] }[]) ?? [];
    return sections.find((s) => s.title === label);
  };

  return {
    player_a: playerCard(playerA, sourceA, profileA.xp as JsonRecord, profileA),
    player_b: playerCard(playerB, sourceB, profileB.xp as JsonRecord, profileB),
    heatmap_a_b64: profileA.origin_heatmap_b64 ?? null,
    heatmap_b_b64: profileB.origin_heatmap_b64 ?? null,
    pillars: pillarKeys.map(([key, label]) => {
      const a = metric(sourceA, key);
      const b = metric(sourceB, key);
      return { key, label, value_a: a, value_b: b, winner: winner(a, b) };
    }),
    pass_grid: passKeys.map(([key, label]) => {
      const a = metric(sourceA, key);
      const b = metric(sourceB, key);
      const letterKey = key.replace("_display", "_letter");
      const indexKey = key.replace("_display", "_index");
      const sectionA = sectionForLabel(profileA, label);
      const sectionB = sectionForLabel(profileB, label);
      const componentValue = (section: typeof sectionA, source: JsonRecord, compKey: string) => {
        const fromSection = section?.components?.find((c) => String(c.key) === compKey)?.value;
        if (fromSection != null && fromSection !== "") return Number(fromSection);
        return metric(source, compKey);
      };
      const components = (sectionA?.components ?? []).map((comp) => {
        const compKey = String(comp.key);
        const fa = componentValue(sectionA, sourceA, compKey);
        const fb = componentValue(sectionB, sourceB, compKey);
        return { key: compKey, value_a: fa, value_b: fb, winner: winner(fa, fb) };
      });
      return {
        key,
        label,
        value_a: a,
        value_b: b,
        letter_a: sourceA[letterKey],
        letter_b: sourceB[letterKey],
        score_a: metric(sourceA, indexKey),
        score_b: metric(sourceB, indexKey),
        winner: winner(a, b),
        components,
      };
    }),
  };
}

export function getStaticScatter(xKey: string, yKey: string, highlight?: string | null) {
  const metrics = getPoolMetrics();
  const points = metrics
    .map((row) => {
      const x = row[xKey];
      const y = row[yKey];
      if (x == null || y == null) return null;
      const xVal = Number(x);
      const yVal = Number(y);
      if (!Number.isFinite(xVal) || !Number.isFinite(yVal)) return null;
      const short = Number(row.passes_short ?? 0);
      const long = Number(row.passes_long ?? 0);
      const total = short + long;
      const meanDist = total > 0 ? (short * 15 + long * 35) / total : 0;
      return {
        player_id: String(row.player_id),
        player_name: row.player_name,
        team: row.team,
        position: row.position,
        x: xVal,
        y: yVal,
        mean_dist: meanDist,
        highlight: String(row.player_id) === String(highlight ?? ""),
      };
    })
    .filter(Boolean) as JsonRecord[];

  const xs = points.map((p) => Number(p.x));
  const ys = points.map((p) => Number(p.y));

  return {
    position_family: "all",
    points,
    x_key: xKey,
    y_key: yKey,
    x_label: SCATTER_LABELS[xKey] ?? xKey,
    y_label: SCATTER_LABELS[yKey] ?? yKey,
    means: {
      x: xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : 0,
      y: ys.length ? ys.reduce((a, b) => a + b, 0) / ys.length : 0,
    },
    count: points.length,
  };
}

export function getStaticPassMap(playerId: string, passFilter: string) {
  const relativePath = `pass-maps/${playerId}/${passFilter}.json`;
  const filePath = path.join(DATA_DIR, relativePath);
  if (!fs.existsSync(filePath)) return null;
  return readJson(relativePath);
}

export function getStaticAggregated() {
  if (!cache.aggregated) cache.aggregated = readJson("aggregated.json");
  return cache.aggregated;
}

export function getStaticMapsOptions() {
  if (!cache.mapsOptions) cache.mapsOptions = readJson("maps-options.json");
  return cache.mapsOptions;
}
