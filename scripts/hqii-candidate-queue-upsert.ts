import { pathToFileURL } from "node:url";

import { loadEnv } from "./lib/load-env";
import { getSupabaseAdmin } from "./lib/supabase-admin";
import { HQII_CANDIDATE_QUEUE_UPSERT_MUTATION_GATE_REF_V1 } from "./lib/hqii-candidate-queue-upsert-mutation-gate-v1";
import {
  buildOfferCandidatePayload,
  buildQueueRowDraft,
  catalogWedgeFromInput,
  createHqiiCandidateQueueUpsertLiveDepsV1,
  parseHqiiCandidateQueueUpsertCliArgsV1,
  runHqiiCandidateQueueUpsertV1,
} from "./lib/hqii-candidate-queue-upsert-run-v1";

export { buildOfferCandidatePayload, buildQueueRowDraft, catalogWedgeFromInput };

const mutationGateRef = HQII_CANDIDATE_QUEUE_UPSERT_MUTATION_GATE_REF_V1;
void mutationGateRef;

async function main() {
  loadEnv();
  const { inputPath, write } = parseHqiiCandidateQueueUpsertCliArgsV1(process.argv);
  if (!inputPath) throw new Error("Missing --input <json-path>");

  const result = await runHqiiCandidateQueueUpsertV1({
    rootDir: process.cwd(),
    inputPath,
    write,
    deps: createHqiiCandidateQueueUpsertLiveDepsV1(getSupabaseAdmin),
  });

  console.log(JSON.stringify(result.report, null, 2));
  process.exit(result.exit_code);
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch((err) => {
    const message = err instanceof Error ? err.message : String(err);
    console.error(`[hqii-candidate-queue-upsert] FAILED: ${message}`);
    process.exitCode = 1;
  });
}
