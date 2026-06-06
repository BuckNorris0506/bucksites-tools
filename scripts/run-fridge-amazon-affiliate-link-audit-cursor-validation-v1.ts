#!/usr/bin/env node
/**
 * Read-only Cursor intake validation for fridge AMAZON_AFFILIATE_LINK_AUDIT_DISCOVERY (7-slug).
 * Writes data/fridge/batch-production/drafts/fridge-amazon-affiliate-link-audit-cursor-validation-v1.json
 */

import { randomUUID } from "node:crypto";
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";

import { CURSOR_VALIDATION_PACKET_CONTRACT_V1 } from "./lib/buckparts-ops-agent-workflow-v1";
import {
  FRIDGE_AMAZON_AFFILIATE_LINK_AUDIT_BUNDLE_REL_V1,
  FRIDGE_AMAZON_AFFILIATE_LINK_AUDIT_COHORT_KEY_V1,
  FRIDGE_AMAZON_AFFILIATE_LINK_AUDIT_CURSOR_VALIDATION_REL_V1,
  FRIDGE_AMAZON_AFFILIATE_LINK_AUDIT_MISSION_TYPE_V1,
  FRIDGE_AMAZON_AFFILIATE_LINK_AUDIT_PROVENANCE_REL_V1,
  deriveAmazonAffiliateLinkAuditValidationStatusV1,
  loadAmazonAffiliateLinkAuditAssistBundleV1,
  runAmazonAffiliateLinkAuditValidationV1,
  snapshotAmazonAffiliateLinkAuditProtectedPathsV1,
  type AmazonAffiliateLinkAuditAssistBundleV1,
} from "./lib/fridge-amazon-affiliate-link-audit-validation-v1";

const ROOT = process.cwd();
const BUNDLE_ARG = process.argv.find((a) => a.startsWith("--bundle="))?.slice("--bundle=".length);
const BUNDLE_REL = BUNDLE_ARG ?? FRIDGE_AMAZON_AFFILIATE_LINK_AUDIT_BUNDLE_REL_V1;
const OUT_REL = FRIDGE_AMAZON_AFFILIATE_LINK_AUDIT_CURSOR_VALIDATION_REL_V1;

function main(): void {
  const bundlePath = path.join(ROOT, BUNDLE_REL);
  if (!existsSync(bundlePath)) {
    console.error(JSON.stringify({ error: `Missing bundle at ${BUNDLE_REL}` }, null, 2));
    process.exit(1);
  }

  const protected_paths_before = snapshotAmazonAffiliateLinkAuditProtectedPathsV1(ROOT);
  const bundle = JSON.parse(readFileSync(bundlePath, "utf8")) as AmazonAffiliateLinkAuditAssistBundleV1;
  const result = runAmazonAffiliateLinkAuditValidationV1({
    rootDir: ROOT,
    bundle,
    protected_paths_before,
  });
  const validation_status = deriveAmazonAffiliateLinkAuditValidationStatusV1(result);

  const packet = {
    contract: CURSOR_VALIDATION_PACKET_CONTRACT_V1,
    validation_id: randomUUID(),
    mission_type: FRIDGE_AMAZON_AFFILIATE_LINK_AUDIT_MISSION_TYPE_V1,
    cohort_key: FRIDGE_AMAZON_AFFILIATE_LINK_AUDIT_COHORT_KEY_V1,
    mission_id: bundle.mission_id ?? "fridge-amazon-affiliate-link-audit-assist-v1",
    validated_at: new Date().toISOString(),
    validation_status,
    read_only: true,
    data_mutation: false,
    mutation_authorized: false,
    verified_link_authorized: false,
    truth_closure_authorized: false,
    command_center_status_update_allowed: false,
    apply_planning_allowed: false,
    affiliate_link_generation_as_production_truth_authorized: false,
    validation_scope: "amazon_affiliate_link_audit_discovery_intake_only",
    command_center_closure_implied: false,
    bundle_rel_path: BUNDLE_REL,
    provenance_rel_path: FRIDGE_AMAZON_AFFILIATE_LINK_AUDIT_PROVENANCE_REL_V1,
    commands_run: [
      "node --import tsx scripts/run-fridge-amazon-affiliate-link-audit-cursor-validation-v1.ts",
      "validateAmazonAffiliateLinkAuditBundleIntegrityV1",
      "runAmazonAffiliateLinkAuditValidationV1",
    ],
    validation_details: {
      slug_count: bundle.slug_audits.length,
      bundle_authentic: result.integrity.authentic,
      integrity_errors: result.integrity.errors,
      integrity_warnings: result.integrity.warnings,
      slug_verdicts: result.slug_verdicts,
      all_expected_slugs_present: result.all_expected_slugs_present,
      no_extra_slugs: result.no_extra_slugs,
      b087_do_not_use_only: result.b087_do_not_use_only,
      b087_in_do_not_use_table: result.b087_in_do_not_use_table,
      authorization_blocks_mutation: result.authorization_blocks_mutation,
      affiliate_tag_expected_but_not_production_authorized:
        result.affiliate_tag_expected_but_not_production_authorized,
      amazon_rows_in_csv_zero_for_cohort: result.amazon_rows_in_csv_zero_for_cohort,
      pass_candidates_confirmed: result.pass_candidates_confirmed,
      blocked_slugs_confirmed: result.blocked_slugs_confirmed,
      ultrawf_stale_warning_emitted: result.ultrawf_stale_warning_emitted,
      ultrawf_stale_warning_code: result.ultrawf_stale_warning_code,
      ultrawf_stale_warning_reason: result.ultrawf_stale_warning_reason,
      protected_paths_unchanged: result.protected_paths_unchanged,
    },
    proven_facts: [
      "PROVEN: validation is read_only; no CSV/Supabase/evidence mutation authorized",
      "PROVEN: HyperAgent Amazon affiliate audit is discovery input only — not production truth",
      "PROVEN: VALIDATION_PASS is not claimed by this intake validation layer",
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
        slug_count: bundle.slug_audits.length,
        bundle_authentic: result.integrity.authentic,
        ultrawf_stale_warning_emitted: result.ultrawf_stale_warning_emitted,
        output: OUT_REL,
      },
      null,
      2,
    ),
  );

  if (validation_status === "VALIDATION_FAIL") process.exit(1);
}

main();
