"use client";

import Link from "next/link";
import { Suspense } from "react";
import { PageHero } from "@/components/PageHero";
import { PlayersTable } from "@/components/PlayersTable";
import type { PlayerSummary } from "@/lib/api";
import { useI18n } from "@/lib/i18n/context";
import { PlayersFilters } from "./PlayersFilters";

type Props = {
  players: PlayerSummary[];
  total: number;
  error: string | null;
  family: string;
  filters: {
    leagues: string[];
    position_groups: string[];
  };
  positionFamilies: { key: string; label: string }[];
  params: {
    position_family?: string;
    search?: string;
  };
};

export function PlayersPageContent({
  players,
  total,
  error,
  family,
  positionFamilies,
  params,
}: Props) {
  const { m } = useI18n();
  const foundLabel = total === 1 ? m.players.found : m.players.foundPlural;

  return (
    <div className="container">
      <PageHero title={m.nav.players} subtitle={m.players.subtitle} icon="fa-table-list" />

      <Suspense fallback={<div className="muted">{m.players.loadingFilters}</div>}>
        <PlayersFilters
          positionFamilies={positionFamilies}
          currentPositionFamily={family}
          currentSearch={params.search}
        />
      </Suspense>

      {error && <div className="error-box">{error}</div>}

      <p className="muted" style={{ marginBottom: "0.75rem" }}>
        {total} {foundLabel}
      </p>

      <Link href="/reports" className="reports-promo-card report-screen-only">
        <span className="reports-promo-icon">
          <i className="fa-solid fa-file-lines" />
        </span>
        <span className="reports-promo-text">
          <strong>{m.players.reportsPromoTitle}</strong>
          <span className="muted">{m.players.reportsPromoDesc}</span>
        </span>
        <span className="reports-promo-cta">
          {m.players.reportsPromoCta} <i className="fa-solid fa-arrow-right" />
        </span>
      </Link>

      <PlayersTable players={players} positionFamily={family} />
    </div>
  );
}
