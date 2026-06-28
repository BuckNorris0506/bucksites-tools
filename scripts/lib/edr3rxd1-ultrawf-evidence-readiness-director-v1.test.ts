import assert from "node:assert/strict";
import { describe, test } from "node:test";

import {
  buildCommittedEvidenceTodoPacketV1,
  buildEdr3rxd1UltrawfEvidenceReadinessDirectorReportV1,
  EDR3RXD1_ULTRAWF_EVIDENCE_READINESS_DIRECTOR_CONTRACT_V1,
  EDR3RXD1_ULTRAWF_PAIR_SLUGS_V1,
} from "./edr3rxd1-ultrawf-evidence-readiness-director-v1";
import type { OwnerBrowserProofResultV1 } from "./fridge-safe-link-owner-browser-proof-result-v1";

const REPO_ROOT = process.cwd();

function mockProof(slug: string): OwnerBrowserProofResultV1 {
  return {
    contract: "fridge_safe_link_owner_browser_proof_result_v1",
    slug,
    oem_part_token: slug.toUpperCase(),
    verdict: "PASS_BROWSER_PROOF",
    checked_at: "2026-06-09T12:00:00.000Z",
    owner_proof_urls: [
      {
        url: `https://example.com/${slug}`,
        browser_proof_status: "PASS",
        path_type: "official_manufacturer_pdp",
        proven_observations: [`PROVEN: token ${slug.toUpperCase()} on page.`],
      },
    ],
    not_authorized: ["VALIDATION_PASS"],
  };
}

describe("edr3rxd1 ultrawf evidence readiness director v1", () => {
  test("live report contract and pair slugs", async () => {
    const report = await buildEdr3rxd1UltrawfEvidenceReadinessDirectorReportV1({
      rootDir: REPO_ROOT,
    });
    assert.equal(report.contract, EDR3RXD1_ULTRAWF_EVIDENCE_READINESS_DIRECTOR_CONTRACT_V1);
    assert.equal(report.read_only, true);
    assert.equal(report.mutation_authorized, false);
    assert.equal(report.founder_approval_activation_authorized, false);
    assert.deepEqual(report.pair_slugs, EDR3RXD1_ULTRAWF_PAIR_SLUGS_V1);
    assert.equal(report.slug_audits.length, 2);
    assert.ok(
      report.slug_audits.every(
        (a) => a.guarded_apply_readiness.guarded_apply_candidate_after_committed_evidence_alone === false,
      ),
    );
  });

  test("committed evidence TODO does not authorize evidence write", () => {
    const todo = buildCommittedEvidenceTodoPacketV1({
      slug: "edr3rxd1",
      proof: mockProof("edr3rxd1"),
      proofRel: "data/fridge/batch-production/drafts/fridge-safe-link-owner-browser-proof-result-edr3rxd1-v1.json",
      now: () => new Date("2026-06-10T12:00:00.000Z"),
    });
    assert.equal(todo.evidence_write_authorized, false);
    assert.equal(todo.mutation_ready, false);
    assert.ok(todo.excluded_evidence_rel_paths.some((p) => p.includes("B087PDLZL9")));
    assert.ok(todo.observations_from_proof_only.length >= 1);
  });

  test("edr3rxd1 audit references PASS proof artifact", async () => {
    const report = await buildEdr3rxd1UltrawfEvidenceReadinessDirectorReportV1({
      rootDir: REPO_ROOT,
    });
    const edr = report.slug_audits.find((a) => a.slug === "edr3rxd1");
    assert.ok(edr);
    assert.equal(edr.owner_browser_proof_verdict, "PASS_BROWSER_PROOF");
    assert.ok(edr.committed_evidence_todo_rel_path?.includes("edr3rxd1-committed-evidence-todo"));
  });
});
