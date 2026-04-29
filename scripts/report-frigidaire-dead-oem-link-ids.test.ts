import assert from "node:assert/strict";
import test from "node:test";

import { buildFrigidaireDeadOemLinkIdsReport } from "./report-frigidaire-dead-oem-link-ids";

test("report is read_only true and data_mutation false", async () => {
  const report = await buildFrigidaireDeadOemLinkIdsReport({
    fetchRows: async () => [],
  });
  assert.equal(report.read_only, true);
  assert.equal(report.data_mutation, false);
});

test("resolves all 5 target link ids when rows exist", async () => {
  const report = await buildFrigidaireDeadOemLinkIdsReport({
    now: () => new Date("2026-04-29T00:00:00.000Z"),
    fetchRows: async () => [
      {
        id: "id-1",
        affiliate_url: "https://www.frigidaire.com/en/catalogsearch/result/?q=242017801",
        browser_truth_classification: "likely_not_found",
      },
      {
        id: "id-2",
        affiliate_url: "https://www.frigidaire.com/en/catalogsearch/result/?q=242086201",
        browser_truth_classification: "likely_not_found",
      },
      {
        id: "id-3",
        affiliate_url: "https://www.frigidaire.com/en/catalogsearch/result/?q=242294502",
        browser_truth_classification: "likely_not_found",
      },
      {
        id: "id-4",
        affiliate_url: "https://www.frigidaire.com/en/catalogsearch/result/?q=EPTWFU01",
        browser_truth_classification: "likely_not_found",
      },
      {
        id: "id-5",
        affiliate_url: "https://www.frigidaire.com/en/catalogsearch/result/?q=FPPWFU01",
        browser_truth_classification: "likely_not_found",
      },
    ],
  });

  assert.equal(report.targets.length, 5);
  assert.equal(report.all_resolved, true);
  assert.equal(report.known_unknowns.length, 0);
  assert.equal(report.targets.every((target) => target.found), true);
  assert.deepEqual(
    report.targets.map((target) => target.link_id),
    ["id-1", "id-2", "id-3", "id-4", "id-5"],
  );
});

test("missing rows are UNKNOWN and known_unknowns are populated", async () => {
  const report = await buildFrigidaireDeadOemLinkIdsReport({
    fetchRows: async () => [
      {
        id: "id-1",
        affiliate_url: "https://www.frigidaire.com/en/catalogsearch/result/?q=242017801",
        browser_truth_classification: "likely_not_found",
      },
    ],
  });
  assert.equal(report.targets.length, 5);
  assert.equal(report.all_resolved, false);
  assert.equal(report.known_unknowns.length, 4);
  const unresolved = report.targets.filter((target) => target.link_id === "UNKNOWN");
  assert.equal(unresolved.length, 4);
  assert.equal(unresolved.every((target) => target.found === false), true);
});

test("query failure returns UNKNOWN payload", async () => {
  const report = await buildFrigidaireDeadOemLinkIdsReport({
    fetchRows: async () => {
      throw new Error("db unavailable");
    },
  });
  assert.equal(report.targets.length, 5);
  assert.equal(report.all_resolved, false);
  assert.equal(report.targets.every((target) => target.link_id === "UNKNOWN"), true);
  assert.equal(report.targets.every((target) => target.found === false), true);
  assert.equal(report.known_unknowns.length > 0, true);
});

