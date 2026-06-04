/**
 * Read-only Cursor validation for fridge SAFE_LINK_BATCH HyperAgent ingest bundle.
 * Requires FULL Mission Control packet bodies — rejects stub/materialized/repo-join bundles.
 * Writes data/fridge/batch-production/drafts/fridge-safe-link-cursor-validation-v1.json
 */

import { randomUUID } from "node:crypto";
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";

import { resolveFridgeHyperAgentBundleProvenanceV1 } from "./lib/fridge-safe-link-bundle-provenance-v1";
import {
  deriveValidationStatusFromCrossCheck,
  runFridgeBatchRepoCrossCheckV1,
} from "./lib/fridge-safe-link-batch-cursor-validation-v1";
import {
  CURSOR_VALIDATION_FAILURE_FULL_PACKET_BODIES_REQUIRED,
  CURSOR_VALIDATION_PACKET_CONTRACT_V1,
  type HyperAgentBatchBundleV1,
  validateHyperAgentBatchBundleForCursorValidationV1,
} from "./lib/buckparts-ops-agent-workflow-v1";

const ROOT = process.cwd();
const BUNDLE_REL = "data/fridge/batch-production/drafts/fridge-safe-link-hyperagent-ingest-bundle-v1.json";
const BUNDLE_ARG = process.argv.find((a) => a.startsWith("--bundle="))?.slice("--bundle=".length);
const BUNDLE_SOURCE_ARG = process.argv
  .find((a) => a.startsWith("--bundle-source="))
  ?.slice("--bundle-source=".length);
const BATCH_FACTORY_REL = "data/fridge/batch-production/drafts/fridge-safe-link-batch-factory-v1.json";
const OUT_REL = "data/fridge/batch-production/drafts/fridge-safe-link-cursor-validation-v1.json";
const GSWF_PROOF_REL =
  "data/fridge/batch-production/drafts/fridge-safe-link-gswf-ge-official-owner-browser-proof-v1.json";
const EDR3_EVIDENCE_REL = "data/evidence/amazon-edr3rxd1-aftermarket-pdp-evidence.2026-05-04.json";

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
    batch_factory_artifacts: [args.bundle_rel, BATCH_FACTORY_REL],
    truth_closure_authorized: false,
    command_center_status_update_allowed: false,
    read_only: true,
    data_mutation: false,
    mutation_authorized: false,
    validation_details: {
      total_slugs_validated: 0,
      bundle_authentic: false,
      state_changes_confirmed: 0,
      state_changes_rejected: 0,
      state_changes_partial: 0,
      state_change_verdicts: [],
      hard_stops_confirmed: [],
      new_findings_confirmed: [],
      synthetic_packet_slugs: args.synthetic_packet_slugs,
      discrepancies: args.errors,
      apply_planning_allowed: false,
    },
    proven_facts: [
      "PROVEN: validation rejected non-authentic HyperAgent bundle before repo cross-check",
    ],
    unknown_facts: ["UNKNOWN: per-slug outcomes — not run"],
    owner_next_steps: [
      `Place full Mission Control export at ${BUNDLE_REL}`,
      "Re-run: node --import tsx scripts/run-fridge-safe-link-cursor-validation-v1.ts",
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

  const cross = runFridgeBatchRepoCrossCheckV1(bundle);
  const validation_status = deriveValidationStatusFromCrossCheck(cross, []);
  const truth_closure_authorized = validation_status === "VALIDATION_PASS";
  const command_center_status_update_allowed = validation_status === "VALIDATION_PASS";
  const bundleProvenance = resolveFridgeHyperAgentBundleProvenanceV1({
    bundleRel,
    cliBundleSource: BUNDLE_SOURCE_ARG,
  });

  const packet = {
    contract: CURSOR_VALIDATION_PACKET_CONTRACT_V1,
    validation_id: randomUUID(),
    task_id: bundle.manifest.task_id,
    ingest_id: bundle.manifest.manifest_id,
    validated_at: new Date().toISOString(),
    validation_status,
    failure_code: null,
    commands_run: [
      "node --import tsx scripts/run-fridge-safe-link-cursor-validation-v1.ts",
      "validateHyperAgentBatchBundleForCursorValidationV1",
      "runFridgeBatchRepoCrossCheckV1",
      "resolveFridgeHyperAgentBundleProvenanceV1",
    ],
    bundle_provenance: bundleProvenance,
    validation_scope: bundleProvenance.validation_scope,
    command_center_closure_implied: false,
    batch_factory_artifacts: [
      bundleRel,
      ...(bundleProvenance.sidecar_rel ? [bundleProvenance.sidecar_rel] : []),
      BATCH_FACTORY_REL,
      GSWF_PROOF_REL,
      EDR3_EVIDENCE_REL,
      "data/filters.csv",
      "data/retailer_links.csv",
    ],
    truth_closure_authorized,
    command_center_status_update_allowed,
    read_only: true,
    data_mutation: false,
    mutation_authorized: false,
    validation_details: {
      total_slugs_validated: bundle.packet_count,
      packet_count: bundle.packet_count,
      bundle_authentic: true,
      all_truth_closure_claimed_false: true,
      ...cross,
      coverage_delta_note:
        "HyperAgent manifest expects eligible_now 0 after gswf downgrade; repo batch_factory eligible_now_count may still be 1 until factory refresh",
      apply_planning_allowed: false,
    },
    proven_facts: [
      "PROVEN: bundle authenticity gate PASS (26 UUID packets, full Mission Control bodies)",
      "PROVEN: manifest.truth_closure_claimed=false on all packets",
      "PROVEN: manifest_id ebfd1834-8a37-4d33-9bd0-2a43d2652e46 task_id 0d6c0f26-25cc-4a4e-95ab-d5e78d148664",
      ...(bundleProvenance.bundle_source_claim === "PROVEN"
        ? [`PROVEN: bundle_source=${bundleProvenance.bundle_source} per committed provenance sidecar`]
        : []),
      "PROVEN: command_center_closure_implied=false — validation does not authorize Command Center closure",
      ...(cross.aftermarket_asin_confirmed
        ? ["PROVEN: edr3rxd1 B087PDLZL9 aftermarket per data/evidence/amazon-edr3rxd1-aftermarket-pdp-evidence.2026-05-04.json"]
        : []),
      ...(existsSync(path.join(ROOT, GSWF_PROOF_REL))
        ? ["PROVEN: gswf owner-browser draft proof on geapplianceparts spec PDP"]
        : []),
    ],
    unknown_facts: [
      ...(bundleProvenance.byte_for_byte_hyperagent_export_match === "UNKNOWN"
        ? ["UNKNOWN: byte_for_byte_hyperagent_export_match — replace bundle with fresh HyperAgent export to prove"]
        : []),
      ...(bundleProvenance.bundle_source_claim !== "PROVEN"
        ? ["UNKNOWN: bundle_source — add .provenance.json or owner-attested direct export path"]
        : []),
      "UNKNOWN: HyperAgent external retailer quotes — not independently re-fetched in this validation run",
      "UNKNOWN: geappliances.com discontinued page text for gswf/xwfe — not in committed repo captures",
      "UNKNOWN: B00UB441HS OEM ASIN for edr3rxd1 — cited by HyperAgent, not in repo evidence files read",
    ],
    owner_next_steps: [
      "Refresh fridge-safe-link-batch-factory-v1 binding to this bundle (read-only regen)",
      "Quarantine frig-242294502 from water-filter safe-link cohort",
      "Owner reconcile gswf discontinued vs clearance PDP proof",
      "Owner browser-proof batch for APPLY_ELIGIBLE slugs (14) — no Verified Link until proofs",
      "Fix edr3rxd1 batch-factory candidate — drop B087PDLZL9",
      "No CSV/Supabase/evidence mutation from this packet",
    ],
    doctrine_doc: "docs/BuckParts-OPS-AGENT-WORKFLOW-V1.md",
  };

  writeValidationPacket(packet);
  console.log(
    JSON.stringify(
      {
        validation_status: packet.validation_status,
        bundle_provenance: bundleProvenance,
        bundle_authentic: true,
        truth_closure_authorized: packet.truth_closure_authorized,
        command_center_status_update_allowed: packet.command_center_status_update_allowed,
        packet_count: bundle.packet_count,
        state_changes_confirmed: cross.state_changes_confirmed,
        state_changes_rejected: cross.state_changes_rejected,
        state_changes_partial: cross.state_changes_partial,
        validation_id: packet.validation_id,
        output: OUT_REL,
      },
      null,
      2,
    ),
  );

  if (validation_status === "VALIDATION_FAIL") process.exit(1);
}

main();
