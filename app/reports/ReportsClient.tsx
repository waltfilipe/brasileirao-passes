"use client";

import { useCallback, useEffect, useState, type CSSProperties } from "react";
import { LoadingState } from "@/components/LoadingState";
import {
  PlayerReportSheet,
  mapFilterLabel,
  type PlayerReportMaps,
  type ReportMapSlot,
} from "@/components/PlayerReportSheet";
import { REPORT_MAP_FILTER_KEYS } from "@/lib/reportMapKeys";
import { waitForReportMapImages } from "@/lib/reportPrint";
import { getPassMap, getPlayerProfile, type PlayerProfile } from "@/lib/api";
import {
  enrichedReportPlayers,
  PLAYER_REPORT_CATEGORIES,
  totalReportCount,
  type EnrichedReportPlayer,
} from "@/lib/playerReports";
import { useI18n } from "@/lib/i18n/context";
import type { Messages } from "@/lib/i18n/messages";

export type ReportEntry = {
  entry: EnrichedReportPlayer;
  profile: PlayerProfile | null;
  maps: PlayerReportMaps | null;
  mapSlots: ReportMapSlot[] | null;
  error: string | null;
  loading?: boolean;
};

type PrintReportEntry = {
  entry: EnrichedReportPlayer;
  profile: PlayerProfile;
  mapSlots: ReportMapSlot[];
};

const PROFILE_CONCURRENCY = 4;

async function mapPool<T, R>(
  items: T[],
  limit: number,
  fn: (item: T, index: number) => Promise<R>,
): Promise<R[]> {
  const results = new Array<R>(items.length);
  let next = 0;

  async function worker() {
    while (next < items.length) {
      const index = next;
      next += 1;
      results[index] = await fn(items[index], index);
    }
  }

  const workers = Math.min(limit, items.length);
  await Promise.all(Array.from({ length: workers }, () => worker()));
  return results;
}

async function loadMapSlots(
  playerId: string,
  family: string,
  m: Messages,
  existing?: ReportMapSlot[] | null,
): Promise<ReportMapSlot[]> {
  const slots: ReportMapSlot[] = REPORT_MAP_FILTER_KEYS.map((key) => {
    const prev = existing?.find((s) => s.key === key);
    return prev?.pass_map_b64
      ? { ...prev }
      : { key, label: mapFilterLabel(m, key), loading: true };
  });

  for (const key of REPORT_MAP_FILTER_KEYS) {
    const idx = slots.findIndex((s) => s.key === key);
    if (slots[idx]?.pass_map_b64) continue;
    try {
      const res = await getPassMap(playerId, key, "all", family);
      slots[idx] = {
        key,
        label: mapFilterLabel(m, key),
        pass_map_b64: res.pass_map_b64,
        loading: false,
        error: null,
      };
    } catch (e) {
      slots[idx] = {
        key,
        label: mapFilterLabel(m, key),
        loading: false,
        error: e instanceof Error ? e.message : m.common.loadFailed,
      };
    }
  }
  return slots;
}

function emptyReports(): ReportEntry[] {
  return enrichedReportPlayers().map((entry) => ({
    entry,
    profile: null,
    maps: null,
    mapSlots: null,
    error: null,
    loading: true,
  }));
}

async function waitForPrintMapImages(playerIds: string[], expectedPerPlayer = REPORT_MAP_FILTER_KEYS.length) {
  const root = document.getElementById("report-print-root");
  if (!root) return { ready: false, loaded: 0, expected: playerIds.length * expectedPerPlayer };
  return waitForReportMapImages(root, playerIds, expectedPerPlayer);
}

export function ReportsClient() {
  const { m } = useI18n();
  const [reports, setReports] = useState<ReportEntry[]>(emptyReports);
  const [bootLoading, setBootLoading] = useState(true);
  const [activeCategory, setActiveCategory] = useState<string>(PLAYER_REPORT_CATEGORIES[0]?.id ?? "u23-breakout");
  const [printing, setPrinting] = useState(false);
  const [printPreparing, setPrintPreparing] = useState(false);
  const [preloadPlayerIds, setPreloadPlayerIds] = useState<Set<string>>(new Set());
  const [printEntries, setPrintEntries] = useState<PrintReportEntry[]>([]);
  const [printQueue, setPrintQueue] = useState<string[] | null>(null);

  useEffect(() => {
    let cancelled = false;
    const entries = enrichedReportPlayers();

    mapPool(entries, PROFILE_CONCURRENCY, async (entry) => {
      const family = entry.positionFamily ?? "all";
      try {
        const profile = await getPlayerProfile(entry.playerId, family);
        return {
          entry,
          profile,
          maps: null,
          mapSlots: null,
          error: null,
          loading: false,
        } satisfies ReportEntry;
      } catch (e) {
        const msg = e instanceof Error ? e.message : "Unknown error";
        return {
          entry,
          profile: null,
          maps: null,
          mapSlots: null,
          error: msg,
          loading: false,
        } satisfies ReportEntry;
      }
    }).then((loaded) => {
      if (!cancelled) {
        setReports(loaded);
        setBootLoading(false);
      }
    });

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!printQueue?.length || !printEntries.length) return;

    let cancelled = false;
    document.body.dataset.printMode = "dedicated";
    setPrinting(true);

    (async () => {
      await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));
      if (cancelled) return;
      const mapStatus = await waitForPrintMapImages(printQueue);
      if (!mapStatus.ready) {
        console.warn(
          `Report PDF print: ${mapStatus.loaded}/${mapStatus.expected} map images ready before timeout.`,
        );
      }

      const restore = () => {
        delete document.body.dataset.printMode;
        setPrinting(false);
        setPrintEntries([]);
        setPrintQueue(null);
        setPreloadPlayerIds(new Set());
        window.removeEventListener("afterprint", restore);
      };

      window.addEventListener("afterprint", restore);
      if (!cancelled) window.print();
    })();

    return () => {
      cancelled = true;
    };
  }, [printQueue, printEntries]);

  const patchReport = useCallback((playerId: string, patch: Partial<ReportEntry>) => {
    setReports((prev) =>
      prev.map((item) =>
        item.entry.playerId === playerId ? { ...item, ...patch } : item,
      ),
    );
  }, []);

  const visibleReports = reports.filter((r) => r.entry.category.id === activeCategory);
  const activeCategoryMeta = PLAYER_REPORT_CATEGORIES.find((c) => c.id === activeCategory);

  const handlePrint = useCallback(
    async (scope: string, playerId?: string) => {
      const targets = reports.filter((r) => {
        if (!r.profile) return false;
        if (playerId) return r.entry.playerId === playerId;
        if (scope === "all") return true;
        return r.entry.category.id === scope;
      });

      if (!targets.length) return;

      setPrintPreparing(true);

      const updatedSlots: Record<string, ReportMapSlot[]> = {};
      await mapPool(targets, PROFILE_CONCURRENCY, async (item) => {
        const family = item.entry.positionFamily ?? "all";
        const slots = await loadMapSlots(item.entry.playerId, family, m, item.mapSlots);
        updatedSlots[item.entry.playerId] = slots;
        patchReport(item.entry.playerId, {
          mapSlots: slots,
          maps: slots.find((s) => s.pass_map_b64)
            ? { pass_map_b64: slots.find((s) => s.pass_map_b64)?.pass_map_b64 }
            : item.maps,
        });
      });

      const entries: PrintReportEntry[] = targets.map((item) => ({
        entry: item.entry,
        profile: item.profile!,
        mapSlots: updatedSlots[item.entry.playerId] ?? item.mapSlots ?? [],
      }));

      setPrintEntries(entries);
      setPreloadPlayerIds(new Set(targets.map((t) => t.entry.playerId)));
      setPrintPreparing(false);
      setPrintQueue(targets.map((t) => t.entry.playerId));
    },
    [reports, patchReport, m],
  );

  const okCount = reports.filter((r) => r.profile).length;
  const loadingCount = reports.filter((r) => r.loading).length;
  const busy = bootLoading || loadingCount > 0 || printPreparing;

  return (
    <div className={`reports-page${printing ? " reports-printing" : ""}`}>
      <header className="reports-hero-card report-screen-only">
        <div className="reports-hero-main">
          <div className="reports-hero-copy">
            <p className="reports-hero-eyebrow">{m.reports.scoutingEyebrow}</p>
            <h1 className="reports-hero-title">{m.reports.heroTitle}</h1>
            <p className="reports-hero-lead">
              {m.reports.heroLead.replace("{count}", String(totalReportCount()))}
            </p>
          </div>
          <div className="reports-hero-stats">
            <div className="reports-hero-stat">
              <span className="reports-hero-stat-val tabular">{okCount || "—"}</span>
              <span className="reports-hero-stat-label">{m.common.reports}</span>
            </div>
            <div className="reports-hero-stat">
              <span className="reports-hero-stat-val">3</span>
              <span className="reports-hero-stat-label">{m.common.groups}</span>
            </div>
            <div className="reports-hero-stat">
              <span className="reports-hero-stat-val">PDF</span>
              <span className="reports-hero-stat-label">{m.common.exportable}</span>
            </div>
          </div>
        </div>
      </header>

      <section className="reports-category-panel report-screen-only">
        <div className="reports-category-grid">
          {PLAYER_REPORT_CATEGORIES.map((cat) => {
            const count = reports.filter((r) => r.entry.category.id === cat.id).length;
            const isActive = activeCategory === cat.id;
            const meta = m.profileCategories[cat.id];
            return (
              <button
                key={cat.id}
                type="button"
                className={`reports-category-card${isActive ? " active" : ""}`}
                style={{
                  "--category-accent": cat.accent,
                } as CSSProperties}
                onClick={() => setActiveCategory(cat.id)}
              >
                <span className="reports-category-card-eyebrow">{meta.subtitle}</span>
                <strong className="reports-category-card-title">{meta.title}</strong>
                <p className="reports-category-card-desc">{meta.description}</p>
                <div className="reports-category-card-foot">
                  <span className="reports-category-card-count tabular">{count} {m.common.athletes}</span>
                  <span
                    role="button"
                    tabIndex={0}
                    className="reports-category-export"
                    onClick={(e) => {
                      e.stopPropagation();
                      handlePrint(cat.id);
                    }}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === " ") {
                        e.preventDefault();
                        e.stopPropagation();
                        handlePrint(cat.id);
                      }
                    }}
                  >
                    <i className="fa-solid fa-file-pdf" /> {m.common.exportGroup}
                  </span>
                </div>
              </button>
            );
          })}
        </div>
      </section>

      {activeCategoryMeta && (() => {
        const meta = m.profileCategories[activeCategoryMeta.id];
        return (
        <div className="reports-active-banner report-screen-only">
          <div>
            <span className="reports-active-eyebrow">{m.common.selectedGroup}</span>
            <h2 style={{ color: activeCategoryMeta.accent }}>{meta.title}</h2>
            <p className="muted">{meta.description}</p>
          </div>
          <button
            type="button"
            className="btn btn-primary"
            onClick={() => handlePrint(activeCategory)}
            disabled={busy}
          >
            <i className="fa-solid fa-file-pdf" />
            {printPreparing ? m.reports.preparingMaps : m.common.exportGroup}
          </button>
        </div>
        );
      })()}

      <p className="reports-hint muted report-screen-only">
        {bootLoading
          ? m.reports.loadingBatches
          : `${okCount} ${m.reports.readyStat} · ${visibleReports.length} ${m.reports.inGroupStat} · ${m.reports.mapsLoadHint}`}
      </p>

      {bootLoading && loadingCount === reports.length && (
        <LoadingState message={m.reports.loadingFirst} />
      )}

      <div id="report-print-root" className="report-print-root" aria-hidden={!printing}>
        {printEntries.map((item) => (
          <PlayerReportSheet
            key={`print-${item.entry.playerId}`}
            entry={item.entry}
            profile={item.profile}
            maps={
              item.mapSlots.find((s) => s.pass_map_b64)
                ? { pass_map_b64: item.mapSlots.find((s) => s.pass_map_b64)?.pass_map_b64 }
                : null
            }
            mapSlots={item.mapSlots}
            expandAll
            preloadMaps
            printMode
          />
        ))}
      </div>

      <div className="reports-stack reports-screen-stack">
        {visibleReports.map((item) => {
          if (item.loading) {
            return (
              <div key={item.entry.playerId} className="player-report-bundle">
                <div className="player-report-sheet report-loading-sheet">
                  <LoadingState message={m.reports.loadingPlayerId.replace("{id}", item.entry.playerId)} />
                </div>
              </div>
            );
          }

          if (!item.profile) {
            return (
              <div key={item.entry.playerId} className="player-report-bundle report-error-bundle">
                <div className="player-report-sheet report-error-sheet">
                  <p className="error-box">
                    {m.reports.loadPlayerFailedPrefix} {item.entry.playerId}
                    {item.error ? `: ${item.error}` : ""}
                  </p>
                </div>
              </div>
            );
          }

          return (
            <PlayerReportSheet
              key={item.entry.playerId}
              entry={item.entry}
              profile={item.profile}
              maps={item.maps}
              mapSlots={item.mapSlots}
              expandAll={printing}
              preloadMaps={preloadPlayerIds.has(item.entry.playerId)}
              exportDisabled={busy}
              onExportPdf={(id) => handlePrint("all", id)}
              onMapsLoaded={(maps, slots) =>
                patchReport(item.entry.playerId, { maps, mapSlots: slots })
              }
            />
          );
        })}
      </div>
    </div>
  );
}
