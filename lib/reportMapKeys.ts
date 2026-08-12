export const REPORT_MAP_FILTER_KEYS = [
  "report_progressive_origin",
  "report_progressive_dest",
  "report_impact_final_third",
] as const;

export type ReportMapFilterKey = (typeof REPORT_MAP_FILTER_KEYS)[number];
