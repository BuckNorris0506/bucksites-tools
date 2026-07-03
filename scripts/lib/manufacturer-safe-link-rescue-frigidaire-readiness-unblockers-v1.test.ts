import assert from "node:assert/strict";
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";

import type { OwnerBrowserProofResultV1 } from "./fridge-safe-link-owner-browser-proof-result-v1";
import type { ManufacturerRescueOrchestratorQueueRowV1 } from "./manufacturer-safe-link-rescue-orchestrator-v1";
import {
  filterFrigidaireOrchestratorBlockedReasonsV1,
  findFrigidaireCommittedOfficialEvidenceRelV1,
  resolveFrigidaireOwnerApplyLaneEligibleV1,
} from "./manufacturer-safe-link-rescue-frigidaire-readiness-unblockers-v1";

const REPO_ROOT = process.cwd();
const NOW = () => new Date("2026-07-03T18:00:00.000Z");

function writeJson(root: string, rel: string, doc: unknown): void {
  const abs = path.join(root, rel);
  mkdirSync(path.dirname(abs), { recursive: true });
  writeFileSync(abs, JSON.stringify(doc, null, 2));
}

function ultrawfQueueRow(
  overrides: Partial<ManufacturerRescueOrchestratorQueueRowV1> = {},
): ManufacturerRescueOrchestratorQueueRowV1 {
  return {
    filter_slug: "ultrawf",
    manufacturer_key: "frigidaire",
    oem_part_token: "ULTRAWF",
    cohort_lane: "RESCUE",
    in_fridge_rescue_queue: true,
    rescue_queue_rank: 1,
    census_rescue_priority_score: 100,
    orchestrator_priority_score: 900,
    expected_safe_coverage_signal: 200,
    existing_evidence_score: 10,
    browser_ready_state: "READY",
    owner_review_readiness: "READY",
    browser_truth_status: "PASS",
    repo_proven_official_target_url:
      "https://www.frigidaireapplianceparts.com/PartDetail/Water-Filter/ULTRAWF/1534529",
    adapter_discovery_url:
      "https://www.frigidaireapplianceparts.com/PartDetail/Water-Filter/ULTRAWF/1534529",
    adapter_discovery_provenance: "INFERRED",
    csv_primary_is_search_placeholder: true,
    blocked_reasons: ["confusion_family_review_required"],
    recommended_next_action: "owner review",
    orchestrator_rank: 1,
    coverage_unlocked: false,
    ...overrides,
  };
}

function liveUltrawfProof(): OwnerBrowserProofResultV1 {
  const rel =
    "data/fridge/batch-production/drafts/fridge-safe-link-owner-browser-proof-result-ultrawf-v1.json";
  return JSON.parse(readFileSync(path.join(REPO_ROOT, rel), "utf8")) as OwnerBrowserProofResultV1;
}

test("live ultrawf committed official evidence is discoverable", () => {
  const rel = findFrigidaireCommittedOfficialEvidenceRelV1({
    rootDir: REPO_ROOT,
    filterSlug: "ultrawf",
    fileExists: existsSync,
    readText: (abs) => readFileSync(abs, "utf8"),
  });
  assert.equal(
    rel,
    "data/evidence/frigidaire-ultrawf-official-owner-browser-proof-evidence.2026-07-03.json",
  );
});

test("stale confusion_family_review_required is suppressed only when clearance is proven", () => {
  const suppressed = filterFrigidaireOrchestratorBlockedReasonsV1({
    adapterBlockers: ["confusion_family_review_required", "mutation_authorized=false"],
    rootDir: REPO_ROOT,
    filterSlug: "ultrawf",
    fileExists: existsSync,
    readText: (abs) => readFileSync(abs, "utf8"),
  });
  assert.deepEqual(suppressed, []);

  const root = mkdtempSync(path.join(tmpdir(), "frigidaire-clearance-missing-"));
  try {
    writeJson(root, "data/evidence/.keep.json", { keep: true });
    const kept = filterFrigidaireOrchestratorBlockedReasonsV1({
      adapterBlockers: ["confusion_family_review_required"],
      rootDir: root,
      filterSlug: "ultrawf",
      fileExists: existsSync,
      readText: (abs) => readFileSync(abs, "utf8"),
    });
    assert.deepEqual(kept, ["confusion_family_review_required"]);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test("frigidaire lane eligible only when all truth gates pass", () => {
  const applyPlanRel =
    "data/fridge/batch-production/drafts/manufacturer-safe-link-rescue-apply-plan-ultrawf-v1.json";
  const eligible = resolveFrigidaireOwnerApplyLaneEligibleV1({
    rootDir: REPO_ROOT,
    row: ultrawfQueueRow(),
    ownerProof: liveUltrawfProof(),
    applyPlanRel,
    ownerApprovalAccepted: true,
    fileExists: existsSync,
    readText: (abs) => readFileSync(abs, "utf8"),
    now: NOW,
  });
  assert.equal(eligible.eligible, true);

  const noApproval = resolveFrigidaireOwnerApplyLaneEligibleV1({
    rootDir: REPO_ROOT,
    row: ultrawfQueueRow(),
    ownerProof: liveUltrawfProof(),
    applyPlanRel,
    ownerApprovalAccepted: false,
    fileExists: existsSync,
    readText: (abs) => readFileSync(abs, "utf8"),
    now: NOW,
  });
  assert.equal(noApproval.eligible, false);
  assert.match(noApproval.source_note, /owner_mutation_approved/i);
});

test("frigidaire lane remains blocked for confusion-family slug without clearance", () => {
  const root = mkdtempSync(path.join(tmpdir(), "frigidaire-lane-no-clearance-"));
  try {
    const applyPlanRel =
      "data/fridge/batch-production/drafts/manufacturer-safe-link-rescue-apply-plan-ultrawf-v1.json";
    writeJson(root, applyPlanRel, {
      contract: "manufacturer_safe_link_rescue_apply_plan_v1",
      plan_status: "READY_FOR_OWNER_REVIEW",
    });
    writeJson(root, "data/evidence/frigidaire-ultrawf-official-owner-browser-proof-evidence.2026-07-03.json", {
      filter_slug: "ultrawf",
      verdict: "EXACT_PDP_PROVEN_FROM_OWNER_BROWSER",
      product_attribution: "oem_official",
      primary_proof_track: { path_type: "authorized_parts_distributor_pdp" },
    });
    const result = resolveFrigidaireOwnerApplyLaneEligibleV1({
      rootDir: root,
      row: ultrawfQueueRow(),
      ownerProof: liveUltrawfProof(),
      applyPlanRel,
      ownerApprovalAccepted: true,
      fileExists: existsSync,
      readText: (abs) => readFileSync(abs, "utf8"),
      now: NOW,
    });
    assert.equal(result.eligible, false);
    assert.match(result.source_note, /confusion-family/i);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});
