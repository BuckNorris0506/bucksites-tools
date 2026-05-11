export type AmazonAsinReusePolicyClassification =
  | "EXACT_PDP_PROVEN_BUT_COLLISION_REVIEW_REQUIRED"
  | "EXACT_PDP_PROVEN_NO_COLLISION"
  | "HUMAN_BROWSER_VERIFICATION_REQUIRED"
  | "NO_SAFE_PDP_FOUND"
  | "UNKNOWN";

export type AmazonAsinReusePolicyStatus =
  | "OWNER_POLICY_REVIEW_REQUIRED"
  | "OWNER_REVIEW_ELIGIBLE"
  | "BLOCKED"
  | "UNKNOWN";

export type AmazonAsinReusePolicyInput = {
  token: string;
  asin: string | null;
  noSafePdpFound: boolean;
  exactTokenProof: boolean | "UNKNOWN";
  sellerControlledTargetTokenProof: boolean | "UNKNOWN";
  replacementOrCompatibleRelationshipProof: boolean | "UNKNOWN";
  buyabilityProof: boolean | "UNKNOWN";
  attributionCanBeLabeled: boolean | "UNKNOWN";
  asinCollisionEvidenceFileCount: number | "UNKNOWN";
  liveAsinReuseCount?: number | "UNKNOWN";
};

export type AmazonAsinReusePolicyResult = {
  classification: AmazonAsinReusePolicyClassification;
  policy_status: AmazonAsinReusePolicyStatus;
  mutation_ready: false;
  reason: string;
  requirements: string[];
};

export const AMAZON_ASIN_REUSE_POLICY_REQUIREMENTS = [
  "target token is visible in seller-controlled PDP identity/title or equivalent seller-controlled field",
  "page clearly describes replacement/compatible relationship for the target token",
  "buyability is visible or status is clearly known",
  "row can be labeled compatible/aftermarket/multipack when appropriate",
  "reuse does not imply original manufacturer part if not proven",
  "existing ASIN usage does not conflict with the target token relationship",
  "incomplete proof keeps classification COLLISION_REVIEW_REQUIRED or UNKNOWN",
] as const;

function isTrue(value: boolean | "UNKNOWN"): boolean {
  return value === true;
}

function isUnknown(value: boolean | "UNKNOWN"): boolean {
  return value === "UNKNOWN";
}

function collisionCount(input: AmazonAsinReusePolicyInput): number | "UNKNOWN" {
  if (input.asinCollisionEvidenceFileCount === "UNKNOWN") return "UNKNOWN";
  const live = input.liveAsinReuseCount ?? 0;
  if (live === "UNKNOWN") return input.asinCollisionEvidenceFileCount;
  return Math.max(input.asinCollisionEvidenceFileCount, live);
}

function hasCompleteOwnerReviewProof(input: AmazonAsinReusePolicyInput): boolean {
  return (
    isTrue(input.exactTokenProof) &&
    isTrue(input.sellerControlledTargetTokenProof) &&
    isTrue(input.replacementOrCompatibleRelationshipProof) &&
    isTrue(input.buyabilityProof) &&
    isTrue(input.attributionCanBeLabeled)
  );
}

export function classifyAmazonAsinReusePolicy(
  input: AmazonAsinReusePolicyInput,
): AmazonAsinReusePolicyResult {
  if (input.noSafePdpFound) {
    return {
      classification: "NO_SAFE_PDP_FOUND",
      policy_status: "BLOCKED",
      mutation_ready: false,
      reason: `${input.token} has owner/review evidence that no defensible exact-token PDP was found.`,
      requirements: [...AMAZON_ASIN_REUSE_POLICY_REQUIREMENTS],
    };
  }

  if (!input.asin) {
    return {
      classification: "UNKNOWN",
      policy_status: "UNKNOWN",
      mutation_ready: false,
      reason: `${input.token} has no proven Amazon ASIN in evidence.`,
      requirements: [...AMAZON_ASIN_REUSE_POLICY_REQUIREMENTS],
    };
  }

  const collisions = collisionCount(input);
  const proofComplete = hasCompleteOwnerReviewProof(input);

  if (collisions === "UNKNOWN") {
    return {
      classification: proofComplete ? "HUMAN_BROWSER_VERIFICATION_REQUIRED" : "UNKNOWN",
      policy_status: "UNKNOWN",
      mutation_ready: false,
      reason: `${input.token} ASIN reuse/collision state is UNKNOWN; mutation authority is withheld.`,
      requirements: [...AMAZON_ASIN_REUSE_POLICY_REQUIREMENTS],
    };
  }

  if (collisions > 0) {
    if (isTrue(input.exactTokenProof) && isTrue(input.sellerControlledTargetTokenProof)) {
      return {
        classification: "EXACT_PDP_PROVEN_BUT_COLLISION_REVIEW_REQUIRED",
        policy_status: "OWNER_POLICY_REVIEW_REQUIRED",
        mutation_ready: false,
        reason: `${input.token} has exact seller-controlled token proof, but ASIN ${input.asin} is reused by other BuckParts evidence/live rows; owner ASIN reuse policy review is required before any mutation.`,
        requirements: [...AMAZON_ASIN_REUSE_POLICY_REQUIREMENTS],
      };
    }

    return {
      classification: isUnknown(input.exactTokenProof) || isUnknown(input.sellerControlledTargetTokenProof)
        ? "UNKNOWN"
        : "HUMAN_BROWSER_VERIFICATION_REQUIRED",
      policy_status: "BLOCKED",
      mutation_ready: false,
      reason: `${input.token} ASIN ${input.asin} collides with other evidence/live rows without seller-controlled exact-token proof for this token.`,
      requirements: [...AMAZON_ASIN_REUSE_POLICY_REQUIREMENTS],
    };
  }

  if (proofComplete) {
    return {
      classification: "EXACT_PDP_PROVEN_NO_COLLISION",
      policy_status: "OWNER_REVIEW_ELIGIBLE",
      mutation_ready: false,
      reason: `${input.token} has exact PDP proof and no ASIN reuse collision in the checked evidence scope; mutation still requires owner-approved insert planning and runtime gates.`,
      requirements: [...AMAZON_ASIN_REUSE_POLICY_REQUIREMENTS],
    };
  }

  if (isTrue(input.exactTokenProof) || isTrue(input.sellerControlledTargetTokenProof)) {
    return {
      classification: "HUMAN_BROWSER_VERIFICATION_REQUIRED",
      policy_status: "BLOCKED",
      mutation_ready: false,
      reason: `${input.token} has partial PDP evidence, but the ASIN reuse policy proof set is incomplete.`,
      requirements: [...AMAZON_ASIN_REUSE_POLICY_REQUIREMENTS],
    };
  }

  return {
    classification: "UNKNOWN",
    policy_status: "UNKNOWN",
    mutation_ready: false,
    reason: `${input.token} does not have enough proof for ASIN reuse/collision classification.`,
    requirements: [...AMAZON_ASIN_REUSE_POLICY_REQUIREMENTS],
  };
}

