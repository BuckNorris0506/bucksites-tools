import assert from "node:assert/strict";
import test from "node:test";

import {
  buildFrigidaireCandidateTargets,
  buildFrigidaireOemDirectPdpCandidatesReport,
} from "./discover-frigidaire-oem-direct-pdp-candidates";

test("marks UNKNOWN when only search-style URLs are present", () => {
  const targets = buildFrigidaireCandidateTargets([
    "https://www.frigidaire.com/en/catalogsearch/result/?q=242017801",
    "https://www.frigidaire.com/en/catalogsearch/result/?q=242086201",
    "https://www.frigidaire.com/en/catalogsearch/result/?q=242294502",
    "https://www.frigidaire.com/en/catalogsearch/result/?q=EPTWFU01",
    "https://www.frigidaire.com/en/catalogsearch/result/?q=FPPWFU01",
  ]);
  assert.equal(targets.length, 5);
  for (const t of targets) {
    assert.equal(t.proof_status, "UNKNOWN");
    assert.equal(t.candidate_url, "UNKNOWN");
    assert.notEqual(t.current_search_url, "UNKNOWN");
  }
});

test("marks PROVEN_FROM_REPO when direct URL with token exists", () => {
  const targets = buildFrigidaireCandidateTargets([
    "https://www.frigidaire.com/en/catalogsearch/result/?q=242017801",
    "https://www.frigidaire.com/en-us/part/242017801",
  ]);
  const tokenRow = targets.find((t) => t.token === "242017801");
  assert.ok(tokenRow);
  assert.equal(tokenRow?.proof_status, "PROVEN_FROM_REPO");
  assert.equal(tokenRow?.candidate_url, "https://www.frigidaire.com/en-us/part/242017801");
});

test("report preserves read-only flags and all-unknown action", () => {
  const csv = `slug,retailer_name,affiliate_url,is_oem,priority,retailer_key\nfrig-242017801,OEM parts catalog (keyword lookup),https://www.frigidaire.com/en/catalogsearch/result/?q=242017801,true,0,oem-parts-catalog\n`;
  const report = buildFrigidaireOemDirectPdpCandidatesReport({
    retailerLinksCsvText: csv,
    now: () => new Date("2026-04-29T00:00:00.000Z"),
  });
  assert.equal(report.read_only, true);
  assert.equal(report.data_mutation, false);
  assert.equal(report.targets.length, 5);
  assert.equal(
    report.recommended_next_action.includes("All target tokens remain UNKNOWN from repo-only proof"),
    true,
  );
});

