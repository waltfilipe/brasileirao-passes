"use client";

import type { XpRoundGrade } from "@/lib/api";
import { RoundGradeStatsPanel } from "@/components/RoundGradeStatsPanel";
import { useI18n } from "@/lib/i18n/context";

type Props = {
  game: XpRoundGrade | null;
  onClose: () => void;
  accent?: string;
};

export function GameStatsModal({ game, onClose, accent = "#a78bfa" }: Props) {
  const { locale, m } = useI18n();

  if (!game) return null;

  const dateLocale = locale === "pt" ? "pt-BR" : "en-US";

  function formatDate(value?: string | null): string {
    if (!value) return "—";
    const parsed = Date.parse(value);
    if (Number.isNaN(parsed)) return value;
    return new Date(parsed).toLocaleDateString(dateLocale, {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  }

  return (
    <div className="game-stats-modal-backdrop" onClick={onClose} role="presentation">
      <div
        className="game-stats-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="game-stats-title"
        onClick={(e) => e.stopPropagation()}
        style={{ "--stats-accent": accent } as React.CSSProperties}
      >
        <header className="game-stats-modal-head">
          <div>
            <p className="game-stats-modal-eyebrow">{m.common.game} {game.round}</p>
            <h3 id="game-stats-title" className="game-stats-modal-title">
              {game.opponent ? `vs ${game.opponent}` : m.common.match}
            </h3>
            <p className="game-stats-modal-date muted">{formatDate(game.date)}</p>
          </div>
          <button type="button" className="game-stats-modal-close" onClick={onClose} aria-label={m.common.close}>
            <i className="fa-solid fa-xmark" />
          </button>
        </header>

        <RoundGradeStatsPanel point={game} accent={accent} layout="modal" />
      </div>
    </div>
  );
}
