#!/usr/bin/env node
/**
 * Read-only Cursor validation for fridge SAFE_LINK_BROWSER_PROOF_BATCH (14-slug).
 * Writes data/fridge/batch-production/drafts/fridge-safe-link-owner-browser-proof-cursor-validation-v1.json
 */

import { randomUUID } from "node:crypto";
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";

import {
  CURSOR_VALIDATION_PACKET_CONTRACT_V1,
  CURSOR_VALIDATION_FAILURE_FULL_PACKET_BODIES_REQUIRED,
} from "./lib/buckparts-ops-agent-workflow-v1";
import {
  FRIDGE_OWNER_BROWSER_PROOF_BATCH_BUNDLE_REL_V1,
  FRIDGE_OWNER_BROWSER_PROOF_BATCH_COHORT_KEY_V1,
  FRIDGE_OWNER_BROWSER_PROOF_BATCH_MISSION_TYPE_V1,
  FRIDGE_OWNER_BROWSER_PROOF_CURSOR_VALIDATION_REL_V1,
  FRIDGE_OWNER_BROWSER_PROOF_BATCH_PROVENANCE_REL_V1,
  deriveOwnerBrowserProofValidationStatusV1,
  runOwnerBrowserProofBatchValidationV1,
  type OwnerBrowserProofBatchBundleV1,
} from "./lib/fridge-safe-link-owner-browser-proof-batch-validation-v1";

const ROOT = process.cwd();
const BUNDLE_ARG = process.argv.find((a) => a.startsWith("--bundle="))?.slice("--bundle=".length);
const BUNDLE_REL = BUNDLE_ARG ?? FRIDGE_OWNER_BROWSER_PROOF_BATCH_BUNDLE_REL_V1;
const OUT_REL = FRIDGE_OWNER_BROWSER_PROOF_CURSOR_VALIDATION_REL_V1;

function main(): void {
  const bundlePath = path.join(ROOT, BUNDLE_REL);
  if (!existsSync(bundlePath)) {
    console.error(JSON.stringify({ error: `Missing bundle at ${BUNDLE_REL}` }, null, 2));
    process.exit(1);
  }

  const bundle = JSON.parse(readFileSync(bundlePath, "utf8")) as OwnerBrowserProofBatchBundleV1;
  const result = runOwnerBrowserProofBatchValidationV1({ rootDir: ROOT, bundle });
  const validation_status = deriveOwnerBrowserProofValidationStatusV1(result);
  const truth_closure_authorized = false;
  const command_center_status_update_allowed = false;
  const apply_planning_allowed = false;

  const packet = {
    contract: CURSOR_VALIDATION_PACKET_CONTRACT_V1,
    validation_id: randomUUID(),
    mission_type: FRIDGE_OWNER_BROWSER_PROOF_BATCH_MISSION_TYPE_V1,
    cohort_key: FRIDGE_OWNER_BROWSER_PROOF_BATCH_COHORT_KEY_V1,
    bundle_id: bundle.bundle_id,
    manifest_id: bundle.manifest.manifest_id,
    validated_at: new Date().toISOString(),
    validation_status,
    failure_code: result.integrity.authentic
      ? null
      : result.integrity.failure_code ?? CURSOR_VALIDATION_FAILURE_FULL_PACKET_BODIES_REQUIRED,
    commands_run: [
      "node --import tsx scripts/run-fridge-safe-link-owner-browser-proof-cursor-validation-v1.ts",
      "validateOwnerBrowserProofBatchIntegrityV1",
      "runOwnerBrowserProofBatchValidationV1",
    ],
    bundle_rel_path: BUNDLE_REL,
    provenance_rel_path: FRIDGE_OWNER_BROWSER_PROOF_BATCH_PROVENANCE_REL_V1,
    validation_scope: "owner_browser_proof_discovery_validation_only",
    command_center_closure_implied: false,
    truth_closure_authorized,
    command_center_status_update_allowed,
    verified_link_authorized: false,
    read_only: true,
    data_mutation: false,
    mutation_authorized: false,
    validation_details: {
      packet_count: bundle.packet_count,
      bundle_authentic: result.integrity.authentic,
      integrity_errors: result.integrity.errors,
      synthetic_packet_slugs: result.integrity.synthetic_packet_slugs,
      slug_verdicts: result.slug_verdicts,
      candidate_url_verdicts: result.candidate_url_verdicts,
      strongest_owner_browser_proof_candidates: result.strongest_owner_browser_proof_candidates,
      rejected_or_risky_candidates: result.rejected_or_risky_candidates,
      edr3_b087_excluded_as_oem: result.edr3_b087_excluded_as_oem,
      edr3_b087_present_as_aftermarket_only: result.edr3_b087_present_as_aftermarket_only,
      purepour_remains_blocked: result.purepour_remains_blocked,
      frig_242086201_remains_blocked: result.frig_242086201_remains_blocked,
      discrepancies: result.discrepancies,
      apply_planning_allowed,
    },
    proven_facts: [
      "PROVEN: validation is read_only; no CSV/Supabase/evidence mutation authorized",
      "PROVEN: independent 14-slug SAFE_LINK_BROWSER_PROOF_BATCH path — not 26-slug SAFE_LINK_BATCH proof",
      ...result.proven_facts,
    ],
    unknown_facts: result.unknown_facts,
    doctrine_doc: "docs/BuckParts-OPS-AGENT-WORKFLOW-V1.md",
  };

  writeFileSync(path.join(ROOT, OUT_REL), `${JSON.stringify(packet, null, 2)}\n`);
  console.log(
    JSON.stringify(
      {
        validation_status,
        validation_id: packet.validation_id,
        packet_count: bundle.packet_count,
        bundle_authentic: result.integrity.authentic,
        output: OUT_REL,
      },
      null,
      2,
    ),
  );

  if (validation_status === "VALIDATION_FAIL") process.exit(1);
}

main();
