import assert from "node:assert/strict";
import test from "node:test";

import { HOMEKEEP_WEDGE_CATALOG } from "@/lib/catalog/identity";

import { IO_CAPABILITY_READ_INDEX_CANNOT_MUTATE_SUPABASE_V1 } from "./buckparts-supabase-mutation-gate-core-v1";
import {
  assertSearchGapSupabaseWriteAuthorizedV1,
  buildSearchGapStatusMutationPreflightV1,
  mutationLaneForSearchGapWedgeV1,
  SEARCH_GAP_MUTATION_LANE_CLASSIFY_V1,
  SEARCH_GAP_MUTATION_LANE_STATUS_REFRIGERATOR_V1,
  SEARCH_GAP_STATUS_MUTATION_GATE_REF_V1,
  searchGapSupabaseMutationAuthorizedV1,
} from "./search-gap-status-mutation-gate-v1";

test("buildSearchGapStatusMutationPreflightV1 dry_run is read-only", () => {
  const preflight = buildSearchGapStatusMutationPreflightV1({
    mode: "dry_run",
    wedge: HOMEKEEP_WEDGE_CATALOG.refrigerator_water,
    operation: "status_update",
    io_capability: "MUTATION",
  });
  assert.equal(preflight.mutation_authorized, false);
  assert.equal(preflight.mutation_lane, SEARCH_GAP_MUTATION_LANE_STATUS_REFRIGERATOR_V1);
  assert.equal(preflight.mutationGateRef, SEARCH_GAP_STATUS_MUTATION_GATE_REF_V1);
  assert.equal(searchGapSupabaseMutationAuthorizedV1(preflight), false);
});

test("search_gaps write requires MUTATION io_capability", () => {
  const preflight = buildSearchGapStatusMutationPreflightV1({
    mode: "write",
    wedge: HOMEKEEP_WEDGE_CATALOG.air_purifier,
    operation: "status_update",
    io_capability: "READ_INDEX",
  });
  assert.equal(preflight.mutation_authorized, false);
  assert.ok(preflight.blockers.includes(IO_CAPABILITY_READ_INDEX_CANNOT_MUTATE_SUPABASE_V1));
  assert.throws(() => assertSearchGapSupabaseWriteAuthorizedV1(preflight));
});

test("classify lane uses all_wedges mutation_lane", () => {
  const preflight = buildSearchGapStatusMutationPreflightV1({
    mode: "write",
    wedge: "all_wedges",
    operation: "classify_likely_entity_type",
    io_capability: "MUTATION",
  });
  assert.equal(preflight.mutation_lane, SEARCH_GAP_MUTATION_LANE_CLASSIFY_V1);
  assert.equal(preflight.mutation_authorized, true);
  assert.doesNotThrow(() => assertSearchGapSupabaseWriteAuthorizedV1(preflight));
});

test("mutationLaneForSearchGapWedgeV1 maps refrigerator status lane", () => {
  assert.equal(
    mutationLaneForSearchGapWedgeV1(HOMEKEEP_WEDGE_CATALOG.refrigerator_water, "status_update"),
    SEARCH_GAP_MUTATION_LANE_STATUS_REFRIGERATOR_V1,
  );
});
