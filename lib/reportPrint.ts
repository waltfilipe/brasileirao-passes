import { REPORT_MAP_FILTER_KEYS } from "@/lib/reportMapKeys";

export const REPORT_PAGES_PER_PLAYER = 2;
export const REPORT_MAPS_PER_PLAYER = REPORT_MAP_FILTER_KEYS.length;

export type ReportMapImageStatus = {
  ready: boolean;
  loaded: number;
  expected: number;
};

export function countReadyReportMapImages(
  root: ParentNode,
  playerIds: string[],
  expectedPerPlayer = REPORT_MAPS_PER_PLAYER,
): ReportMapImageStatus {
  let loaded = 0;
  const expected = playerIds.length * expectedPerPlayer;

  for (const playerId of playerIds) {
    const imgs = root.querySelectorAll<HTMLImageElement>(
      `[data-player-id="${playerId}"] .report-map-img`,
    );
    for (const img of Array.from(imgs)) {
      if (img.complete && img.naturalHeight > 0) loaded += 1;
    }
  }

  const ready = playerIds.every((playerId) => {
    const imgs = root.querySelectorAll<HTMLImageElement>(
      `[data-player-id="${playerId}"] .report-map-img`,
    );
    if (imgs.length < expectedPerPlayer) return false;
    return Array.from(imgs).every((img) => img.complete && img.naturalHeight > 0);
  });

  return { ready, loaded, expected };
}

export function sheetsPerPrintJob(playerCount: number): number {
  return playerCount * REPORT_PAGES_PER_PLAYER;
}

export async function waitForReportMapImages(
  root: ParentNode,
  playerIds: string[],
  expectedPerPlayer = REPORT_MAPS_PER_PLAYER,
  timeoutMs = 30000,
): Promise<ReportMapImageStatus> {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    const status = countReadyReportMapImages(root, playerIds, expectedPerPlayer);
    if (status.ready) return status;
    await new Promise((resolve) => setTimeout(resolve, 250));
  }
  return countReadyReportMapImages(root, playerIds, expectedPerPlayer);
}
