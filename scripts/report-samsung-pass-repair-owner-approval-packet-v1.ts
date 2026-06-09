import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import {
  buildSamsungPassRepairOwnerApprovalPacketV1,
  buildSamsungPassRepairOwnerDecisionTemplateV1,
  writeSamsungPassRepairOwnerApprovalPacketArtifactsV1,
} from "./lib/samsung-pass-repair-owner-approval-packet-v1";
import {
  SAMSUNG_PASS_REPAIR_APPLY_PLAN_CONTRACT_V1,
  SAMSUNG_PASS_REPAIR_APPLY_PLAN_JSON_REL_V1,
  type SamsungPassRepairApplyPlanV1,
} from "./lib/samsung-pass-repair-apply-plan-v1";

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

function loadApplyPlanForTemplate(): SamsungPassRepairApplyPlanV1 {
  const plan = JSON.parse(
    readFileSync(path.join(rootDir, SAMSUNG_PASS_REPAIR_APPLY_PLAN_JSON_REL_V1), "utf8"),
  ) as SamsungPassRepairApplyPlanV1;
  if (plan.contract !== SAMSUNG_PASS_REPAIR_APPLY_PLAN_CONTRACT_V1) {
    throw new Error("Samsung PASS apply plan contract mismatch");
  }
  return plan;
}

function main(): void {
  const packet = buildSamsungPassRepairOwnerApprovalPacketV1({ rootDir });
  const decisionTemplate = buildSamsungPassRepairOwnerDecisionTemplateV1({
    applyPlan: loadApplyPlanForTemplate(),
  });

  if (process.argv.includes("--write-artifacts")) {
    writeSamsungPassRepairOwnerApprovalPacketArtifactsV1({
      rootDir,
      packet,
      decisionTemplate,
    });
  }

  process.stdout.write(`${JSON.stringify(packet, null, 2)}\n`);
}

main();
