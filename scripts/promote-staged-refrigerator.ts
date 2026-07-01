import { loadEnv } from "./lib/load-env";
import { getSupabaseAdmin } from "./lib/supabase-admin";
import { PROMOTE_STAGED_REFRIGERATOR_MUTATION_GATE_REF_V1 } from "./lib/promote-staged-refrigerator-mutation-gate-v1";
import {
  createPromoteStagedRefrigeratorLiveDepsV1,
  parsePromoteStagedRefrigeratorCliArgsV1,
  runPromoteStagedRefrigeratorV1,
} from "./lib/promote-staged-refrigerator-run-v1";

const mutationGateRef = PROMOTE_STAGED_REFRIGERATOR_MUTATION_GATE_REF_V1;

async function main() {
  loadEnv();
  const { write, limit } = parsePromoteStagedRefrigeratorCliArgsV1(process.argv);
  const result = await runPromoteStagedRefrigeratorV1({
    rootDir: process.cwd(),
    write,
    limit,
    deps: createPromoteStagedRefrigeratorLiveDepsV1(getSupabaseAdmin),
  });

  console.log(JSON.stringify(result.report, null, 2));
  process.exit(result.exit_code);
}

main().catch((err) => {
  console.error("[promote-staged-refrigerator] failed", err);
  process.exit(1);
});
