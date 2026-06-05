#!/usr/bin/env node
/**
 * Read-only Cursor intake validation for fridge OWNER_BROWSER_PROOF_ASSIST (7-slug).
 * Writes data/fridge/batch-production/drafts/fridge-safe-link-owner-browser-proof-assist-cursor-validation-v1.json
 */

import { randomUUID } from "node:crypto";
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";

import { CURSOR_VALIDATION_PACKET_CONTRACT_V1 } from "./lib/buckparts-ops-agent-workflow-v1";
import {
  FRIDGE_OWNER_BROWSER_PROOF_ASSIST_BUNDLE_REL_V1,
  FRIDGE_OWNER_BROWSER_PROOF_ASSIST_COHORT_KEY_V1,
  FRIDGE_OWNER_BROWSER_PROOF_ASSIST_CURSOR_VALIDATION_REL_V1,
  FRIDGE_OWNER_BROWSER_PROOF_ASSIST_MISSION_TYPE_V1,
  FRIDGE_OWNER_BROWSER_PROOF_ASSIST_PROVENANCE_REL_V1,
  deriveOwnerBrowserProofAssistValidationStatusV1,
  runOwnerBrowserProofAssistValidationV1,
  type OwnerBrowserProofAssistBundleV1,
} from "./lib/fridge-safe-link-owner-browser-proof-assist-validation-v1";

const ROOT = process.cwd();
const BUNDLE_ARG = process.argv.find((a) => a.startsWith("--bundle="))?.slice("--bundle=".length);
const BUNDLE_REL = BUNDLE_ARG ?? FRIDGE_OWNER_BROWSER_PROOF_ASSIST_BUNDLE_REL_V1;
const OUT_REL = FRIDGE_OWNER_BROWSER_PROOF_ASSIST_CURSOR_VALIDATION_REL_V1;

function main(): void {
  const bundlePath = path.join(ROOT, BUNDLE_REL);
  if (!existsSync(bundlePath)) {
    console.error(JSON.stringify({ error: `Missing bundle at ${BUNDLE_REL}` }, null, 2));
    process.exit(1);
  }

  const bundle = JSON.parse(readFileSync(bundlePath, "utf8")) as OwnerBrowserProofAssistBundleV1;
  const result = runOwnerBrowserProofAssistValidationV1({ rootDir: ROOT, bundle });
  const validation_status = deriveOwnerBrowserProofAssistValidationStatusV1(result);

  const packet = {
    contract: CURSOR_VALIDATION_PACKET_CONTRACT_V1,
    validation_id: randomUUID(),
    mission_type: FRIDGE_OWNER_BROWSER_PROOF_ASSIST_MISSION_TYPE_V1,
    cohort_key: FRIDGE_OWNER_BROWSER_PROOF_ASSIST_COHORT_KEY_V1,
    bundle_id: bundle.bundle_id,
    manifest_id: bundle.manifest.manifest_id,
    validated_at: new Date().toISOString(),
    validation_status,
    read_only: true,
    data_mutation: false,
    mutation_authorized: false,
    verified_link_authorized: false,
    truth_closure_authorized: false,
    command_center_status_update_allowed: false,
    apply_planning_allowed: false,
    validation_scope: "owner_browser_proof_assist_bundle_intake_only",
    command_center_closure_implied: false,
    bundle_rel_path: BUNDLE_REL,
    provenance_rel_path: FRIDGE_OWNER_BROWSER_PROOF_ASSIST_PROVENANCE_REL_V1,
    commands_run: [
      "node --import tsx scripts/run-fridge-safe-link-owner-browser-proof-assist-cursor-validation-v1.ts",
      "validateOwnerBrowserProofAssistBundleIntegrityV1",
      "runOwnerBrowserProofAssistValidationV1",
    ],
    validation_details: {
      packet_count: bundle.packets.length,
      bundle_authentic: result.integrity.authentic,
      integrity_errors: result.integrity.errors,
      integrity_warnings: result.integrity.warnings,
      synthetic_packet_slugs: result.integrity.synthetic_packet_slugs,
      slug_verdicts: result.slug_verdicts,
      edr3_b087_excluded_as_oem: result.edr3_b087_excluded_as_oem,
      edr3_b087_in_do_not_use: result.edr3_b087_in_do_not_use,
      edr3_b087_in_urls_to_avoid_only: result.edr3_b087_in_urls_to_avoid_only,
      authorization_flags_all_false: result.authorization_flags_all_false,
    },
    proven_facts: [
      "PROVEN: validation is read_only; no CSV/Supabase/evidence mutation authorized",
      "PROVEN: independent 7-slug OWNER_BROWSER_PROOF_ASSIST path — not 14-slug SAFE_LINK_BROWSER_PROOF_BATCH",
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
        packet_count: bundle.packets.length,
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
