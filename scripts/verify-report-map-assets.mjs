import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.dirname(fileURLToPath(import.meta.url));
const DATA_DIR = path.join(ROOT, "..", "data");
const REPORT_KEYS = [
  "report_progressive_origin",
  "report_progressive_dest",
  "report_impact_final_third",
];

const playersPath = path.join(DATA_DIR, "players.json");
if (!fs.existsSync(playersPath)) {
  console.error("Missing data/players.json");
  process.exit(1);
}

const playersPayload = JSON.parse(fs.readFileSync(playersPath, "utf8"));
const playerIds = (playersPayload.players ?? []).map((row) => String(row.player_id));

let missing = 0;
for (const playerId of playerIds) {
  for (const key of REPORT_KEYS) {
    const filePath = path.join(DATA_DIR, "pass-maps", playerId, `${key}.json`);
    if (!fs.existsSync(filePath)) {
      console.error(`Missing map asset: ${playerId}/${key}.json`);
      missing += 1;
      continue;
    }
    const payload = JSON.parse(fs.readFileSync(filePath, "utf8"));
    const passCount = Number(payload.pass_count ?? 0);
    if (!payload.pass_map_b64 && passCount > 0) {
      console.error(`Empty pass_map_b64: ${playerId}/${key}.json (${passCount} passes)`);
      missing += 1;
    }
  }
}

if (missing > 0) {
  console.error(`Report map asset verification failed (${missing} issues).`);
  process.exit(1);
}

console.log(`Verified ${playerIds.length} players × ${REPORT_KEYS.length} report maps.`);
