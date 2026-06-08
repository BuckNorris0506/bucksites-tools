import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import {
  DANGEROUS_MAPPING_REMEDIATION_PLAN_CONTRACT_V1,
  DANGEROUS_MAPPING_REMEDIATION_PLAN_JSON_REL_V1,
  type DangerousMappingRemediationPlanV1,
} from "./lib/dangerous-mapping-remediation-plan-v1";
import {
  evaluateAllLearnedFailureGuardsV1,
  writeLearnedFailureGuardsArtifactsV1,
} from "./lib/learned-failure-guards-v1";

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

function loadRemediationPlan(): DangerousMappingRemediationPlanV1 {
  const parsed = JSON.parse(
    readFileSync(path.join(rootDir, DANGEROUS_MAPPING_REMEDIATION_PLAN_JSON_REL_V1), "utf8"),
  ) as DangerousMappingRemediationPlanV1;
  if (parsed.contract !== DANGEROUS_MAPPING_REMEDIATION_PLAN_CONTRACT_V1) {
    throw new Error("Remediation plan contract mismatch");
  }
  return parsed;
}

function main(): void {
  const report = evaluateAllLearnedFailureGuardsV1({ rootDir });

  if (process.argv.includes("--write-artifacts")) {
    writeLearnedFailureGuardsArtifactsV1({
      rootDir,
      report,
      remediationPlan: loadRemediationPlan(),
    });
  }

  process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);

  if (!report.dangerous_slugs_all_blocked || !report.proven_correct_slugs_all_pass) {
    process.exitCode = 1;
  }
}

main();
