import assert from "node:assert/strict";
import { existsSync, readFileSync, statSync } from "node:fs";
import path from "node:path";
import test from "node:test";

import { getVerticalLaunchState, isVerticalLive } from "@/lib/catalog/vertical-launch-state";
import {
  AIR_PURIFIER_TRUTH_SPINE_CONTRACT_V1,
  apCommittedCsvSafeFilterSlugsViaGatesV1,
  buildAirPurifierTruthSpineV1,
} from "./air-purifier-truth-spine-v1";
import { buildPublicWedgeReadinessAndEasiestWinsV1 } from "./public-wedge-readiness-and-easiest-wins-v1";
import { HOMEKEEP_WEDGE_CATALOG } from "@/lib/catalog/identity";

const REPO_ROOT = process.cwd();

const FORBIDDEN_MUTATION_PATHS = [
  "data/air-purifier/retailer_links.csv",
  "data/air-purifier/filters.csv",
  "src/lib/catalog/vertical-launch-state.ts",
  "src/lib/retailers/launch-buy-links.ts",
  "src/lib/data/air-purifier/filters.ts",
  "src/lib/data/air-purifier/models.ts",
  "src/app/air-purifier/page.tsx",
];

function snapshotMtimes(paths: string[]): Map<string, number> {
  const map = new Map<string, number>();
  for (const rel of paths) {
    const abs = path.join(REPO_ROOT, rel);
    if (existsSync(abs)) map.set(rel, statSync(abs).mtimeMs);
  }
  return map;
}

test("air_purifier_truth_spine_v1 is read_only with data_mutation false", () => {
  const spine = buildAirPurifierTruthSpineV1({ rootDir: REPO_ROOT });
  assert.equal(spine.contract, AIR_PURIFIER_TRUTH_SPINE_CONTRACT_V1);
  assert.equal(spine.read_only, true);
  assert.equal(spine.data_mutation, false);
  assert.equal(spine.formal_spine_status, "PROVEN");
  assert.equal(spine.ap_public_but_spine_gap_resolved, true);
});

test("AP is LIVE/public from repo launch state", () => {
  assert.equal(getVerticalLaunchState("air-purifier"), "LIVE");
  assert.equal(isVerticalLive("air-purifier"), true);
  const spine = buildAirPurifierTruthSpineV1({ rootDir: REPO_ROOT });
  assert.equal(spine.public_launch_state, "LIVE");
  assert.equal(spine.public_indexing_status, "INDEXABLE_LIVE");
});

test("AP safe_cta_count is derived from committed CSV not invented", () => {
  const spine = buildAirPurifierTruthSpineV1({ rootDir: REPO_ROOT });
  const readiness = buildPublicWedgeReadinessAndEasiestWinsV1({ rootDir: REPO_ROOT });
  const apRow = readiness.wedge_rows.find((r) => r.wedge === HOMEKEEP_WEDGE_CATALOG.air_purifier);
  assert.ok(apRow);
  assert.equal(spine.safe_cta_count, apRow!.safe_cta_count);
  assert.ok(spine.safe_cta_count > 0);
  assert.equal(spine.safe_filter_slugs.length, spine.safe_filter_slug_count);
  const viaGates = apCommittedCsvSafeFilterSlugsViaGatesV1(REPO_ROOT);
  assert.deepEqual(spine.safe_filter_slugs, viaGates);
});

test("AP data boundary uses filterRealBuyRetailerLinks", () => {
  const spine = buildAirPurifierTruthSpineV1({ rootDir: REPO_ROOT });
  assert.equal(spine.buy_gate_boundary_status, "PROVEN");
  assert.ok(spine.buy_gate_boundary_sources.includes("src/lib/data/air-purifier/filters.ts"));
  assert.ok(spine.buy_gate_boundary_sources.includes("src/lib/data/air-purifier/models.ts"));
  for (const rel of spine.buy_gate_boundary_sources) {
    const src = readFileSync(path.join(REPO_ROOT, rel), "utf8");
    assert.ok(src.includes("filterRealBuyRetailerLinks"));
  }
});

test("AP truth spine does not claim all filters verified", () => {
  const spine = buildAirPurifierTruthSpineV1({ rootDir: REPO_ROOT });
  assert.equal(spine.all_filters_verified_claim, false);
  if (Array.isArray(spine.unsafe_or_unknown_filter_slugs)) {
    assert.ok(spine.unsafe_or_unknown_filter_slugs.length > 0);
    assert.ok(spine.safe_filter_slugs.length < spine.catalog_counts.mapped_filter_slug_count);
  }
  assert.ok(
    spine.proven_facts.some((f) => f.includes("all_filters_verified_claim=false")),
  );
});

test("AP truth spine does not authorize unsafe CSV/Supabase/public mutation", () => {
  const spine = buildAirPurifierTruthSpineV1({ rootDir: REPO_ROOT });
  const action = spine.recommended_next_action.toLowerCase();
  assert.equal(action.includes("authorized apply"), false);
  assert.equal(action.includes("supabase mutation"), false);
  assert.ok(spine.proven_facts.some((f) => f.includes("does not authorize")));
});

test("read-only AP truth spine build does not mutate forbidden paths", () => {
  const csvBefore = readFileSync(
    path.join(REPO_ROOT, "data/air-purifier/retailer_links.csv"),
    "utf8",
  );
  const mtimesBefore = snapshotMtimes(FORBIDDEN_MUTATION_PATHS);

  buildAirPurifierTruthSpineV1({ rootDir: REPO_ROOT });

  assert.equal(
    readFileSync(path.join(REPO_ROOT, "data/air-purifier/retailer_links.csv"), "utf8"),
    csvBefore,
  );
  for (const [p, mtime] of mtimesBefore) {
    assert.equal(statSync(path.join(REPO_ROOT, p)).mtimeMs, mtime, `${p} mtime changed`);
  }
});
