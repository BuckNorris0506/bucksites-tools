#!/usr/bin/env node
/**
 * Read-only manufacturer rescue owner approval packet factory.
 *
 *   npm run buckparts:manufacturer-rescue-owner-approval-packet-factory
 */

import { fileURLToPath } from "node:url";
import path from "node:path";

import {
  buildManufacturerRescueOwnerApprovalPacketFactoryV1,
  MANUFACTURER_RESCUE_OWNER_APPROVAL_PACKET_FACTORY_CONTRACT_V1,
  writeManufacturerRescueOwnerApprovalPacketFactoryArtifactsV1,
} from "./lib/manufacturer-rescue-owner-approval-packet-factory-v1";
import {
  EXECUTION_LEDGER_TRIGGER_MANUFACTURER_RESCUE_OWNER_APPROVAL_PACKET_FACTORY_V1,
  refreshBuckpartsExecutionLedgerV1,
} from "./lib/buckparts-execution-ledger-v1";

const REPO_ROOT = path.resolve(path.join(path.dirname(fileURLToPath(import.meta.url)), ".."));

function main(): void {
  const { report, packets, decision_templates } = buildManufacturerRescueOwnerApprovalPacketFactoryV1({
    rootDir: REPO_ROOT,
  });
  const written = writeManufacturerRescueOwnerApprovalPacketFactoryArtifactsV1({
    rootDir: REPO_ROOT,
    report,
    packets,
    decision_templates,
  });

  process.stderr.write(
    `Wrote ${written.factoryJsonRelPath}, ${written.factoryMdRelPath}, ${String(written.approvalPacketRelPaths.length)} approval packet(s), ${String(written.decisionTemplateRelPaths.length)} decision template(s) (read-only; no mutation authorized).\n`,
  );
  process.stderr.write(
    `Approval cohorts: ${String(report.approval_cohort_count)} (${String(report.ready_for_owner_review_plan_count)} READY_FOR_OWNER_REVIEW plan(s); ${String(report.batch_approval_eligible_cohort_count)} batch-eligible).\n`,
  );

  const ledger = refreshBuckpartsExecutionLedgerV1({
    rootDir: REPO_ROOT,
    trigger_source: EXECUTION_LEDGER_TRIGGER_MANUFACTURER_RESCUE_OWNER_APPROVAL_PACKET_FACTORY_V1,
  });
  process.stderr.write(`Refreshed ${ledger.jsonRelPath} (execution ledger; read-only index).\n`);

  process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);

  if (report.contract !== MANUFACTURER_RESCUE_OWNER_APPROVAL_PACKET_FACTORY_CONTRACT_V1) {
    process.exit(2);
  }
}

main();
