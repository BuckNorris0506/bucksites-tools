/**
 * Truth-ledger outcome recording for capability-only (MUTATION IO) service-role lanes.
 * No founder binding; append uses MUTATION io_capability on write-intent paths.
 */

import {
  recordTruthLedgerMutationOutcomeV1,
  type TruthLedgerMutationApplyOutcomeV1,
} from "./truth-ledger-v1";

export const CAPABILITY_ONLY_TRUTH_LEDGER_IO_ON_WRITE_INTENT_V1 = "MUTATION" as const;

export function recordCapabilityOnlyMutationTruthLedgerOutcomeV1(args: {
  rootDir: string;
  mutation_lane: string;
  apply_outcome: TruthLedgerMutationApplyOutcomeV1;
  blockers: string[];
  now?: () => Date;
  appendText?: (absPath: string, line: string) => void;
  mkdir?: (dirAbs: string) => void;
  recordTruthLedger?: typeof recordTruthLedgerMutationOutcomeV1;
}): { ok: true } | { ok: false; blockers: string[] } {
  const recordTruthLedger = args.recordTruthLedger ?? recordTruthLedgerMutationOutcomeV1;
  return recordTruthLedger({
    rootDir: args.rootDir,
    io_capability: CAPABILITY_ONLY_TRUTH_LEDGER_IO_ON_WRITE_INTENT_V1,
    mutation_lane: args.mutation_lane,
    founder_decision_id: null,
    apply_outcome: args.apply_outcome,
    blockers: args.blockers,
    bound_artifacts_v1: [],
    now: args.now,
    appendText: args.appendText,
    mkdir: args.mkdir,
  });
}
