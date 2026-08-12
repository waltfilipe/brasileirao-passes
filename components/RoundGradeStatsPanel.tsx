"use client";

import type { CSSProperties } from "react";
import type { XpRoundGrade } from "@/lib/api";
import { passGradeGradientColor, passGradePct } from "@/lib/gradeColors";
import { useI18n } from "@/lib/i18n/context";
import type { Messages } from "@/lib/i18n/messages";

type Props = {
  point: XpRoundGrade;
  accent?: string;
  layout?: "tooltip" | "modal";
};

type RowTone = "grade" | "count";

type StatRow = {
  key: string;
  label: string;
  value: string;
  tone: RowTone;
  grade?: number | null;
  countValue?: number | null;
};

const COUNT_GRADE_CAPS: Record<string, { min: number; max: number }> = {
  passes: { min: 12, max: 75 },
  xpv: { min: 0, max: 25 },
  xpPerPass: { min: 0, max: 0.5 },
  breakline: { min: 0, max: 5 },
  impact: { min: 0, max: 3 },
};

function formatXpv(value?: number | null): string {
  if (value == null || Number.isNaN(value)) return "—";
  return value.toFixed(2);
}

function formatXpPerPass(xp?: number | null, passes?: number | null): string {
  if (xp == null || passes == null || passes <= 0) return "—";
  return (xp / passes).toFixed(3);
}

function countToPseudoGrade(key: string, value: number): number {
  const caps = COUNT_GRADE_CAPS[key];
  if (!caps || caps.max <= caps.min) return 6;
  const t = Math.max(0, Math.min(1, (value - caps.min) / (caps.max - caps.min)));
  return 4.5 + t * 4.5;
}

function rowPseudoGrade(row: StatRow): number | null {
  if (row.tone === "grade" && row.grade != null) return row.grade;
  if (row.tone === "count" && row.countValue != null) return countToPseudoGrade(row.key, row.countValue);
  return null;
}

function qualityRowStyle(row: StatRow): CSSProperties {
  const pseudoGrade = rowPseudoGrade(row);
  if (pseudoGrade == null) {
    return {
      background: "linear-gradient(135deg, rgba(30, 41, 59, 0.42) 0%, rgba(15, 23, 42, 0.55) 100%)",
      borderColor: "rgba(148, 163, 184, 0.12)",
    };
  }
  const color = passGradeGradientColor(passGradePct(pseudoGrade));
  return {
    background: `linear-gradient(135deg, ${color}24 0%, rgba(15, 23, 42, 0.52) 100%)`,
    borderColor: `${color}40`,
  };
}

function valueStyle(row: StatRow): CSSProperties | undefined {
  const pseudoGrade = rowPseudoGrade(row);
  if (pseudoGrade == null) return undefined;
  const color = passGradeGradientColor(passGradePct(pseudoGrade));
  if (row.tone === "grade") {
    return { color, textShadow: `0 0 10px ${color}44` };
  }
  return { color };
}

function buildRows(point: XpRoundGrade, rs: Messages["roundStats"]): StatRow[] {
  const xpPerPass =
    point.xp != null && point.passes != null && point.passes > 0
      ? point.xp / point.passes
      : null;
  return [
    {
      key: "grade",
      label: rs.grade,
      value: point.grade != null ? point.grade.toFixed(1) : "—",
      tone: "grade",
      grade: point.grade,
    },
    {
      key: "passes",
      label: rs.passes,
      value: point.passes != null ? String(point.passes) : "—",
      tone: "count",
      countValue: point.passes,
    },
    {
      key: "xpv",
      label: rs.xpv,
      value: formatXpv(point.xp),
      tone: "count",
      countValue: point.xp,
    },
    {
      key: "xpPerPass",
      label: rs.xpPerPass,
      value: formatXpPerPass(point.xp, point.passes),
      tone: "count",
      countValue: xpPerPass,
    },
    {
      key: "breakline",
      label: rs.breakline,
      value: point.breakline_passes != null ? String(point.breakline_passes) : "—",
      tone: "count",
      countValue: point.breakline_passes,
    },
    {
      key: "impact",
      label: rs.impact,
      value: point.impact != null ? String(point.impact) : "—",
      tone: "count",
      countValue: point.impact,
    },
  ];
}

export function RoundGradeStatsPanel({ point, accent = "#a78bfa", layout = "tooltip" }: Props) {
  const { m } = useI18n();
  const header = `R${point.round}${point.opponent ? ` vs ${point.opponent}` : ""}`;
  const rows = buildRows(point, m.roundStats);
  const listClass = layout === "modal" ? "round-grade-stats-list round-grade-stats-list-modal" : "round-grade-stats-list";

  return (
    <div
      className={`round-grade-stats round-grade-stats--${layout}`}
      style={{ "--stats-accent": accent } as React.CSSProperties}
    >
      <div className="round-grade-stats-head tabular">{header}</div>
      <ul className={listClass}>
        {rows.map((row) => (
          <li
            key={row.key}
            className="round-grade-stats-row"
            style={qualityRowStyle(row)}
          >
            <span className="round-grade-stats-label">{row.label}</span>
            <span
              className="round-grade-stats-value tabular"
              style={valueStyle(row)}
            >
              {row.value}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
