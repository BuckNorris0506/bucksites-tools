/**
 * Vertical CSV seed import — thin re-export (mutation logic lives in vertical-seed-run-v1).
 */

import { VERTICAL_SEED_MUTATION_GATE_REF_V1 } from "./vertical-seed-mutation-gate-v1";

export {
  createVerticalSeedLiveDepsV1,
  parseVerticalSeedCliArgsV1,
  runVerticalSeed,
  runVerticalSeedV1,
  type VerticalKey,
  type VerticalSeedDepsV1,
  type VerticalSeedReportV1,
  type VerticalSeedRunResultV1,
} from "./vertical-seed-run-v1";

const mutationGateRef = VERTICAL_SEED_MUTATION_GATE_REF_V1;
void mutationGateRef;
