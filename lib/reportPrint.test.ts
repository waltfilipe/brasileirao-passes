import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { REPORT_MAP_FILTER_KEYS } from "./reportMapKeys.ts";
import {
  REPORT_MAPS_PER_PLAYER,
  REPORT_PAGES_PER_PLAYER,
  sheetsPerPrintJob,
} from "./reportPrint.ts";

describe("reportPrint", () => {
  it("expects two pages per player", () => {
    assert.equal(REPORT_PAGES_PER_PLAYER, 2);
    assert.equal(sheetsPerPrintJob(3), 6);
    assert.equal(sheetsPerPrintJob(0), 0);
  });

  it("expects the report map trio used by Reports and Compare", () => {
    assert.equal(REPORT_MAPS_PER_PLAYER, 3);
    assert.deepEqual([...REPORT_MAP_FILTER_KEYS], [
      "report_progressive_origin",
      "report_progressive_dest",
      "report_impact_final_third",
    ]);
  });
});
