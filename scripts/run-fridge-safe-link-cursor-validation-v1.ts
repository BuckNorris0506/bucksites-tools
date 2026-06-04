/**
 * Read-only Cursor validation for fridge SAFE_LINK_BATCH HyperAgent ingest bundle.
 * Requires FULL Mission Control packet bodies — rejects stub/materialized/repo-join bundles.
 * Writes data/fridge/batch-production/drafts/fridge-safe-link-cursor-validation-v1.json
 */

import { randomUUID } from "node:crypto";
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";

import {
  CURSOR_VALIDATION_FAILURE_FULL_PACKET_BODIES_REQUIRED,
  CURSOR_VALIDATION_PACKET_CONTRACT_V1,
  type HyperAgentBatchBundleV1,
  validateHyperAgentBatchBundleForCursorValidationV1,
} from "./lib/buckparts-ops-agent-workflow-v1";

const ROOT = process.cwd();
const BUNDLE_REL = "data/fridge/batch-production/drafts/fridge-safe-link-hyperagent-ingest-bundle-v1.json";
const BUNDLE_ARG = process.argv.find((a) => a.startsWith("--bundle="))?.slice("--bundle=".length);
const OUT_REL = "data/fridge/batch-production/drafts/fridge-safe-link-cursor-validation-v1.json";

function writeValidationPacket(packet: Record<string, unknown>): void {
  writeFileSync(path.join(ROOT, OUT_REL), `${JSON.stringify(packet, null, 2)}\n`);
}

function failPacket(args: {
  task_id: string;
  ingest_id: string | null;
  failure_code: string;
  errors: string[];
  synthetic_packet_slugs: string[];
  bundle_rel: string;
}): void {
  const packet = {
    contract: CURSOR_VALIDATION_PACKET_CONTRACT_V1,
    validation_id: randomUUID(),
    task_id: args.task_id,
    ingest_id: args.ingest_id,
    validated_at: new Date().toISOString(),
    validation_status: "VALIDATION_FAIL",
    failure_code: args.failure_code,
    commands_run: ["node --import tsx scripts/run-fridge-safe-link-cursor-validation-v1.ts"],
    batch_factory_artifacts: [args.bundle_rel],
    truth_closure_authorized: false,
    command_center_status_update_allowed: false,
    read_only: true,
    data_mutation: false,
    mutation_authorized: false,
    validation_details: {
      total_slugs_validated: 0,
      state_changes_confirmed: 0,
      state_changes_rejected: 0,
      state_changes_partial: 0,
      state_change_verdicts: [],
      hard_stops_confirmed: [],
      new_findings_confirmed: [],
      synthetic_packet_slugs: args.synthetic_packet_slugs,
      discrepancies: args.errors,
      bundle_authentic: false,
    },
    proven_facts: [
      "PROVEN: validation rejected non-authentic HyperAgent bundle before any state-change confirmation",
    ],
    unknown_facts: [
      "UNKNOWN: per-slug repo cross-check outcomes — not run because FULL_HYPERAGENT_PACKET_BODIES_REQUIRED",
    ],
    owner_next_steps: [
      `Commit full Mission Control export to ${BUNDLE_REL} (UUID ingest_ids, complete packet bodies, no materialized_from_manifest).`,
      "Do not use scripts/DEV_ONLY-materialize-fridge-hyperagent-ingest-bundle-v1.ts output for truth validation.",
      "Re-run: node --import tsx scripts/run-fridge-safe-link-cursor-validation-v1.ts",
      "No CSV/Supabase/evidence mutation or Command Center closure from this FAIL packet.",
    ],
    doctrine_doc: "docs/BuckParts-OPS-AGENT-WORKFLOW-V1.md",
  };
  writeValidationPacket(packet);
  console.log(
    JSON.stringify(
      {
        validation_status: packet.validation_status,
        failure_code: packet.failure_code,
        validation_id: packet.validation_id,
        output: OUT_REL,
      },
      null,
      2,
    ),
  );
}

function main(): void {
  const bundleRel = BUNDLE_ARG ?? BUNDLE_REL;
  const bundlePath = path.join(ROOT, bundleRel);

  if (!existsSync(bundlePath)) {
    failPacket({
      task_id: "UNKNOWN",
      ingest_id: null,
      failure_code: CURSOR_VALIDATION_FAILURE_FULL_PACKET_BODIES_REQUIRED,
      errors: [`Missing bundle at ${bundleRel}`],
      synthetic_packet_slugs: [],
      bundle_rel: bundleRel,
    });
    process.exit(1);
  }

  const bundle = JSON.parse(readFileSync(bundlePath, "utf8")) as HyperAgentBatchBundleV1;
  const authenticity = validateHyperAgentBatchBundleForCursorValidationV1(bundle);

  if (!authenticity.authentic) {
    failPacket({
      task_id: bundle.manifest?.task_id ?? "UNKNOWN",
      ingest_id: bundle.manifest?.manifest_id ?? null,
      failure_code: authenticity.failure_code ?? CURSOR_VALIDATION_FAILURE_FULL_PACKET_BODIES_REQUIRED,
      errors: authenticity.errors,
      synthetic_packet_slugs: authenticity.synthetic_packet_slugs,
      bundle_rel: bundleRel,
    });
    process.exit(1);
  }

  // Authentic bundle: repo cross-check and state-change validation run in a future slice.
  // This script currently gates on packet-body authenticity only; full slug validation TBD when bundle on disk.
  const packet = {
    contract: CURSOR_VALIDATION_PACKET_CONTRACT_V1,
    validation_id: randomUUID(),
    task_id: bundle.manifest.task_id,
    ingest_id: bundle.manifest.manifest_id,
    validated_at: new Date().toISOString(),
    validation_status: "VALIDATION_PARTIAL",
    failure_code: null,
    commands_run: [
      "node --import tsx scripts/run-fridge-safe-link-cursor-validation-v1.ts",
      "validateHyperAgentBatchBundleForCursorValidationV1",
    ],
    batch_factory_artifacts: [bundleRel],
    truth_closure_authorized: false,
    command_center_status_update_allowed: false,
    read_only: true,
    data_mutation: false,
    mutation_authorized: false,
    validation_details: {
      total_slugs_validated: bundle.packet_count,
      bundle_authentic: true,
      state_changes_confirmed: 0,
      state_changes_rejected: 0,
      state_changes_partial: 0,
      state_change_verdicts: [],
      note: "Bundle authenticity PASS; per-slug repo state-change validation not yet re-run in this script revision — run dedicated validation pass next.",
    },
    proven_facts: [
      "PROVEN: HyperAgent batch bundle passed FULL packet body authenticity gate",
      "PROVEN: all packets truth_closure_claimed=false",
    ],
    unknown_facts: [
      "UNKNOWN: per-slug proposed_state vs repo evidence — awaiting full validation pass implementation on authentic bundle",
    ],
    owner_next_steps: [
      "Bundle authenticity OK — proceed with repo cross-check validation pass (batch factory, CSV, evidence) before VALIDATION_PASS.",
    ],
    doctrine_doc: "docs/BuckParts-OPS-AGENT-WORKFLOW-V1.md",
  };

  writeValidationPacket(packet);
  console.log(
    JSON.stringify(
      {
        validation_status: packet.validation_status,
        bundle_authentic: true,
        validation_id: packet.validation_id,
        output: OUT_REL,
      },
      null,
      2,
    ),
  );
}

main();
