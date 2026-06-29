import assert from "node:assert/strict";
import { existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync, mkdirSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { describe, test } from "node:test";

import {
  buildUniversalBatchLifecycleMutationAuthorizationReviewV1,
  UNIVERSAL_BATCH_LIFECYCLE_MUTATION_AUTHORIZATION_REVIEW_CONTRACT_V1,
  UNIVERSAL_BATCH_LIFECYCLE_MUTATION_AUTHORIZATION_REVIEW_SOURCE_COMMAND_V1,
} from "./universal-batch-lifecycle-mutation-authorization-review-v1";
import { bindArtifactsAtHashesV1 } from "./truth-ledger-v1";

import { FRIDGE_RETAILER_LINKS_CSV_REL_V1 } from "./fridge-buyer-path-batch-apply-plan-proposal-v1";
import { FRIDGE_BUYER_PATH_BATCH_APPLY_PLAN_PROPOSAL_CONTRACT_V1 } from "./fridge-buyer-path-batch-apply-plan-proposal-v1";

const REPO_ROOT = process.cwd();
const EVIDENCE_SUFFICIENCY_SOURCE = readFileSync(
  path.join(
    REPO_ROOT,
    "scripts/lib/universal-batch-lifecycle-mutation-authorization-evidence-sufficiency-v1.ts",
  ),
  "utf8",
);
const LIB_SOURCE = readFileSync(
  path.join(REPO_ROOT, "scripts/lib/universal-batch-lifecycle-mutation-authorization-review-v1.ts"),
  "utf8",
);
const REPORT_SOURCE = readFileSync(
  path.join(
    REPO_ROOT,
    "scripts/report-universal-batch-lifecycle-mutation-authorization-review-v1.ts",
  ),
  "utf8",
);

const APPLY_PLAN_REL =
  "data/fridge/batch-production/apply-plans/fridge-buyer-path-batch-apply-plan-v1-0fec4a7b623a.json";
const EXEC_PLAN_REL =
  "data/fridge/batch-production/apply-execution-plans/fridge-buyer-path-batch-apply-execution-plan-v1-0fec4a7b623a.json";

const SLUGS = [
  "4396710",
  "4396841",
  "46-9002",
  "8171413",
  "da29-00019a",
  "da97-15217d",
  "edr1rxd1",
  "edr2rxd1",
  "lt1000p",
  "lt1000pc",
  "lt600p",
  "lt700p",
  "lt800p",
  "mdj64844601",
];

function primaryCsvRow(slug: string): string {
  return `${slug},OEM parts catalog (keyword lookup),https://www.whirlpoolparts.com/catalog.jsp?search=stw=&path=&searchKeyword=${slug},true,0,oem-parts-catalog,,,`;
}

function executionPlanRowPatch(slug: string): Record<string, unknown> {
  return {
    slug,
    filter_slug: slug,
    action: "propose_replace_search_placeholder_with_verified_direct_buyable",
    before_row: {
      filter_slug: slug,
      retailer_name: "OEM parts catalog (keyword lookup)",
      affiliate_url: `https://www.whirlpoolparts.com/catalog.jsp?search=stw=&path=&searchKeyword=${slug}`,
      is_primary: "true",
      sort_order: "0",
      retailer_key: "oem-parts-catalog",
      browser_truth_classification: "",
      browser_truth_notes: "",
      browser_truth_checked_at: "",
    },
    after_row: {
      filter_slug: slug,
      retailer_name: "Amazon",
      affiliate_url: "https://www.amazon.com/dp/B087PDLZL9?tag=buckparts20-20",
      is_primary: "true",
      sort_order: "0",
      retailer_key: "amazon",
      browser_truth_classification: "direct_buyable",
      browser_truth_notes: "preview",
      browser_truth_checked_at: "2026-05-04T12:00:00.000Z",
    },
    changed_fields: ["affiliate_url", "retailer_name", "retailer_key"],
  };
}

function fixtureExecutionPlan(): Record<string, unknown> {
  return {
    contract: "universal_batch_lifecycle_apply_execution_plan_v1",
    execution_plan_status: "READY_FOR_MUTATION_AUTH_REVIEW",
    planned_change_count: 14,
    target_file: FRIDGE_RETAILER_LINKS_CSV_REL_V1,
    row_patch_preview: SLUGS.map((slug) => executionPlanRowPatch(slug)),
    rollback_patch_preview: SLUGS.map((slug) => executionPlanRowPatch(slug)),
  };
}

function fixtureRegistryRow(ownerScope: "read_only_agent" | "owner_mutation_approved"): Record<string, unknown> {
  return {
    decision_id: `decision-${ownerScope}`,
    source_queue_row_id: "queue-lifecycle-mutation-auth-review-v1",
    source_decision_packet_id: `universal_batch_lifecycle_mutation_authorization_review_v1:${EXEC_PLAN_REL}`,
    decided_at: "2026-06-01T03:00:00.000Z",
    decision_status: ownerScope === "owner_mutation_approved" ? "approved" : "approved",
    owner_note: "Mutation authorization decision for lifecycle path.",
    allowed_next_scope: ownerScope,
    evidence_required_before_mutation: ownerScope === "owner_mutation_approved",
    prohibited_actions_still_apply: [
      "No Supabase writes in this review layer.",
      "No deploy in this review layer.",
    ],
  };
}

function sufficientEvidenceArtifact(slug: string, token?: string): Record<string, unknown> {
  const tokenLabel = token ?? slug;
  return {
    read_only: true,
    data_mutation: false,
    final_amazon_cta_state_proven: true,
    exact_token_proof: `Seller-controlled PDP title includes literal ${tokenLabel}.`,
    buyability_proof: "In Stock with Add to Cart and Buy Now visible on inspected PDP.",
    committed_live_row: {
      status: "approved",
      browser_truth_classification: "direct_buyable",
      browser_truth_notes: `${tokenLabel} appears on Amazon PDP ASIN B000TEST000; direct buyable evidence for ${slug}.`,
      affiliate_url: "https://www.amazon.com/dp/B000TEST000?tag=buckparts20-20",
    },
  };
}

function fixtureApplyPlan(args?: {
  slugs?: string[];
  evidenceBySlug?: Record<string, Record<string, unknown>>;
}): Record<string, unknown> {
  const slugs = args?.slugs ?? SLUGS;
  return {
    contract: FRIDGE_BUYER_PATH_BATCH_APPLY_PLAN_PROPOSAL_CONTRACT_V1,
    planned_change_count: slugs.length,
    planned_changes: slugs.map((slug) => ({
      slug,
      oem_token: slug,
      evidence_artifact_path: `data/evidence/amazon-${slug.toLowerCase()}-live-outcome.test-fixture.json`,
      proposed_affiliate_url: "https://www.amazon.com/dp/B000TEST000?tag=buckparts20-20",
      action: "propose_replace_search_placeholder_with_verified_direct_buyable",
      mutation_authorized: false,
    })),
  };
}

function writeApplyPlanAndEvidence(args: {
  root: string;
  slugs?: string[];
  evidenceBySlug?: Record<string, Record<string, unknown>>;
}) {
  const slugs = args.slugs ?? SLUGS;
  const applyPlanAbs = path.join(args.root, APPLY_PLAN_REL);
  mkdirSync(path.dirname(applyPlanAbs), { recursive: true });
  writeFileSync(applyPlanAbs, JSON.stringify(fixtureApplyPlan(args)), "utf8");

  for (const slug of slugs) {
    const rel = `data/evidence/amazon-${slug.toLowerCase()}-live-outcome.test-fixture.json`;
    const abs = path.join(args.root, rel);
    mkdirSync(path.dirname(abs), { recursive: true });
    writeFileSync(
      abs,
      JSON.stringify(args.evidenceBySlug?.[slug] ?? sufficientEvidenceArtifact(slug)),
      "utf8",
    );
  }
}

function writeTruthIntegrityRegistryFixture(root: string, referenceTime: Date): void {
  const dir = path.join(root, "data/truth-integrity");
  mkdirSync(dir, { recursive: true });
  const nextReAudit = new Date(referenceTime.getTime() + 365 * 24 * 60 * 60 * 1000).toISOString();
  writeFileSync(
    path.join(dir, "truth-integrity-registry-v1.json"),
    `${JSON.stringify(
      {
        contract: "truth_integrity_registry_v1",
        read_only: true,
        data_mutation: false,
        mutation_authorized: false,
        findings: [
          {
            finding_id: "fixture-truth-integrity",
            finding_code: "FIXTURE",
            title: "Fixture finding",
            status: "OPEN",
            severity: "high",
            truth_surface: "buy_path",
            summary: "fixture",
            proven_gap: "fixture",
            false_safety_risk: "fixture",
            smallest_safe_fix: "fixture",
            re_audit: {
              next_re_audit_after: nextReAudit,
              last_re_audit_at: referenceTime.toISOString(),
              cadence_days: 30,
              re_audit_owner: "test",
            },
            validation_commands: { prove_gap: ["npm test"] },
          },
        ],
      },
      null,
      2,
    )}\n`,
  );
}

function withTempFixture(args: {
  ownerScope?: "read_only_agent" | "owner_mutation_approved";
  slugs?: string[];
  evidenceBySlug?: Record<string, Record<string, unknown>>;
}) {
  const root = mkdtempSync(path.join(tmpdir(), "lifecycle-mutation-auth-review-"));
  writeApplyPlanAndEvidence({
    root,
    slugs: args.slugs,
    evidenceBySlug: args.evidenceBySlug,
  });
  const execAbs = path.join(root, EXEC_PLAN_REL);
  mkdirSync(path.dirname(execAbs), { recursive: true });
  writeFileSync(execAbs, JSON.stringify(fixtureExecutionPlan()), "utf8");

  const csvAbs = path.join(root, FRIDGE_RETAILER_LINKS_CSV_REL_V1);
  mkdirSync(path.dirname(csvAbs), { recursive: true });
  const header =
    "filter_slug,retailer_name,affiliate_url,is_primary,sort_order,retailer_key,browser_truth_classification,browser_truth_notes,browser_truth_checked_at\n";
  const body = SLUGS.map(primaryCsvRow).join("\n");
  writeFileSync(csvAbs, `${header}${body}\n`);

  const registryAbs = path.join(root, "data/owner-decisions/lifecycle-mutation-auth-v1.json");
  mkdirSync(path.dirname(registryAbs), { recursive: true });
  let rows: Record<string, unknown>[] = args.ownerScope ? [fixtureRegistryRow(args.ownerScope)] : [];
  if (args.ownerScope === "owner_mutation_approved" && rows[0]) {
    rows[0].bound_artifacts_v1 = bindArtifactsAtHashesV1({
      rootDir: root,
      artifacts: [
        { artifact_rel_path: APPLY_PLAN_REL, entry_type: "apply_plan" },
        { artifact_rel_path: EXEC_PLAN_REL, entry_type: "execution_plan" },
      ],
    });
  }
  writeFileSync(
    registryAbs,
    JSON.stringify({ contract: "founder_decision_registry_v1", read_only: true, data_mutation: false, rows }),
    "utf8",
  );
  writeTruthIntegrityRegistryFixture(root, new Date("2026-06-01T04:00:00.000Z"));

  return {
    root,
    cleanup: () => rmSync(root, { recursive: true, force: true }),
  };
}

describe("universal_batch_lifecycle_mutation_authorization_review_v1", () => {
  test("report is read-only and blocked without explicit owner_mutation_approved row", () => {
    const { root, cleanup } = withTempFixture({ ownerScope: "read_only_agent" });
    try {
      const report = buildUniversalBatchLifecycleMutationAuthorizationReviewV1({
        rootDir: root,
        now: () => new Date("2026-06-01T04:00:00.000Z"),
        applyReadiness: {
          apply_readiness_status: "PROVEN",
          source_apply_plan_artifact_rel_path: APPLY_PLAN_REL,
          planned_change_count: 14,
        },
        applyExecutionPlan: {
          execution_plan_status: "READY_FOR_MUTATION_AUTH_REVIEW",
          source_apply_plan_artifact_rel_path: APPLY_PLAN_REL,
          planned_change_count: 14,
        },
      });
      assert.equal(report.contract, UNIVERSAL_BATCH_LIFECYCLE_MUTATION_AUTHORIZATION_REVIEW_CONTRACT_V1);
      assert.equal(report.read_only, true);
      assert.equal(report.data_mutation, false);
      assert.equal(report.mutation_authorized, false);
      assert.equal(report.mutation_authorization_review_status, "BLOCKED");
      assert.equal(report.csv_apply_authorized, false);
      assert.equal(report.apply_executor_ready, true);
      assert.ok(
        report.review_blockers.some((b) => b.startsWith("missing_active_owner_mutation_approval:")),
      );
    } finally {
      cleanup();
    }
  });

  test("unbound owner_mutation_approved row fails closed", () => {
    const { root, cleanup } = withTempFixture({ ownerScope: "owner_mutation_approved" });
    try {
      const registryAbs = path.join(root, "data/owner-decisions/lifecycle-mutation-auth-v1.json");
      const doc = JSON.parse(readFileSync(registryAbs, "utf8")) as {
        rows: Array<Record<string, unknown>>;
      };
      delete doc.rows[0]?.bound_artifacts_v1;
      writeFileSync(registryAbs, JSON.stringify(doc), "utf8");

      const report = buildUniversalBatchLifecycleMutationAuthorizationReviewV1({
        rootDir: root,
        now: () => new Date("2026-06-01T04:00:00.000Z"),
        applyReadiness: {
          apply_readiness_status: "PROVEN",
          source_apply_plan_artifact_rel_path: APPLY_PLAN_REL,
          planned_change_count: 14,
        },
        applyExecutionPlan: {
          execution_plan_status: "READY_FOR_MUTATION_AUTH_REVIEW",
          source_apply_plan_artifact_rel_path: APPLY_PLAN_REL,
          planned_change_count: 14,
        },
      });
      assert.equal(report.mutation_authorized, false);
      assert.ok(
        report.review_blockers.some((b) => b.startsWith("missing_active_owner_mutation_approval:")),
      );
    } finally {
      cleanup();
    }
  });

  test("authorizes only when owner approval and evidence sufficiency both validate", () => {
    const { root, cleanup } = withTempFixture({ ownerScope: "owner_mutation_approved" });
    try {
      const report = buildUniversalBatchLifecycleMutationAuthorizationReviewV1({
        rootDir: root,
        now: () => new Date("2026-06-01T04:00:00.000Z"),
        applyReadiness: {
          apply_readiness_status: "PROVEN",
          source_apply_plan_artifact_rel_path: APPLY_PLAN_REL,
          planned_change_count: 14,
        },
        applyExecutionPlan: {
          execution_plan_status: "READY_FOR_MUTATION_AUTH_REVIEW",
          source_apply_plan_artifact_rel_path: APPLY_PLAN_REL,
          planned_change_count: 14,
        },
      });
      assert.equal(report.mutation_authorization_review_status, "MUTATION_AUTHORIZED_FOR_GUARDED_APPLY");
      assert.equal(report.mutation_authorized, true);
      assert.equal(report.apply_mutation_authorized, true);
      assert.equal(report.apply_executor_ready, true);
      assert.equal(report.evidence_sufficiency_status, "PROVEN");
      assert.equal(report.csv_apply_authorized, true);
      assert.equal(
        report.source_command,
        UNIVERSAL_BATCH_LIFECYCLE_MUTATION_AUTHORIZATION_REVIEW_SOURCE_COMMAND_V1,
      );
      assert.equal(report.review_blockers.length, 0);
      assert.ok(report.authorized_decision_id);
    } finally {
      cleanup();
    }
  });

  test("stays BLOCKED when owner approval exists but one row has insufficient evidence", () => {
    const { root, cleanup } = withTempFixture({
      ownerScope: "owner_mutation_approved",
      evidenceBySlug: {
        "4396710": {
          committed_live_row: {
            browser_truth_classification: "likely_valid",
          },
        },
      },
    });
    try {
      const report = buildUniversalBatchLifecycleMutationAuthorizationReviewV1({
        rootDir: root,
        now: () => new Date("2026-06-01T04:00:00.000Z"),
        applyReadiness: {
          apply_readiness_status: "PROVEN",
          source_apply_plan_artifact_rel_path: APPLY_PLAN_REL,
          planned_change_count: 14,
        },
        applyExecutionPlan: {
          execution_plan_status: "READY_FOR_MUTATION_AUTH_REVIEW",
          source_apply_plan_artifact_rel_path: APPLY_PLAN_REL,
          planned_change_count: 14,
        },
      });
      assert.equal(report.mutation_authorization_review_status, "BLOCKED");
      assert.equal(report.mutation_authorized, false);
      assert.equal(report.csv_apply_authorized, false);
      assert.ok(report.authorized_decision_id);
      assert.equal(report.evidence_sufficiency_status, "BLOCKED");
      assert.ok(report.evidence_sufficiency_counts.insufficient >= 1);
      assert.ok(
        report.review_blockers.some((b) =>
          b.startsWith("evidence_insufficient: slug=4396710"),
        ),
      );
    } finally {
      cleanup();
    }
  });

  test("lib/report avoid forbidden write/mutation imports", () => {
    assert.doesNotMatch(LIB_SOURCE, /@netlify|@supabase|insertLearningOutcome/);
    assert.doesNotMatch(LIB_SOURCE, /writeFileSync|writeFile\(|createWriteStream/);
    assert.doesNotMatch(REPORT_SOURCE, /@netlify|@supabase|insertLearningOutcome/);
    assert.doesNotMatch(EVIDENCE_SUFFICIENCY_SOURCE, /@netlify|@supabase|insertLearningOutcome/);
    assert.doesNotMatch(EVIDENCE_SUFFICIENCY_SOURCE, /writeFileSync|writeFile\(|createWriteStream/);
  });

  test("repo reports evidence sufficiency classifications for all 14 planned rows", () => {
    const report = buildUniversalBatchLifecycleMutationAuthorizationReviewV1({
      rootDir: REPO_ROOT,
      now: () => new Date("2026-06-01T05:00:00.000Z"),
      applyReadiness: {
        apply_readiness_status: "PROVEN",
        source_apply_plan_artifact_rel_path: APPLY_PLAN_REL,
        planned_change_count: 14,
      },
      applyExecutionPlan: {
        execution_plan_status: "READY_FOR_MUTATION_AUTH_REVIEW",
        source_apply_plan_artifact_rel_path: APPLY_PLAN_REL,
        planned_change_count: 14,
      },
      applyExecutionPlanArtifactRelPath: EXEC_PLAN_REL,
    });
    if (!report.apply_executor_ready) {
      assert.ok(
        report.review_blockers.some((b) => b.startsWith("apply_executor_not_ready:")),
        `expected executor blockers when repo csv/plan drift: ${report.review_blockers.join("; ")}`,
      );
      return;
    }
    assert.equal(report.evidence_sufficiency_status, "PROVEN");
    assert.equal(report.evidence_sufficiency_rows.length, 14);
    assert.equal(report.evidence_sufficiency_counts.total, 14);
    assert.ok(
      report.evidence_sufficiency_rows.every((row) =>
        ["STRUCTURED_PROVEN", "LEGACY_ACCEPTABLE", "INSUFFICIENT"].includes(row.status),
      ),
    );
  });

  test("repo mutation authorization review reflects lifecycle owner decision registry when present", () => {
    const ownerRegistryAbs = path.join(
      REPO_ROOT,
      "data/owner-decisions/lifecycle-mutation-authorization-review-v1.json",
    );
    const report = buildUniversalBatchLifecycleMutationAuthorizationReviewV1({
      rootDir: REPO_ROOT,
      now: () => new Date("2026-06-01T05:00:00.000Z"),
      applyReadiness: {
        apply_readiness_status: "PROVEN",
        source_apply_plan_artifact_rel_path: APPLY_PLAN_REL,
        planned_change_count: 14,
      },
      applyExecutionPlan: {
        execution_plan_status: "READY_FOR_MUTATION_AUTH_REVIEW",
        source_apply_plan_artifact_rel_path: APPLY_PLAN_REL,
        planned_change_count: 14,
      },
      applyExecutionPlanArtifactRelPath: EXEC_PLAN_REL,
    });
    if (!report.apply_executor_ready) {
      assert.equal(report.mutation_authorization_review_status, "BLOCKED");
      return;
    }
    if (existsSync(ownerRegistryAbs)) {
      if (report.mutation_authorized) {
        assert.equal(report.mutation_authorization_review_status, "MUTATION_AUTHORIZED_FOR_GUARDED_APPLY");
        assert.equal(report.mutation_authorized, true);
        assert.equal(report.csv_apply_authorized, true);
        assert.equal(report.review_blockers.length, 0);
        assert.ok(report.authorized_decision_id);
      } else {
        assert.equal(report.mutation_authorization_review_status, "BLOCKED");
        assert.equal(report.mutation_authorized, false);
        assert.ok(
          report.review_blockers.some((b) =>
            b.startsWith("missing_active_owner_mutation_approval:"),
          ),
        );
      }
    } else {
      assert.equal(report.mutation_authorization_review_status, "BLOCKED");
      assert.equal(report.mutation_authorized, false);
    }
  });
});
