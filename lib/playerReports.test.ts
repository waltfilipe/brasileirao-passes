import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, it } from "node:test";
import {
  enrichedReportPlayers,
  playerIdsForProfileGroup,
} from "./playerReports.ts";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const POOL_IDS = new Set(
  JSON.parse(readFileSync(join(ROOT, "data/player-ids.json"), "utf8")) as string[],
);

describe("playerReports", () => {
  it("includes Flamengo midfielders in the team group", () => {
    const flamengoIds = playerIdsForProfileGroup("flamengo");
    assert.ok(flamengoIds.has("1145106"), "Flamengo midfielder 1145106 must be in reports");

    const player = enrichedReportPlayers().find((entry) => entry.playerId === "1145106");
    assert.ok(player, "Flamengo midfielder must appear in enriched report players");
    assert.equal(player.category.id, "flamengo");
  });

  it("only lists report players that exist in the curated pool data", () => {
    const missing = enrichedReportPlayers()
      .map((entry) => entry.playerId)
      .filter((playerId) => !POOL_IDS.has(playerId));

    assert.deepEqual(missing, [], `Report players missing from pool data: ${missing.join(", ")}`);
  });
});
