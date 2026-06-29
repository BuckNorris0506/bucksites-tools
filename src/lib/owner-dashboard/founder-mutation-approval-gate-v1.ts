/**
 * Founder mutation approval gate — time/status + tamper-evident artifact bindings.
 */

import {
  isFounderRegistryRowActiveMutationApproval,
  type FounderDecisionRegistryRowV1,
} from "./founder-decision-registry-v1";
import {
  verifyFounderDecisionArtifactBindingsV1,
  type FounderDecisionBoundArtifactsV1,
} from "./truth-ledger-v1";

export function founderRegistryRowPassesMutationApprovalGateV1(args: {
  row: FounderDecisionRegistryRowV1 & Partial<FounderDecisionBoundArtifactsV1>;
  referenceTimeIso: string;
  rootDir: string;
  readText?: (abs: string) => string;
}): { ok: true } | { ok: false; blockers: string[] } {
  if (!isFounderRegistryRowActiveMutationApproval(args.row, args.referenceTimeIso)) {
    return {
      ok: false,
      blockers: ["founder_owner_mutation_approved_missing_or_inactive"],
    };
  }
  const bindingVerify = verifyFounderDecisionArtifactBindingsV1({
    row: args.row,
    rootDir: args.rootDir,
    readText: args.readText,
  });
  if (!bindingVerify.ok) {
    return { ok: false, blockers: bindingVerify.blockers };
  }
  return { ok: true };
}

/** Full mutation authority: standing approval + tamper-evident artifact bindings. */
export function founderRegistryRowGrantsMutatingRepoAuthorityV1(args: {
  row: FounderDecisionRegistryRowV1 & Partial<FounderDecisionBoundArtifactsV1>;
  referenceTimeIso: string;
  rootDir: string;
  readText?: (abs: string) => string;
}): boolean {
  return founderRegistryRowPassesMutationApprovalGateV1(args).ok;
}
