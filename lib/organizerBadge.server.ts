import "server-only";

import fs from "fs";
import path from "path";

type OrganizerBadgeFile = {
  player_ids: string[];
};

let organizerIds: Set<string> | null = null;

function getOrganizerIds(): Set<string> {
  if (!organizerIds) {
    const filePath = path.join(process.cwd(), "data", "organizer-badge.json");
    const payload = JSON.parse(fs.readFileSync(filePath, "utf-8")) as OrganizerBadgeFile;
    organizerIds = new Set(payload.player_ids.map(String));
  }
  return organizerIds;
}

export function hasOrganizerBadge(playerId: string): boolean {
  return getOrganizerIds().has(String(playerId));
}
