import assert from "node:assert/strict";
import { mkdtempSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";

import {
  buildManufacturerBrowserProofBatchCommitAssistGuideMarkdownV1,
  buildOwnerBrowserProofResultFromVerdictSubmissionV1,
  commitManufacturerBrowserProofBatchV1,
  loadCommittedOwnerSessionPacketV1,
  parseManufacturerBrowserProofBatchCommitIntakeV1,
  writeManufacturerBrowserProofBatchCommitAssistArtifactsV1,
} from "./manufacturer-browser-proof-batch-commit-assist-v1";
import {
  FRIDGE_OWNER_BROWSER_PROOF_RESULT_CONTRACT_V1,
  validateOwnerBrowserProofResultV1,
} from "./fridge-safe-link-owner-browser-proof-result-v1";
import {
  MANUFACTURER_BROWSER_PROOF_EXECUTION_FACTORY_CONTRACT_V1,
  type ManufacturerBrowserProofOwnerSessionPacketV1,
} from "./manufacturer-browser-proof-execution-factory-v1";
import { manufacturerRescueOwnerProofArtifactRelForSlugV1 } from "./manufacturer-safe-link-rescue-owner-browser-proof-evidence-v1";

const REPO_ROOT = process.cwd();

function ownerSessionPacket(): ManufacturerBrowserProofOwnerSessionPacketV1 {
  return {
    contract: "manufacturer_browser_proof_owner_session_packet_v1",
    read_only: true,
    data_mutation: false,
    mutation_authorized: false,
    auto_pass_forbidden: true,
    browser_automation_authorized: false,
    batch_id: "refresh_batch_test-mfg",
    manufacturer_key: "test_manufacturer",
    slug_count: 1,
    session_slugs: [
      {
        session_order: 1,
        filter_slug: "testslug1",
        oem_part_token: "TEST1",
        manufacturer_key: "test_manufacturer",
        capture_strategy: "owner_browser_proof_session_assist",
        evidence_status: "MISSING",
        schedule_reasons: ["owner_browser_proof_artifact_missing"],
        refresh_priority: 100,
        live_buckparts_url: "https://buckparts.com/filter/testslug1",
        exact_urls: [
          {
            priority: 1,
            url: "https://example.com/official/testslug1",
            url_role: "official_target",
            notes: "test",
          },
        ],
        expected_evidence: {
          owner_proof_artifact_rel: null,
          owner_proof_checked_at: null,
          official_pass: false,
          freshness_notes: null,
        },
        required_screenshots: ["testslug1-official-pdp-full-page.png"],
        validation_checklist: ["Exact OEM part token visible."],
        pass_criteria: "Owner confirms exact token.",
        fail_criteria: ["Token mismatch."],
        auto_pass_forbidden: true,
        owner_verdict_options: [
          "PASS_BROWSER_PROOF",
          "FAIL_BROWSER_PROOF",
          "NEEDS_RECONCILIATION",
          "NO_SAFE_LINK_FOUND",
        ],
      },
    ],
    pre_session_checklist: ["Open session packet."],
    post_session_owner_action: "Record explicit owner verdict.",
  };
}

function writeExecutionFactory(root: string, packet: ManufacturerBrowserProofOwnerSessionPacketV1): void {
  const rel =
    "data/fridge/batch-production/drafts/manufacturer-browser-proof-execution-factory-v1.json";
  const abs = path.join(root, rel);
  mkdirSync(path.dirname(abs), { recursive: true });
  writeFileSync(
    abs,
    `${JSON.stringify({
      contract: MANUFACTURER_BROWSER_PROOF_EXECUTION_FACTORY_CONTRACT_V1,
      owner_session_packets: [packet],
    })}\n`,
    "utf8",
  );
}

test("guide markdown includes auto_pass_forbidden and slug checklist", () => {
  const packet = ownerSessionPacket();
  const md = buildManufacturerBrowserProofBatchCommitAssistGuideMarkdownV1({
    packet,
    intakeTemplateRel: "template.json",
  });
  assert.match(md, /auto_pass_forbidden: \*\*true\*\*/);
  assert.match(md, /testslug1/);
});

test("fail closed when per-slug owner_confirmed is not true", () => {
  const root = mkdtempSync(path.join(tmpdir(), "batch-commit-assist-fail-"));
  const packet = ownerSessionPacket();
  writeExecutionFactory(root, packet);
  const report = commitManufacturerBrowserProofBatchV1({
    rootDir: root,
    intake: {
      manufacturer_key: "test_manufacturer",
      owner_confirmed: true,
      auto_pass_forbidden_acknowledged: true,
      slug_verdicts: [
        {
          filter_slug: "testslug1",
          verdict: "PASS_BROWSER_PROOF",
          owner_confirmed: false as unknown as true,
          checked_at: "2026-06-26T12:00:00.000Z",
          owner_proof_urls: [
            {
              url: "https://example.com/official/testslug1",
              path_type: "official_manufacturer_pdp",
              browser_proof_status: "PASS",
            },
          ],
        },
      ],
    },
  });
  assert.equal(report.browser_proofs_refreshed[0]?.written, false);
  assert.match(report.browser_proofs_refreshed[0]?.validation_errors.join(" "), /owner_confirmed/);
});

test("valid owner PASS submission validates schema", () => {
  const packet = ownerSessionPacket();
  const submission = {
    filter_slug: "testslug1",
    verdict: "PASS_BROWSER_PROOF" as const,
    owner_confirmed: true as const,
    checked_at: "2026-06-26T12:00:00.000Z",
    owner_proof_urls: [
      {
        url: "https://example.com/official/testslug1",
        path_type: "official_manufacturer_pdp",
        browser_proof_status: "PASS",
      },
    ],
  };
  const artifact = buildOwnerBrowserProofResultFromVerdictSubmissionV1({
    submission,
    sessionRow: packet.session_slugs[0]!,
    manufacturerKey: packet.manufacturer_key,
    batchId: packet.batch_id,
  });
  const validation = validateOwnerBrowserProofResultV1(artifact);
  assert.equal(validation.valid, true);
  assert.equal(artifact.verdict, "PASS_BROWSER_PROOF");
  assert.notEqual(artifact.verdict, "AUTO_PASS");
});

test("dry-run validates without writing artifacts", () => {
  const root = mkdtempSync(path.join(tmpdir(), "batch-commit-assist-dry-"));
  const packet = ownerSessionPacket();
  writeExecutionFactory(root, packet);
  const report = commitManufacturerBrowserProofBatchV1({
    rootDir: root,
    intake: {
      manufacturer_key: "test_manufacturer",
      owner_confirmed: true,
      auto_pass_forbidden_acknowledged: true,
      slug_verdicts: [
        {
          filter_slug: "testslug1",
          verdict: "PASS_BROWSER_PROOF",
          owner_confirmed: true,
          checked_at: "2026-06-26T12:00:00.000Z",
          owner_proof_urls: [
            {
              url: "https://example.com/official/testslug1",
              path_type: "official_manufacturer_pdp",
              browser_proof_status: "PASS",
            },
          ],
        },
      ],
    },
    dryRun: true,
  });
  assert.equal(report.downstream_chain_ran, false);
  assert.equal(report.browser_proofs_refreshed[0]?.written, false);
  assert.equal(report.browser_proofs_refreshed[0]?.validation_errors.length, 0);
  const rel = manufacturerRescueOwnerProofArtifactRelForSlugV1("testslug1");
  assert.equal(existsSync(path.join(root, rel)), false);
});

test("loads committed everydrop session packet from live repo", () => {
  const packet = loadCommittedOwnerSessionPacketV1({
    rootDir: REPO_ROOT,
    manufacturerKey: "everydrop_whirlpool",
  });
  assert.ok(packet);
  assert.equal(packet.manufacturer_key, "everydrop_whirlpool");
  assert.ok(packet.session_slugs.length > 0);
});

test("guide artifacts write for live everydrop packet", () => {
  const packet = loadCommittedOwnerSessionPacketV1({
    rootDir: REPO_ROOT,
    manufacturerKey: "everydrop_whirlpool",
  });
  assert.ok(packet);
  const root = mkdtempSync(path.join(tmpdir(), "batch-commit-assist-guide-"));
  const written = writeManufacturerBrowserProofBatchCommitAssistArtifactsV1({
    rootDir: root,
    packet,
  });
  assert.ok(readFileSync(path.join(root, written.guideRelPath), "utf8").includes("everydrop_whirlpool"));
  const template = JSON.parse(readFileSync(path.join(root, written.intakeTemplateRelPath), "utf8")) as {
    owner_confirmed: boolean;
    auto_pass_forbidden_acknowledged: boolean;
  };
  assert.equal(template.owner_confirmed, true);
  assert.equal(template.auto_pass_forbidden_acknowledged, true);
});

test("parse intake rejects missing owner_confirmed", () => {
  assert.throws(
    () =>
      parseManufacturerBrowserProofBatchCommitIntakeV1({
        manufacturer_key: "test",
        auto_pass_forbidden_acknowledged: true,
        slug_verdicts: [],
      }),
    /owner_confirmed must be true/,
  );
});

function existsSync(p: string): boolean {
  try {
    readFileSync(p);
    return true;
  } catch {
    return false;
  }
}

test("dynamic owner proof rel resolves for non-legacy slug", () => {
  const rel = manufacturerRescueOwnerProofArtifactRelForSlugV1("testslug1");
  assert.equal(
    rel,
    "data/fridge/batch-production/drafts/fridge-safe-link-owner-browser-proof-result-testslug1-v1.json",
  );
});

test("never auto-writes PASS without intake commit call", () => {
  const root = mkdtempSync(path.join(tmpdir(), "batch-commit-assist-noauto-"));
  const packet = ownerSessionPacket();
  writeExecutionFactory(root, packet);
  const report = commitManufacturerBrowserProofBatchV1({
    rootDir: root,
    intake: {
      manufacturer_key: "test_manufacturer",
      owner_confirmed: true,
      auto_pass_forbidden_acknowledged: true,
      slug_verdicts: [],
    },
  });
  assert.equal(report.browser_proofs_refreshed.length, 0);
  assert.equal(report.downstream_chain_ran, false);
});
