import assert from "node:assert/strict";
import { existsSync, mkdirSync, readFileSync, rmSync, symlinkSync, writeFileSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";

import {
  FOUNDER_DECISION_REGISTRY_MODEL_FIRST_EVIDENCE_RESULT_WRITE_SCOPE_V1,
  isFounderRegistryRowActiveMutationApproval,
  validateFounderDecisionRegistryDocumentV1,
} from "@/lib/owner-dashboard/founder-decision-registry-v1";
import { founderRegistryRowPassesMutationApprovalGateV1 } from "@/lib/owner-dashboard/founder-mutation-approval-gate-v1";

import {
  AP_MODEL_FIRST_EVIDENCE_QUEUE_CONTRACT_V1,
  AP_MODEL_FIRST_EVIDENCE_PACKETS_DIR_REL_V1,
  type ApModelFirstEvidenceQueueReportV1,
} from "./ap-model-first-evidence-queue-v1";
import {
  AP_MODEL_FIRST_EVIDENCE_RESULT_WRITE_GRANT_REL_V1,
  loadRatifiedModelFirstEvidenceResultWriteGrantRowV1,
  modelFirstEvidenceResultRelPathForAnchorV1,
  writeTopCandidateModelFirstEvidenceResultIfGrantActiveV1,
} from "./ap-model-first-evidence-result-write-from-queue-v1";
import {
  AP_MODEL_FIRST_EVIDENCE_RESULTS_DIR_REL_V1,
  isAllowedModelFirstEvidenceResultRelPathV1,
  validateModelFirstEvidenceResultV1,
} from "./air-purifier-model-first-evidence-result-v1";

const REPO_ROOT = process.cwd();
const NOW = new Date("2026-08-16T04:00:00.000Z");
const NOW_ISO = NOW.toISOString();
const LIVE_GRANT_REL = AP_MODEL_FIRST_EVIDENCE_RESULT_WRITE_GRANT_REL_V1;

function liveGrantDoc(): Record<string, unknown> {
  return JSON.parse(readFileSync(path.join(REPO_ROOT, LIVE_GRANT_REL), "utf8")) as Record<
    string,
    unknown
  >;
}

function withGrantRow(
  overrides: Record<string, unknown>,
): Record<string, unknown> {
  const doc = liveGrantDoc();
  const rows = doc.rows as Array<Record<string, unknown>>;
  return { ...doc, rows: [{ ...rows[0], ...overrides }] };
}

function readyQueue(anchorFilterSlug = "holmes-hapf30"): ApModelFirstEvidenceQueueReportV1 {
  return {
    contract: AP_MODEL_FIRST_EVIDENCE_QUEUE_CONTRACT_V1,
    read_only: true,
    data_mutation: false,
    generated_at: NOW_ISO,
    source_status: "PROVEN",
    queue_status: "READY",
    candidate_count: 1,
    merged_candidate_count: 1,
    top_candidates: [
      {
        filter_slug: anchorFilterSlug,
        brand_slug: "holmes",
        model_count_using_filter: 5,
        buyer_path_weakness_class: "SEARCH_PLACEHOLDER_PRIMARY",
        evidence_priority_score: 99,
        sample_model_slugs: ["holmes-hap412bcs"],
        sample_model_numbers: ["HAP412BCS"],
        intended_evidence_path:
          "official model/support/manual page → documented replacement filter/part → verified safe buyer path (read-only browser proof; no CSV apply)",
        do_not_claim_unavailable: true,
      },
    ],
    completed_no_mutation_candidates: [],
    mapping_review_opportunities: [],
    result_history: {
      completed_result_count: 0,
      completed_filter_slugs: [],
      no_mutation_completed_filter_slugs: [],
      mapping_review_required_filter_slugs: [],
      invalid_result_files: [],
    },
    recommended_packet: {
      packet_id: "ap-model-first-evidence-proposed-v1",
      read_only: true,
      anchor_filter_slug: anchorFilterSlug,
      anchor_brand_slug: "holmes",
      anchor_model_slugs: ["holmes-hap412bcs"],
      evidence_path:
        "official model/support/manual page → documented replacement filter/part → verified safe buyer path (read-only browser proof; no CSV apply)",
      artifacts_not_written_yet: true,
    },
    why_model_first: "test",
    old_filter_first_drift_risk: "test",
    forbidden_mutations: [],
    steering_primary_eligible: true,
    demoted_batch_subsystem: null,
    proven_facts: [],
    unknown_facts: [],
  };
}

function makeTempRoot(grantDoc: unknown): string {
  const tmp = path.join(os.tmpdir(), `ap-mf-write-${process.pid}-${Date.now()}-${Math.random()}`);
  mkdirSync(path.join(tmp, "data/owner-decisions"), { recursive: true });
  mkdirSync(path.join(tmp, "data/air-purifier/batch-production/agent-results-model-first-v1"), {
    recursive: true,
  });
  writeFileSync(
    path.join(tmp, AP_MODEL_FIRST_EVIDENCE_RESULT_WRITE_GRANT_REL_V1),
    `${JSON.stringify(grantDoc, null, 2)}\n`,
    "utf8",
  );
  for (const name of [
    "models.csv",
    "filters.csv",
    "retailer_links.csv",
    "compatibility_mappings.csv",
  ]) {
    symlinkSync(path.join(REPO_ROOT, "data/air-purifier", name), path.join(tmp, "data/air-purifier", name));
  }
  return tmp;
}

test("live ratified grant is active for evidence-result write and not mutation", () => {
  const loaded = loadRatifiedModelFirstEvidenceResultWriteGrantRowV1({
    rootDir: REPO_ROOT,
    nowIso: NOW_ISO,
  });
  assert.equal(loaded.active, true);
  assert.ok(loaded.row);
  assert.equal(
    loaded.row!.allowed_next_scope,
    FOUNDER_DECISION_REGISTRY_MODEL_FIRST_EVIDENCE_RESULT_WRITE_SCOPE_V1,
  );
  assert.equal(isFounderRegistryRowActiveMutationApproval(loaded.row!, NOW_ISO), false);
  const gate = founderRegistryRowPassesMutationApprovalGateV1({
    row: loaded.row!,
    referenceTimeIso: NOW_ISO,
    rootDir: REPO_ROOT,
  });
  assert.equal(gate.ok, false);
});

test("inactive, expired, and wrong-scope grants do not write", () => {
  const cases: Array<{ doc: unknown; reason: string }> = [
    {
      doc: withGrantRow({ decision_status: "deferred" }),
      reason: "grant_not_approved_or_inactive",
    },
    {
      doc: withGrantRow({
        decided_at: "2026-06-01T00:00:00.000Z",
        expires_at: "2026-08-01T00:00:00.000Z",
        review_after: "2026-08-01T00:00:00.000Z",
      }),
      reason: "grant_expired",
    },
    {
      doc: withGrantRow({ allowed_next_scope: "read_only_agent", evidence_required_before_mutation: false }),
      reason: "grant_scope_not_evidence_result_write",
    },
  ];
  for (const c of cases) {
    const tmp = makeTempRoot(c.doc);
    try {
      const outcome = writeTopCandidateModelFirstEvidenceResultIfGrantActiveV1({
        rootDir: tmp,
        queue: readyQueue(),
        now: () => NOW,
      });
      assert.equal(outcome.wrote, false, c.reason);
      assert.equal(outcome.blocked_reason, c.reason);
      assert.equal(outcome.packets_written, false);
      const rel = modelFirstEvidenceResultRelPathForAnchorV1("holmes-hapf30");
      assert.equal(existsSync(path.join(tmp, rel)), false);
      assert.equal(existsSync(path.join(tmp, AP_MODEL_FIRST_EVIDENCE_PACKETS_DIR_REL_V1)), false);
    } finally {
      rmSync(tmp, { recursive: true, force: true });
    }
  }
});

test("READY queue with no top candidate does not write", () => {
  const tmp = makeTempRoot(liveGrantDoc());
  try {
    const queue = readyQueue();
    queue.top_candidates = [];
    queue.candidate_count = 0;
    const outcome = writeTopCandidateModelFirstEvidenceResultIfGrantActiveV1({
      rootDir: tmp,
      queue,
      now: () => NOW,
    });
    assert.equal(outcome.wrote, false);
    assert.equal(outcome.blocked_reason, "no_valid_top_candidate");
  } finally {
    rmSync(tmp, { recursive: true, force: true });
  }
});

test("non-READY queue does not write even with an active grant", () => {
  const tmp = makeTempRoot(liveGrantDoc());
  try {
    const queue = readyQueue();
    queue.queue_status = "BLOCKED";
    const outcome = writeTopCandidateModelFirstEvidenceResultIfGrantActiveV1({
      rootDir: tmp,
      queue,
      now: () => NOW,
    });
    assert.equal(outcome.wrote, false);
    assert.equal(outcome.blocked_reason, "queue_not_ready");
    assert.equal(outcome.grant_active, true);
  } finally {
    rmSync(tmp, { recursive: true, force: true });
  }
});

test("disallowed result path fails closed", () => {
  const tmp = makeTempRoot(liveGrantDoc());
  try {
    const outcome = writeTopCandidateModelFirstEvidenceResultIfGrantActiveV1({
      rootDir: tmp,
      queue: readyQueue("foo/../escape"),
      now: () => NOW,
    });
    assert.equal(outcome.wrote, false);
    assert.equal(outcome.blocked_reason, "result_path_not_allowed");
    assert.equal(isAllowedModelFirstEvidenceResultRelPathV1(outcome.result_rel ?? ""), false);
    assert.equal(existsSync(path.join(tmp, AP_MODEL_FIRST_EVIDENCE_PACKETS_DIR_REL_V1)), false);
  } finally {
    rmSync(tmp, { recursive: true, force: true });
  }
});

test("decoy grant in another owner-decisions file is ignored", () => {
  const tmp = makeTempRoot(withGrantRow({ decision_status: "deferred" }));
  try {
    writeFileSync(
      path.join(tmp, "data/owner-decisions/decoy-active-evidence-write.json"),
      `${JSON.stringify(liveGrantDoc(), null, 2)}\n`,
      "utf8",
    );
    const outcome = writeTopCandidateModelFirstEvidenceResultIfGrantActiveV1({
      rootDir: tmp,
      queue: readyQueue(),
      now: () => NOW,
    });
    assert.equal(outcome.wrote, false);
    assert.equal(outcome.blocked_reason, "grant_not_approved_or_inactive");
  } finally {
    rmSync(tmp, { recursive: true, force: true });
  }
});

test("active grant + READY + top candidate writes only the allowed result path", () => {
  const tmp = makeTempRoot(liveGrantDoc());
  const csvBefore = {
    models: readFileSync(path.join(REPO_ROOT, "data/air-purifier/models.csv"), "utf8"),
    filters: readFileSync(path.join(REPO_ROOT, "data/air-purifier/filters.csv"), "utf8"),
    links: readFileSync(path.join(REPO_ROOT, "data/air-purifier/retailer_links.csv"), "utf8"),
    compat: readFileSync(path.join(REPO_ROOT, "data/air-purifier/compatibility_mappings.csv"), "utf8"),
  };
  try {
    const outcome = writeTopCandidateModelFirstEvidenceResultIfGrantActiveV1({
      rootDir: tmp,
      queue: readyQueue("holmes-hapf30"),
      now: () => NOW,
    });
    assert.equal(outcome.wrote, true);
    assert.equal(outcome.blocked_reason, null);
    assert.equal(outcome.grant_active, true);
    assert.equal(outcome.grant_mutation_approval_active, false);
    assert.equal(outcome.anchor_filter_slug, "holmes-hapf30");
    assert.equal(
      outcome.result_rel,
      `${AP_MODEL_FIRST_EVIDENCE_RESULTS_DIR_REL_V1}/ap-model-first-holmes-hapf30-v1.results.json`,
    );
    assert.equal(isAllowedModelFirstEvidenceResultRelPathV1(outcome.result_rel!), true);
    const abs = path.join(tmp, outcome.result_rel!);
    assert.equal(existsSync(abs), true);
    const parsed: unknown = JSON.parse(readFileSync(abs, "utf8"));
    assert.equal(validateModelFirstEvidenceResultV1(parsed), true);
    assert.equal(existsSync(path.join(tmp, AP_MODEL_FIRST_EVIDENCE_PACKETS_DIR_REL_V1)), false);
    assert.equal(readFileSync(path.join(tmp, "data/air-purifier/models.csv"), "utf8"), csvBefore.models);
    assert.equal(readFileSync(path.join(tmp, "data/air-purifier/filters.csv"), "utf8"), csvBefore.filters);
    assert.equal(readFileSync(path.join(tmp, "data/air-purifier/retailer_links.csv"), "utf8"), csvBefore.links);
    assert.equal(
      readFileSync(path.join(tmp, "data/air-purifier/compatibility_mappings.csv"), "utf8"),
      csvBefore.compat,
    );
    const grantDoc = validateFounderDecisionRegistryDocumentV1(
      JSON.parse(readFileSync(path.join(tmp, LIVE_GRANT_REL), "utf8")),
    );
    assert.equal(grantDoc.ok, true);
    if (grantDoc.ok) {
      assert.equal(isFounderRegistryRowActiveMutationApproval(grantDoc.doc.rows[0]!, NOW_ISO), false);
    }
  } finally {
    rmSync(tmp, { recursive: true, force: true });
  }
});
