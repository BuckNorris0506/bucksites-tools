import assert from "node:assert/strict";
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { describe, test } from "node:test";

import { FRIDGE_OWNER_BROWSER_PROOF_RESULT_CONTRACT_V1 } from "./fridge-safe-link-owner-browser-proof-result-v1";
import {
  assessManufacturerRescueControlPlaneConvergenceV1,
  extractCommittedEvidenceDestinationUrlsV1,
  normalizeManufacturerRescueControlPlaneUrlV1,
} from "./manufacturer-rescue-control-plane-convergence-v1";
import {
  MANUFACTURER_SAFE_LINK_RESCUE_APPLY_PLAN_CONTRACT_V1,
} from "./manufacturer-safe-link-rescue-apply-plan-factory-v1";
import {
  MANUFACTURER_SAFE_LINK_RESCUE_ORCHESTRATOR_CONTRACT_V1,
} from "./manufacturer-safe-link-rescue-orchestrator-v1";
import {
  MANUFACTURER_SAFE_LINK_RESCUE_READINESS_GATE_CONTRACT_V1,
} from "./manufacturer-safe-link-rescue-readiness-gate-v1";
import {
  MANUFACTURER_SAFE_LINK_RESCUE_RUNNER_CONTRACT_V1,
} from "./manufacturer-safe-link-rescue-runner-v1";
import { bindArtifactsAtHashesV1 } from "./truth-ledger-v1";

const NOW = () => new Date("2026-06-29T12:00:00.000Z");
const DISTRIBUTOR_URL =
  "https://www.frigidaireapplianceparts.com/PartDetail/Water-Filter/ULTRAWF/1534529";
const BRAND_URL =
  "https://www.frigidaire.com/en/p/accessories/refrigerator-accessories/refrigerator-accessories-and-consumables/water-filters/ULTRAWF";

function readyChecks() {
  return [
    "browser_proof_exists",
    "browser_proof_fresh",
    "apply_plan_exists",
    "owner_approval_exists",
    "owner_apply_lane_eligible",
    "wrong_family_safe",
    "direct_buyable_exact_token_safe",
    "no_unresolved_blockers",
  ].map((check_id) => ({ check_id, status: "PASS" as const, notes: "test" }));
}

function writeJson(root: string, rel: string, doc: unknown): void {
  const abs = path.join(root, rel);
  mkdirSync(path.dirname(abs), { recursive: true });
  writeFileSync(abs, `${JSON.stringify(doc, null, 2)}\n`, "utf8");
}

function seedConvergedUltrawfFixtures(root: string, overrides?: {
  orchestratorUrl?: string;
  runnerSlug?: string | null;
  gateSlug?: string | null;
  classificationForbiddenDetected?: string[];
}): void {
  const slug = "ultrawf";
  const orchestratorUrl = overrides?.orchestratorUrl ?? DISTRIBUTOR_URL;
  const gateSlug = overrides && "gateSlug" in overrides ? overrides.gateSlug : slug;
  const runnerSlug = overrides && "runnerSlug" in overrides ? overrides.runnerSlug : slug;
  const generatedAt = NOW().toISOString();

  writeJson(root, "data/fridge/batch-production/drafts/manufacturer-safe-link-rescue-readiness-gate-v1.json", {
    contract: MANUFACTURER_SAFE_LINK_RESCUE_READINESS_GATE_CONTRACT_V1,
    read_only: true,
    data_mutation: false,
    mutation_authorized: false,
    csv_apply_authorized: false,
    generated_at: generatedAt,
    orchestrator_generated_at: generatedAt,
    ready_for_apply_slug: gateSlug,
    ready_for_apply_count: gateSlug ? 1 : 0,
    readiness_summary: {
      ready_for_apply_slugs: gateSlug ? [gateSlug] : [],
    },
    candidates: gateSlug
      ? [
          {
            filter_slug: gateSlug,
            manufacturer_key: "frigidaire",
            oem_part_token: "ULTRAWF",
            readiness_status: "READY_FOR_APPLY",
            ready_for_apply: true,
            checks: readyChecks(),
            blocking_reasons: [],
          },
        ]
      : [],
  });

  writeJson(root, "data/fridge/batch-production/drafts/manufacturer-safe-link-rescue-runner-v1.json", {
    contract: MANUFACTURER_SAFE_LINK_RESCUE_RUNNER_CONTRACT_V1,
    read_only: true,
    data_mutation: false,
    mutation_authorized: false,
    csv_apply_authorized: false,
    generated_at: generatedAt,
    ready_for_apply_slug: runnerSlug,
  });

  writeJson(root, "data/fridge/batch-production/drafts/manufacturer-safe-link-rescue-orchestrator-v1.json", {
    contract: MANUFACTURER_SAFE_LINK_RESCUE_ORCHESTRATOR_CONTRACT_V1,
    read_only: true,
    data_mutation: false,
    mutation_authorized: false,
    csv_apply_authorized: false,
    generated_at: generatedAt,
    unified_rescue_queue: [
      {
        filter_slug: slug,
        manufacturer_key: "frigidaire",
        oem_part_token: "ULTRAWF",
        browser_truth_status: "PASS",
        repo_proven_official_target_url: orchestratorUrl,
        blocked_reasons: [],
      },
    ],
  });

  writeJson(
    root,
    `data/fridge/batch-production/drafts/manufacturer-safe-link-rescue-apply-plan-${slug}-v1.json`,
    {
      contract: MANUFACTURER_SAFE_LINK_RESCUE_APPLY_PLAN_CONTRACT_V1,
      read_only: true,
      data_mutation: false,
      mutation_authorized: false,
      csv_apply_authorized: false,
      generated_at: generatedAt,
      filter_slug: slug,
      plan_status: "READY_FOR_OWNER_REVIEW",
      official_destination_url: DISTRIBUTOR_URL,
      proposed_csv_row: {
        filter_slug: slug,
        affiliate_url: DISTRIBUTOR_URL,
      },
      current_csv_row: {
        filter_slug: slug,
        affiliate_url: "https://www.frigidaire.com/en/catalogsearch/result/?q=ULTRAWF",
      },
    },
  );

  writeJson(root, "data/fridge/batch-production/drafts/fridge-safe-link-owner-browser-proof-result-ultrawf-v1.json", {
    contract: FRIDGE_OWNER_BROWSER_PROOF_RESULT_CONTRACT_V1,
    verdict: "PASS_BROWSER_PROOF",
    checked_at: "2026-06-28T12:00:00.000Z",
    slug,
    owner_proof_urls: [
      {
        url: DISTRIBUTOR_URL,
        path_type: "authorized_parts_distributor_pdp",
        browser_proof_status: "PASS",
      },
    ],
  });

  writeJson(root, "data/evidence/frigidaire-ultrawf-official-owner-browser-proof-evidence.2026-06-28.json", {
    verdict: "EXACT_PDP_PROVEN_FROM_OWNER_BROWSER",
    generated_at: "2026-06-28T12:00:00.000Z",
    product_attribution: "oem_official",
    primary_proof_track: {
      authorized_parts_distributor_url: DISTRIBUTOR_URL,
      canonical_url: BRAND_URL,
      path_type: "official_manufacturer_pdp",
    },
    confusion_family_review: {
      status: "CLEARED",
      forbidden_tokens_observed: [],
    },
  });

  const applyPlanRel = `data/fridge/batch-production/drafts/manufacturer-safe-link-rescue-apply-plan-${slug}-v1.json`;
  const evidenceRel =
    "data/evidence/frigidaire-ultrawf-official-owner-browser-proof-evidence.2026-06-28.json";
  const bound_artifacts_v1 = bindArtifactsAtHashesV1({
    rootDir: root,
    artifacts: [
      { artifact_rel_path: applyPlanRel, entry_type: "apply_plan" },
      { artifact_rel_path: evidenceRel, entry_type: "evidence" },
    ],
  });

  writeJson(root, "data/owner-decisions/fridge-safe-link-ultrawf-owner-approval-v1.json", {
    contract: "founder_decision_registry_v1",
    rows: [
      {
        decision_id: "decision-2026-06-29-ultrawf-approve_csv_manufacturer_rescue_apply",
        source_queue_row_id: "queue-fridge-safe-link-ultrawf-manufacturer-rescue",
        source_decision_packet_id: "fridge_safe_link_ultrawf_owner_classification_approval_packet_v1",
        decided_at: "2026-06-29T04:05:16.000Z",
        decision_status: "approved",
        owner_note: "Approve ultrawf only.",
        allowed_next_scope: "owner_mutation_approved",
        evidence_required_before_mutation: true,
        expires_at: "2027-06-01T00:00:00.000Z",
        prohibited_actions_still_apply: ["Do not batch apply other slugs without separate approval rows."],
        ultrawf_apply_context_v1: {
          apply_plan_rel_path: applyPlanRel,
          primary_evidence_rel_path: evidenceRel,
          owner_classification_packet_rel_path:
            "data/fridge/batch-production/drafts/fridge-safe-link-ultrawf-owner-classification-packet-v1.json",
          target_slug: slug,
          official_destination_url: DISTRIBUTOR_URL,
        },
        bound_artifacts_v1,
      },
    ],
  });

  writeJson(
    root,
    "data/fridge/batch-production/drafts/fridge-safe-link-ultrawf-owner-classification-packet-v1.json",
    {
      target_slug: slug,
      confusion_family_cleared: true,
      forbidden_tokens_detected_in_proof: overrides?.classificationForbiddenDetected ?? [],
      blocking_reasons: [],
    },
  );
}

describe("manufacturer-rescue-control-plane-convergence-v1", () => {
  test("converged ultrawf fixture passes all slug/url/founder checks", () => {
    const root = mkdtempSync(path.join(tmpdir(), "mfr-convergence-ok-"));
    try {
      seedConvergedUltrawfFixtures(root);
      const report = assessManufacturerRescueControlPlaneConvergenceV1({
        rootDir: root,
        bridge_target_slug: "ultrawf",
        now: NOW,
        fileExists: (abs) => existsSync(abs),
        readText: (abs) => readFileSync(abs, "utf8"),
      });
      assert.equal(report.convergence_status, "CONTROL_PLANE_CONVERGED", report.blockers.join("; "));
      assert.equal(report.guarded_apply_allowed, true);
      assert.equal(report.blockers.length, 0);
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });

  test("runner_ready_for_apply_slug_mismatch blocks convergence", () => {
    const root = mkdtempSync(path.join(tmpdir(), "mfr-convergence-runner-"));
    try {
      seedConvergedUltrawfFixtures(root, { runnerSlug: null });
      const report = assessManufacturerRescueControlPlaneConvergenceV1({
        rootDir: root,
        bridge_target_slug: "ultrawf",
        now: NOW,
        fileExists: (abs) => existsSync(abs),
        readText: (abs) => readFileSync(abs, "utf8"),
      });
      assert.equal(report.convergence_status, "BLOCKED");
      assert.ok(
        report.blockers.some((blocker) => blocker.includes("runner_ready_for_apply_slug_mismatch")),
      );
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });

  test("ultrawf URL mismatch between distributor apply plan and brand-site orchestrator blocks", () => {
    const root = mkdtempSync(path.join(tmpdir(), "mfr-convergence-url-"));
    try {
      seedConvergedUltrawfFixtures(root, { orchestratorUrl: BRAND_URL });
      const report = assessManufacturerRescueControlPlaneConvergenceV1({
        rootDir: root,
        bridge_target_slug: "ultrawf",
        now: NOW,
        fileExists: (abs) => existsSync(abs),
        readText: (abs) => readFileSync(abs, "utf8"),
      });
      assert.equal(report.convergence_status, "BLOCKED");
      assert.ok(
        report.blockers.some((blocker) => blocker.includes("apply_plan_orchestrator_url_mismatch")),
      );
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });

  test("substring founder approval false positive does not authorize ultrawf", () => {
    const root = mkdtempSync(path.join(tmpdir(), "mfr-convergence-founder-"));
    try {
      seedConvergedUltrawfFixtures(root);
      writeJson(root, "data/owner-decisions/fridge-safe-link-edr3rxd1-owner-approval-v1.json", {
        contract: "founder_decision_registry_v1",
        rows: [
          {
            decision_id: "decision-2026-06-28-edr3rxd1-approve_csv_manufacturer_rescue_apply",
            source_queue_row_id: "queue-fridge-safe-link-edr3rxd1-manufacturer-rescue",
            source_decision_packet_id: "fridge_safe_link_edr3rxd1_owner_classification_approval_packet_v1",
            decided_at: "2026-06-28T12:00:00.000Z",
            decision_status: "approved",
            owner_note: "Approve edr3rxd1 only.",
            allowed_next_scope: "owner_mutation_approved",
            evidence_required_before_mutation: true,
            expires_at: "2027-06-01T00:00:00.000Z",
            prohibited_actions_still_apply: ["Do not batch apply ultrawf without separate approval rows."],
            edr3rxd1_apply_context_v1: {
              target_slug: "edr3rxd1",
              apply_plan_rel_path:
                "data/fridge/batch-production/drafts/manufacturer-safe-link-rescue-apply-plan-edr3rxd1-v1.json",
            },
          },
        ],
      });

      const report = assessManufacturerRescueControlPlaneConvergenceV1({
        rootDir: root,
        bridge_target_slug: "ultrawf",
        now: NOW,
        fileExists: (abs) => existsSync(abs),
        readText: (abs) => readFileSync(abs, "utf8"),
      });
      assert.equal(report.convergence_status, "CONTROL_PLANE_CONVERGED", report.blockers.join("; "));
      assert.ok(!report.blockers.some((blocker) => blocker.includes("edr3rxd1")));
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });

  test("stale confusion_family_review_required after evidence CLEARED is suppressed not blocking", () => {
    const root = mkdtempSync(path.join(tmpdir(), "mfr-convergence-confusion-"));
    try {
      seedConvergedUltrawfFixtures(root);
      const orchestrator = JSON.parse(
        readFileSync(
          path.join(root, "data/fridge/batch-production/drafts/manufacturer-safe-link-rescue-orchestrator-v1.json"),
          "utf8",
        ),
      );
      orchestrator.unified_rescue_queue[0].blocked_reasons = ["confusion_family_review_required"];
      writeJson(
        root,
        "data/fridge/batch-production/drafts/manufacturer-safe-link-rescue-orchestrator-v1.json",
        orchestrator,
      );

      const report = assessManufacturerRescueControlPlaneConvergenceV1({
        rootDir: root,
        bridge_target_slug: "ultrawf",
        now: NOW,
        fileExists: (abs) => existsSync(abs),
        readText: (abs) => readFileSync(abs, "utf8"),
      });
      assert.equal(report.convergence_status, "CONTROL_PLANE_CONVERGED", report.blockers.join("; "));
      assert.ok(
        report.proven_facts.some((fact) => fact.includes("confusion_family_review_required suppressed")),
      );
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });

  test("stale classification forbidden token detection blocks when evidence cleared", () => {
    const root = mkdtempSync(path.join(tmpdir(), "mfr-convergence-classification-"));
    try {
      seedConvergedUltrawfFixtures(root, {
        classificationForbiddenDetected: ["EPTWFU01"],
      });
      const report = assessManufacturerRescueControlPlaneConvergenceV1({
        rootDir: root,
        bridge_target_slug: "ultrawf",
        now: NOW,
        fileExists: (abs) => existsSync(abs),
        readText: (abs) => readFileSync(abs, "utf8"),
      });
      assert.equal(report.convergence_status, "BLOCKED");
      assert.ok(
        report.blockers.includes("stale_classification_packet_forbidden_token_detection"),
      );
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });

  test("edr3rxd1 old aftermarket evidence cannot override official evidence destination", () => {
    const root = mkdtempSync(path.join(tmpdir(), "mfr-convergence-edr3-"));
    try {
      const officialUrl =
        "https://www.whirlpool.com/accessories/kitchen-accessories/refrigerator/p.ice-and-water-refrigerator-filter-3.edr3rxd1.html";
      writeJson(root, "data/evidence/amazon-edr3rxd1-aftermarket-pdp-evidence.2026-05-04.json", {
        verdict: "UNKNOWN",
        generated_at: "2026-05-04T18:10:00.000Z",
        product_attribution: "aftermarket_compatible",
        primary_proof_track: {
          canonical_url: "https://www.amazon.com/dp/B087PDLZL9",
        },
      });
      writeJson(
        root,
        "data/evidence/whirlpool-edr3rxd1-official-owner-browser-proof-evidence.2026-06-28.json",
        {
          verdict: "EXACT_PDP_PROVEN_FROM_OWNER_BROWSER",
          generated_at: "2026-06-28T12:00:00.000Z",
          product_attribution: "oem_official",
          excluded_evidence_rel_paths: [
            "data/evidence/amazon-edr3rxd1-aftermarket-pdp-evidence.2026-05-04.json",
          ],
          primary_proof_track: {
            canonical_url: officialUrl,
            path_type: "official_manufacturer_pdp",
          },
        },
      );

      const urls = extractCommittedEvidenceDestinationUrlsV1(
        JSON.parse(
          readFileSync(
            path.join(root, "data/evidence/whirlpool-edr3rxd1-official-owner-browser-proof-evidence.2026-06-28.json"),
            "utf8",
          ),
        ) as Record<string, unknown>,
      );
      assert.equal(
        urls[0],
        normalizeManufacturerRescueControlPlaneUrlV1(officialUrl),
      );
      assert.ok(!urls.some((url) => url.includes("amazon.com")));
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });
});
