import assert from "node:assert/strict";
import { describe, test } from "node:test";

import {
  classifyOwnerBrowserProofFreshnessClassV1,
  discoverOwnerBrowserProofArtifactsV1,
  groupOwnerBrowserProofRefreshSessionsV1,
  OWNER_BROWSER_PROOF_PREFERRED_SESSION_BUNDLES_V1,
  OWNER_BROWSER_PROOF_REFRESH_DIRECTOR_CONTRACT_V1,
  buildOwnerBrowserProofRefreshDirectorReportV1,
} from "./owner-browser-proof-refresh-director-v1";

const REPO_ROOT = process.cwd();

describe("owner browser proof refresh director v1", () => {
  test("freshness classification bands", () => {
    assert.equal(
      classifyOwnerBrowserProofFreshnessClassV1({
        has_artifact: false,
        checked_at: null,
        age_days: "UNKNOWN",
        max_age_days: 14,
      }),
      "MISSING",
    );
    assert.equal(
      classifyOwnerBrowserProofFreshnessClassV1({
        has_artifact: true,
        checked_at: "2026-06-01T00:00:00.000Z",
        age_days: 5,
        max_age_days: 14,
        expiring_soon_window_days: 3,
      }),
      "FRESH",
    );
    assert.equal(
      classifyOwnerBrowserProofFreshnessClassV1({
        has_artifact: true,
        checked_at: "2026-05-28T00:00:00.000Z",
        age_days: 12,
        max_age_days: 14,
        expiring_soon_window_days: 3,
      }),
      "EXPIRING_SOON",
    );
    assert.equal(
      classifyOwnerBrowserProofFreshnessClassV1({
        has_artifact: true,
        checked_at: "2026-05-01T00:00:00.000Z",
        age_days: 20,
        max_age_days: 14,
      }),
      "STALE",
    );
  });

  test("discovers fridge owner-browser-proof result artifacts", () => {
    const discovered = discoverOwnerBrowserProofArtifactsV1(REPO_ROOT);
    assert.ok(discovered.length >= 6);
    assert.ok(
      discovered.some((a) => a.slug === "edr3rxd1" && a.artifact_kind === "fridge_safe_link_owner_browser_proof_result"),
    );
  });

  test("groups preferred hyperagent pair session first", () => {
    const queue = [
      {
        rank: 1,
        slug: "edr3rxd1",
        freshness_class: "STALE" as const,
        refresh_priority_score: 200,
        expected_safe_buyer_path_proven_delta: 1 as const,
        evidence_gap_count: 4,
        production_priority_score: 1184,
        wedge: "refrigerator_water",
        manufacturer_key: "everydrop_whirlpool",
        model_compatibility_mapping_count: 10,
        census_page_classification: "SAFE_BUYER_PATH_SUPPRESSED_TRUST",
        hyperagent_cohort_member: true,
        primary_artifact_rel_path: "x",
        refresh_rationale: "stale",
        recommended_session_command: "cmd",
      },
      {
        rank: 2,
        slug: "ultrawf",
        freshness_class: "STALE" as const,
        refresh_priority_score: 190,
        expected_safe_buyer_path_proven_delta: 1 as const,
        evidence_gap_count: 4,
        production_priority_score: 1105,
        wedge: "refrigerator_water",
        manufacturer_key: "frigidaire",
        model_compatibility_mapping_count: 8,
        census_page_classification: "SAFE_BUYER_PATH_SUPPRESSED_TRUST",
        hyperagent_cohort_member: true,
        primary_artifact_rel_path: "y",
        refresh_rationale: "stale",
        recommended_session_command: "cmd",
      },
    ];
    const sessions = groupOwnerBrowserProofRefreshSessionsV1({
      queue,
      preferredBundles: OWNER_BROWSER_PROOF_PREFERRED_SESSION_BUNDLES_V1,
    });
    assert.equal(sessions[0]!.session_id, "session_1_hyperagent_evidence_pair");
    assert.deepEqual(sessions[0]!.target_slugs, ["edr3rxd1", "ultrawf"]);
    assert.equal(sessions[0]!.expected_safe_buyer_path_proven_delta, 2);
  });

  test("live report contract and read-only flags", async () => {
    const report = await buildOwnerBrowserProofRefreshDirectorReportV1({ rootDir: REPO_ROOT });
    assert.equal(report.contract, OWNER_BROWSER_PROOF_REFRESH_DIRECTOR_CONTRACT_V1);
    assert.equal(report.read_only, true);
    assert.equal(report.auto_pass_forbidden, true);
    assert.equal(report.evidence_regeneration_authorized, false);
    assert.ok(report.artifacts_discovered_count >= 6);
    assert.ok(report.ranked_refresh_queue.length >= 1);
    const edr = report.inventory.find((r) => r.slug === "edr3rxd1");
    assert.ok(edr);
    assert.equal(edr.freshness_class, "STALE");
  });
});
