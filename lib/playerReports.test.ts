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
  it("includes Gerson in the midfielders group", () => {
    const midfielderIds = playerIdsForProfileGroup("midfielders");
    assert.ok(midfielderIds.has("611876"), "Gerson (611876) must be in midfielders reports");

    const gerson = enrichedReportPlayers().find((entry) => entry.playerId === "611876");
    assert.ok(gerson, "Gerson must appear in enriched report players");
    assert.equal(gerson.category.id, "midfielders");
  });

  it("only lists report players that exist in the curated pool data", () => {
    const missing = enrichedReportPlayers()
      .map((entry) => entry.playerId)
      .filter((playerId) => !POOL_IDS.has(playerId));

    assert.deepEqual(missing, [], `Report players missing from pool data: ${missing.join(", ")}`);
  });
});
