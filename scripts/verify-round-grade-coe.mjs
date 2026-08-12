#!/usr/bin/env node
/** Fail CI if per-match short COE is missing from profile round grades. */

import fs from "fs";
import path from "path";

const PROFILES_DIR = path.join(process.cwd(), "data", "profiles");
const PLAYER_IDS = JSON.parse(
  fs.readFileSync(path.join(process.cwd(), "data", "player-ids.json"), "utf-8"),
);

let games = 0;
let withShort = 0;
let withLong = 0;
let withGrade = 0;

for (const pid of PLAYER_IDS) {
  const filePath = path.join(PROFILES_DIR, `${pid}.json`);
  if (!fs.existsSync(filePath)) {
    throw new Error(`Missing profile ${pid}`);
  }
  const profile = JSON.parse(fs.readFileSync(filePath, "utf-8"));
  const rounds = profile.xp_round_grades ?? [];
  if (!rounds.length) {
    throw new Error(`Profile ${pid} has no xp_round_grades`);
  }
  for (const point of rounds) {
    games += 1;
    if (point.short_pass_eff_pct != null) withShort += 1;
    if (point.long_pass_eff_pct != null) withLong += 1;
    if (point.grade != null) withGrade += 1;
  }
}

const shortPct = games ? (withShort / games) * 100 : 0;
if (shortPct < 99) {
  throw new Error(
    `Expected short_pass_eff_pct on ≥99% of games, got ${withShort}/${games} (${shortPct.toFixed(1)}%)`,
  );
}
if (withGrade !== games) {
  throw new Error(`Expected grades on all games, got ${withGrade}/${games}`);
}

console.log(
  `Verified round grades: ${games} games, short COE ${withShort}, long COE ${withLong}, grades ${withGrade}.`,
);
