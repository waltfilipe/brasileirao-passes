export type EuropeanLeagueKey =
  | "premier_league"
  | "italia_seriea"
  | "laliga"
  | "bundesliga"
  | "ligue1";

export type EuropeanLeague = {
  key: EuropeanLeagueKey;
  label: string;
  shortLabel: string;
  accent: string;
  logoUrl: string;
};

export const EUROPEAN_LEAGUES: EuropeanLeague[] = [
  {
    key: "premier_league",
    label: "Premier League",
    shortLabel: "PL",
    accent: "#a78bfa",
    logoUrl: "https://tmssl.akamaized.net/images/logo/normal/gb1.png",
  },
  {
    key: "laliga",
    label: "La Liga",
    shortLabel: "LL",
    accent: "#f87171",
    logoUrl: "https://tmssl.akamaized.net/images/logo/normal/es1.png",
  },
  {
    key: "italia_seriea",
    label: "Serie A",
    shortLabel: "SA",
    accent: "#38bdf8",
    logoUrl: "https://tmssl.akamaized.net/images/logo/normal/it1.png",
  },
  {
    key: "bundesliga",
    label: "Bundesliga",
    shortLabel: "BL",
    accent: "#fb7185",
    logoUrl: "https://tmssl.akamaized.net/images/logo/normal/l1.png",
  },
  {
    key: "ligue1",
    label: "Ligue 1",
    shortLabel: "L1",
    accent: "#60a5fa",
    logoUrl: "https://tmssl.akamaized.net/images/logo/normal/fr1.png",
  },
];

export const EUROPEAN_LEAGUE_BY_KEY = Object.fromEntries(
  EUROPEAN_LEAGUES.map((league) => [league.key, league]),
) as Record<EuropeanLeagueKey, EuropeanLeague>;
