import assert from "node:assert/strict";
import test from "node:test";

import { HOMEKEEP_WEDGE_CATALOG } from "@/lib/catalog/identity";

import { IO_CAPABILITY_READ_INDEX_CANNOT_MUTATE_SUPABASE_V1 } from "./buckparts-supabase-mutation-gate-core-v1";
import {
  assertSearchGapStagedSupabaseWriteAuthorizedV1,
  buildSearchGapStagedMutationPreflightV1,
  mutationLaneForSearchGapStagedOperationV1,
  SEARCH_GAP_MUTATION_LANE_CANDIDATES_APPLY_V1,
  SEARCH_GAP_MUTATION_LANE_CANDIDATES_GENERATE_V1,
  SEARCH_GAP_MUTATION_LANE_STAGED_COMPAT_RESOLVE_REFRIGERATOR_V1,
  SEARCH_GAP_STAGED_MUTATION_GATE_REF_V1,
  searchGapStagedSupabaseMutationAuthorizedV1,
} from "./search-gap-staged-mutation-gate-v1";

test("buildSearchGapStagedMutationPreflightV1 dry_run is read-only", () => {
  const preflight = buildSearchGapStagedMutationPreflightV1({
    mode: "dry_run",
    operation: "candidate_generate",
    catalog_scope: "multi_catalog",
    io_capability: "MUTATION",
  });
  assert.equal(preflight.mutation_authorized, false);
  assert.equal(preflight.mutation_lane, SEARCH_GAP_MUTATION_LANE_CANDIDATES_GENERATE_V1);
  assert.equal(preflight.mutationGateRef, SEARCH_GAP_STAGED_MUTATION_GATE_REF_V1);
  assert.equal(searchGapStagedSupabaseMutationAuthorizedV1(preflight), false);
});

test("staged pipeline write requires MUTATION io_capability", () => {
  const preflight = buildSearchGapStagedMutationPreflightV1({
    mode: "write",
    operation: "candidate_apply_stage",
    catalog_scope: "multi_catalog",
    io_capability: "READ_INDEX",
  });
  assert.equal(preflight.mutation_lane, SEARCH_GAP_MUTATION_LANE_CANDIDATES_APPLY_V1);
  assert.equal(preflight.mutation_authorized, false);
  assert.ok(preflight.blockers.includes(IO_CAPABILITY_READ_INDEX_CANNOT_MUTATE_SUPABASE_V1));
  assert.throws(() => assertSearchGapStagedSupabaseWriteAuthorizedV1(preflight));
});

test("staged compat resolve write authorized with MUTATION", () => {
  const preflight = buildSearchGapStagedMutationPreflightV1({
    mode: "write",
    operation: "staged_compat_resolve",
    catalog_scope: HOMEKEEP_WEDGE_CATALOG.refrigerator_water,
    io_capability: "MUTATION",
  });
  assert.equal(preflight.mutation_lane, SEARCH_GAP_MUTATION_LANE_STAGED_COMPAT_RESOLVE_REFRIGERATOR_V1);
  assert.equal(preflight.mutation_authorized, true);
  assert.doesNotThrow(() => assertSearchGapStagedSupabaseWriteAuthorizedV1(preflight));
});

test("mutationLaneForSearchGapStagedOperationV1 maps candidate_generate lane", () => {
  assert.equal(
    mutationLaneForSearchGapStagedOperationV1("candidate_generate"),
    SEARCH_GAP_MUTATION_LANE_CANDIDATES_GENERATE_V1,
  );
});
