import path from "node:path";
import { fileURLToPath } from "node:url";

import {
  WHW_AP810_RETAILER_LINK_APPLY_PLAN_REL_V1,
  buildWhwAp810SafeRetailerLinkApplyPlanV1,
  writeWhwSafeRetailerLinkApplyPlanV1,
} from "./lib/whole-house-water-safe-retailer-link-apply-plan-v1";

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

function parseArgs(argv: string[]): { write: boolean } {
  return { write: argv.includes("--write") };
}

function main(): void {
  const args = parseArgs(process.argv.slice(2));
  const plan = buildWhwAp810SafeRetailerLinkApplyPlanV1({ rootDir });

  let artifactRel: string | null = null;
  if (args.write) {
    artifactRel = writeWhwSafeRetailerLinkApplyPlanV1({ rootDir, plan });
  }

  process.stdout.write(
    `${JSON.stringify(
      {
        artifact_rel: artifactRel ?? WHW_AP810_RETAILER_LINK_APPLY_PLAN_REL_V1,
        write_requested: args.write,
        contract: plan.contract,
        read_only: plan.read_only,
        data_mutation: plan.data_mutation,
        anchor_filter_slug: plan.anchor_filter_slug,
        apply_authorized_by_artifact: plan.apply_authorized_by_artifact,
        founder_approval_required: plan.founder_approval_required,
        ready_for_founder_approval: plan.ready_for_founder_approval,
        whw_public_opening_authorized: plan.whw_public_opening_authorized,
        row_already_exists_in_committed_csv: plan.row_already_exists_in_committed_csv,
        proposed_retailer_link_row: plan.proposed_retailer_link_row,
        validation_refusals: plan.validation_refusals,
      },
      null,
      2,
    )}\n`,
  );
}

main();
