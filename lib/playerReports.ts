export type ReportPlayerRef = {
  playerId: string;
  positionFamily?: string;
  note?: string;
};

export type ReportPlayerGroup = {
  label?: string;
  players: ReportPlayerRef[];
};

export type PlayerReportCategory = {
  id: string;
  title: string;
  subtitle: string;
  description: string;
  accent: string;
  groups: ReportPlayerGroup[];
};

export const POSITION_FAMILIES = [
  { key: "centerbacks", label: "Zagueiros", accent: "#38bdf8" },
  { key: "fullbacks", label: "Laterais", accent: "#a78bfa" },
  { key: "midfielders", label: "Meio-campistas", accent: "#34d399" },
  { key: "wingers", label: "Extremos", accent: "#fbbf24" },
] as const;

export type PositionFamilyKey = (typeof POSITION_FAMILIES)[number]["key"];

export const PROFILE_ALL_GROUP = {
  id: "all",
  title: "Todos os jogadores",
  subtitle: "Pool completo",
  description: "Top 15 por posição no Brasileirão 2026.",
  accent: "#cbd5e1",
} as const;

function p(playerId: string, positionFamily: PositionFamilyKey, note?: string): ReportPlayerRef {
  return { playerId, positionFamily, note };
}

/** Top 15 per position — populated from extraction script output. */
export const PLAYER_REPORT_CATEGORIES: PlayerReportCategory[] = [
  {
    id: "centerbacks",
    title: "Zagueiros",
    subtitle: "Top 15 zagueiros",
    description: "Os 15 zagueiros com melhor perfil de passe no Brasileirão 2026.",
    accent: "#38bdf8",
    groups: [
      {
        players: [
          p("358548", "centerbacks"),
          p("840220", "centerbacks"),
          p("869643", "centerbacks"),
          p("962187", "centerbacks"),
          p("874729", "centerbacks"),
          p("1907760", "centerbacks"),
          p("875402", "centerbacks"),
          p("839095", "centerbacks"),
          p("148155", "centerbacks"),
          p("1191278", "centerbacks"),
          p("1105796", "centerbacks"),
          p("925871", "centerbacks"),
          p("339447", "centerbacks"),
          p("333275", "centerbacks"),
          p("215956", "centerbacks"),
        ],
      },
    ],
  },
  {
    id: "fullbacks",
    title: "Laterais",
    subtitle: "Top 15 laterais",
    description: "Os 15 laterais com melhor perfil de passe no Brasileirão 2026.",
    accent: "#a78bfa",
    groups: [
      {
        players: [
          p("959620", "fullbacks"),
          p("795773", "fullbacks"),
          p("1019157", "fullbacks"),
          p("1087079", "fullbacks"),
          p("1106487", "fullbacks"),
          p("243113", "fullbacks"),
          p("928134", "fullbacks"),
          p("995071", "fullbacks"),
          p("931540", "fullbacks"),
          p("358956", "fullbacks"),
          p("261687", "fullbacks"),
          p("243109", "fullbacks"),
          p("84854", "fullbacks"),
          p("840119", "fullbacks"),
          p("870556", "fullbacks"),
        ],
      },
    ],
  },
  {
    id: "midfielders",
    title: "Meio-campistas",
    subtitle: "Top 15 meio-campistas",
    description: "Os 15 meio-campistas com melhor perfil de passe no Brasileirão 2026.",
    accent: "#34d399",
    groups: [
      {
        players: [
          p("132874", "midfielders"),
          p("611876", "midfielders"),
          p("329303", "midfielders"),
          p("1067671", "midfielders"),
          p("840202", "midfielders"),
          p("285949", "midfielders"),
          p("263477", "midfielders"),
          p("77726", "midfielders"),
          p("356514", "midfielders"),
          p("590262", "midfielders"),
          p("794927", "midfielders"),
          p("988851", "midfielders"),
          p("559034", "midfielders"),
          p("1145106", "midfielders"),
          p("1104068", "midfielders"),
        ],
      },
    ],
  },
  {
    id: "wingers",
    title: "Extremos",
    subtitle: "Top 15 extremos",
    description: "Os 15 extremos com melhor perfil de passe no Brasileirão 2026.",
    accent: "#fbbf24",
    groups: [
      {
        players: [
          p("905453", "wingers"),
          p("981452", "wingers"),
          p("881110", "wingers"),
          p("844096", "wingers"),
          p("874739", "wingers"),
          p("145063", "wingers"),
          p("872007", "wingers"),
          p("840398", "wingers"),
          p("874705", "wingers"),
          p("1105970", "wingers"),
          p("1656036", "wingers"),
          p("1015935", "wingers"),
          p("840451", "wingers"),
          p("905461", "wingers"),
          p("354510", "wingers"),
        ],
      },
    ],
  },
];

export function allReportPlayerRefs(): ReportPlayerRef[] {
  const seen = new Set<string>();
  const out: ReportPlayerRef[] = [];
  for (const category of PLAYER_REPORT_CATEGORIES) {
    for (const group of category.groups) {
      for (const player of group.players) {
        if (seen.has(player.playerId)) continue;
        seen.add(player.playerId);
        out.push(player);
      }
    }
  }
  return out;
}

export function totalReportCount(): number {
  return allReportPlayerRefs().length;
}

export type EnrichedReportPlayer = ReportPlayerRef & {
  category: PlayerReportCategory;
  groupLabel?: string;
  categoryIndex: number;
};

export function enrichedReportPlayers(): EnrichedReportPlayer[] {
  const out: EnrichedReportPlayer[] = [];
  for (const category of PLAYER_REPORT_CATEGORIES) {
    let categoryIndex = 0;
    for (const group of category.groups) {
      for (const player of group.players) {
        categoryIndex += 1;
        out.push({
          ...player,
          category,
          groupLabel: group.label,
          categoryIndex,
        });
      }
    }
  }
  return out;
}

export function playerIdsForProfileGroup(groupId: string): Set<string> {
  if (groupId === PROFILE_ALL_GROUP.id) {
    return new Set(allReportPlayerRefs().map((p) => p.playerId));
  }
  const category = PLAYER_REPORT_CATEGORIES.find((cat) => cat.id === groupId);
  if (!category) return new Set();
  const ids = new Set<string>();
  for (const group of category.groups) {
    for (const player of group.players) {
      ids.add(player.playerId);
    }
  }
  return ids;
}

export function profileGroupCounts(
  players: { player_id?: string | number | null }[],
): Record<string, number> {
  const available = new Set(players.map((p) => String(p.player_id)));
  const counts: Record<string, number> = {
    [PROFILE_ALL_GROUP.id]: players.length,
  };
  for (const category of PLAYER_REPORT_CATEGORIES) {
    const ids = playerIdsForProfileGroup(category.id);
    counts[category.id] = [...ids].filter((id) => available.has(id)).length;
  }
  return counts;
}

export function positionFamilyForPlayer(playerId: string): PositionFamilyKey | undefined {
  for (const category of PLAYER_REPORT_CATEGORIES) {
    const ids = playerIdsForProfileGroup(category.id);
    if (ids.has(playerId)) return category.id as PositionFamilyKey;
  }
  return undefined;
}
