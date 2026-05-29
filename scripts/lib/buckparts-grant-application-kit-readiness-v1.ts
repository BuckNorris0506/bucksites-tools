/**
 * Read-only: verify BuckParts Grant Application Kit v1 docs + trust pack prerequisites.
 * No CSV, Supabase, launch-state, buy-gate, WHW artifacts, or public UI mutation.
 */

import { existsSync, readFileSync } from "node:fs";
import path from "node:path";

import { getVerticalLaunchState } from "@/lib/catalog/vertical-launch-state";

import { buildBuckpartsGrantReadinessV1 } from "./buckparts-grant-readiness-v1";

export const BUCKPARTS_GRANT_APPLICATION_KIT_READINESS_CONTRACT_V1 =
  "buckparts_grant_application_kit_readiness_v1" as const;

export type PositioningRiskLevelV1 = "LOW" | "MEDIUM" | "HIGH";

export type GrantKitDocIdV1 =
  | "application_kit"
  | "answer_bank"
  | "use_of_funds"
  | "truth_claims_register";

export type BuckpartsGrantApplicationKitReadinessV1 = {
  contract: typeof BUCKPARTS_GRANT_APPLICATION_KIT_READINESS_CONTRACT_V1;
  read_only: true;
  data_mutation: false;
  generated_at: string;
  repo_checkpoint_commit: string;
  grant_docs_present: boolean;
  grant_doc_paths: Record<GrantKitDocIdV1, string>;
  grant_doc_present: Record<GrantKitDocIdV1, boolean>;
  truth_policy_route_present: boolean;
  wrong_part_prevention_route_present: boolean;
  public_trust_pages_present: boolean;
  truth_claims_register_has_forbidden_section: boolean;
  forbidden_claim_violations: string[];
  unproven_metric_violations: string[];
  ecommerce_positioning_risk: PositioningRiskLevelV1;
  affiliate_overclaim_risk: PositioningRiskLevelV1;
  kit_ready_for_jared_review: boolean;
  grant_positioning_summary: string;
  proven_facts: string[];
  inferred_facts: string[];
  unknown_facts: string[];
};

export const GRANT_KIT_DOC_PATHS: Record<GrantKitDocIdV1, string> = {
  application_kit: "docs/grants/BuckParts-Grant-Application-Kit-v1.md",
  answer_bank: "docs/grants/BuckParts-Grant-Answer-Bank-v1.md",
  use_of_funds: "docs/grants/BuckParts-Grant-Use-Of-Funds-v1.md",
  truth_claims_register: "docs/grants/BuckParts-Grant-Truth-Claims-Register-v1.md",
};

/** Scanned for promotional forbidden claims (truth register excluded — it lists forbidden items). */
export const GRANT_KIT_TONE_SCAN_DOC_IDS: GrantKitDocIdV1[] = [
  "application_kit",
  "answer_bank",
  "use_of_funds",
];

const TRUTH_POLICY_REL = "src/app/truth-policy/page.tsx";
const WRONG_PART_PREVENTION_REL = "src/app/wrong-part-prevention/page.tsx";

const ECOMMERCE_RISK_PHRASES = [
  /\bonline store\b/i,
  /\bshop now\b/i,
  /\bbest price\b/i,
  /\bbuy direct\b/i,
  /\badd to cart\b/i,
  /\becommerce platform\b/i,
  /\bmarketplace first\b/i,
];

const AFFILIATE_OVERCLAIM_PHRASES = [
  /\baffiliate first\b/i,
  /\bcommission decides\b/i,
  /\bearn more if you buy\b/i,
  /\bwe only show links that pay\b/i,
  /\bguaranteed savings\b/i,
  /\bsave \$\d+/i,
];

const FORBIDDEN_PROMOTIONAL_CLAIMS: { id: string; pattern: RegExp; allowIfLineMatches?: RegExp }[] = [
  { id: "guaranteed_fit", pattern: /\bguaranteed fit\b/i },
  { id: "guaranteed_savings", pattern: /\bguaranteed savings\b/i },
  {
    id: "all_filters_verified",
    pattern: /\bevery filter (has been|is) verified\b/i,
  },
  {
    id: "complete_catalog_coverage",
    pattern: /\bcomplete catalog coverage\b/i,
    allowIfLineMatches: /do not claim|not claim|forbidden|never submit/i,
  },
  { id: "only_source_of_truth", pattern: /\bonly source of truth\b/i },
  { id: "definitive_authority", pattern: /\bdefinitive authority\b/i },
  { id: "affiliate_first", pattern: /\baffiliate first\b/i },
  { id: "we_are_online_store", pattern: /\bwe are an online store\b/i },
  { id: "whw_publicly_launched", pattern: /\bwhole-house water is publicly (launched|open|live)\b/i },
];

const UNPROVEN_METRIC_PATTERNS: { id: string; pattern: RegExp }[] = [
  { id: "numeric_users", pattern: /\b\d{1,7}\+?\s+(users|customers|visitors)\b/i },
  { id: "numeric_interviews", pattern: /\b\d{1,7}\+?\s+interviews\b/i },
  { id: "dollar_revenue", pattern: /\$\d[\d,]*\s*(MRR|ARR|revenue|in revenue)\b/i },
  { id: "percent_growth", pattern: /\b\d{1,3}%\s+(growth|conversion|retention)\b/i },
];

const METRIC_EXEMPT_LINE = /\bUNKNOWN\b|do not (assert|claim|invent|cite)|not (asserted|cited|in repo)|never submit/i;

function toAbs(rootDir: string, rel: string): string {
  return path.join(rootDir, ...rel.split("/"));
}

function assessEcommerceRisk(combinedCopy: string): PositioningRiskLevelV1 {
  const safeLines = combinedCopy
    .split("\n")
    .filter((line) => !FORBIDDEN_EXEMPT_LINE.test(line))
    .join("\n");
  const hits = ECOMMERCE_RISK_PHRASES.filter((re) => re.test(safeLines)).length;
  const hasNotStore =
    /not a store/i.test(combinedCopy) ||
    /not an online store/i.test(combinedCopy) ||
    /not ecommerce/i.test(combinedCopy) ||
    /is not ecommerce/i.test(combinedCopy);
  if (hits >= 2) return "HIGH";
  if (hits === 1 && !hasNotStore) return "MEDIUM";
  return "LOW";
}

const FORBIDDEN_EXEMPT_LINE =
  /do not claim|does not claim|not claim|never submit|forbidden|would not fund|must not|do not assert|not assert/i;

function assessAffiliateOverclaimRisk(combinedCopy: string): PositioningRiskLevelV1 {
  const safeLines = combinedCopy
    .split("\n")
    .filter((line) => !FORBIDDEN_EXEMPT_LINE.test(line))
    .join("\n");
  const badHits = AFFILIATE_OVERCLAIM_PHRASES.filter((re) => re.test(safeLines)).length;
  const goodHits = /secondary to truth|affiliate links do not decide|revenue does not override/i.test(
    combinedCopy,
  );
  if (badHits >= 1) return "HIGH";
  if (!goodHits) return "MEDIUM";
  return "LOW";
}

function scanLineViolations(
  relPath: string,
  text: string,
  rules: { id: string; pattern: RegExp; allowIfLineMatches?: RegExp }[],
): string[] {
  const violations: string[] = [];
  const lines = text.split("\n");
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]!;
    if (FORBIDDEN_EXEMPT_LINE.test(line)) continue;
    for (const rule of rules) {
      if (!rule.pattern.test(line)) continue;
      if (rule.allowIfLineMatches?.test(line)) continue;
      violations.push(`${relPath}:${i + 1}:${rule.id}`);
    }
  }
  return violations;
}

function scanUnprovenMetrics(relPath: string, text: string): string[] {
  const violations: string[] = [];
  const lines = text.split("\n");
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]!;
    if (METRIC_EXEMPT_LINE.test(line)) continue;
    for (const rule of UNPROVEN_METRIC_PATTERNS) {
      if (rule.pattern.test(line)) {
        violations.push(`${relPath}:${i + 1}:${rule.id}`);
      }
    }
  }
  return violations;
}

export function buildBuckpartsGrantApplicationKitReadinessV1(input: {
  rootDir: string;
  repoCheckpointCommit?: string;
  fileExists?: (absolutePath: string) => boolean;
  readTextFile?: (absolutePath: string) => string;
}): BuckpartsGrantApplicationKitReadinessV1 {
  const fileExists = input.fileExists ?? ((abs: string) => existsSync(abs));
  const readTextFile = input.readTextFile ?? ((abs: string) => readFileSync(abs, "utf8"));

  const proven_facts: string[] = [];
  const inferred_facts: string[] = [];
  const unknown_facts: string[] = [];

  const grant_doc_present = {} as Record<GrantKitDocIdV1, boolean>;
  for (const [id, rel] of Object.entries(GRANT_KIT_DOC_PATHS) as [GrantKitDocIdV1, string][]) {
    grant_doc_present[id] = fileExists(toAbs(input.rootDir, rel));
    if (grant_doc_present[id]) {
      proven_facts.push(`Grant doc present: ${rel}`);
    } else {
      unknown_facts.push(`Grant doc missing: ${rel}`);
    }
  }

  const grant_docs_present = Object.values(grant_doc_present).every(Boolean);

  const truthPolicyPresent = fileExists(toAbs(input.rootDir, TRUTH_POLICY_REL));
  const wrongPartPresent = fileExists(toAbs(input.rootDir, WRONG_PART_PREVENTION_REL));
  const public_trust_pages_present = truthPolicyPresent && wrongPartPresent;

  if (truthPolicyPresent) proven_facts.push(`Trust page present: ${TRUTH_POLICY_REL}`);
  if (wrongPartPresent) proven_facts.push(`Trust page present: ${WRONG_PART_PREVENTION_REL}`);

  let truthRegisterText = "";
  if (grant_doc_present.truth_claims_register) {
    truthRegisterText = readTextFile(toAbs(input.rootDir, GRANT_KIT_DOC_PATHS.truth_claims_register));
  }
  const truth_claims_register_has_forbidden_section =
    /## Forbidden claims/i.test(truthRegisterText) && /never submit as fact/i.test(truthRegisterText);

  if (truth_claims_register_has_forbidden_section) {
    proven_facts.push("Truth claims register includes Forbidden claims section.");
  } else if (grant_doc_present.truth_claims_register) {
    unknown_facts.push("Truth claims register missing expected Forbidden claims section.");
  }

  const forbidden_claim_violations: string[] = [];
  const unproven_metric_violations: string[] = [];
  let toneScanCopy = "";

  for (const docId of GRANT_KIT_TONE_SCAN_DOC_IDS) {
    if (!grant_doc_present[docId]) continue;
    const rel = GRANT_KIT_DOC_PATHS[docId];
    const text = readTextFile(toAbs(input.rootDir, rel));
    toneScanCopy += text;
    forbidden_claim_violations.push(...scanLineViolations(rel, text, FORBIDDEN_PROMOTIONAL_CLAIMS));
    unproven_metric_violations.push(...scanUnprovenMetrics(rel, text));
  }

  if (forbidden_claim_violations.length === 0 && grant_docs_present) {
    proven_facts.push("No forbidden promotional claims detected in kit tone-scan docs.");
  }
  if (unproven_metric_violations.length === 0 && grant_docs_present) {
    proven_facts.push("No unproven numeric traction metrics asserted in kit tone-scan docs.");
  }

  const grantReadiness = buildBuckpartsGrantReadinessV1({
    rootDir: input.rootDir,
    fileExists,
    readTextFile,
  });

  const combinedRiskCopy = `${toneScanCopy}\n${grantReadiness.grant_positioning_summary}`;
  const ecommerce_positioning_risk = grant_docs_present
    ? assessEcommerceRisk(combinedRiskCopy)
    : "HIGH";
  const affiliate_overclaim_risk = grant_docs_present
    ? assessAffiliateOverclaimRisk(combinedRiskCopy)
    : "HIGH";

  if (grantReadiness.ecommerce_positioning_risk === "LOW") {
    proven_facts.push("Public trust pack ecommerce_positioning_risk remains LOW.");
  }
  if (grantReadiness.affiliate_overclaim_risk === "LOW") {
    proven_facts.push("Public trust pack affiliate_overclaim_risk remains LOW.");
  }

  const fridgeState = getVerticalLaunchState("refrigerator");
  const apState = getVerticalLaunchState("air-purifier");
  const whwState = getVerticalLaunchState("whole-house-water");
  proven_facts.push(`Launch states in repo: refrigerator=${fridgeState}, air-purifier=${apState}, whole-house-water=${whwState}.`);

  inferred_facts.push(
    "Grant application kit v1 is documentation-only; it does not change product data, launch state, or buy gates.",
  );
  inferred_facts.push(
    "Kit is ready for Jared review when all docs exist, trust pages exist, and tone scans pass.",
  );

  unknown_facts.push(
    "Traffic, revenue, customer counts, interviews, grant eligibility, and Missouri/KC-region fit remain UNKNOWN unless Jared adds verified numbers.",
  );
  unknown_facts.push(
    "repo_checkpoint_commit in this report defaults to caller input or UNKNOWN — re-verify HEAD before submission.",
  );

  const kit_ready_for_jared_review =
    grant_docs_present &&
    public_trust_pages_present &&
    truth_claims_register_has_forbidden_section &&
    forbidden_claim_violations.length === 0 &&
    unproven_metric_violations.length === 0 &&
    ecommerce_positioning_risk === "LOW" &&
    affiliate_overclaim_risk === "LOW" &&
    grantReadiness.truth_policy_route_present &&
    grantReadiness.wrong_part_prevention_route_present;

  const grant_positioning_summary = kit_ready_for_jared_review
    ? "Grant Application Kit v1 docs exist, trust pages exist, forbidden-claim and unproven-metric scans pass, and ecommerce/affiliate positioning risks are LOW — ready for Jared to fill UNKNOWN fields before submission."
    : "Grant Application Kit v1 is incomplete or failed tone scans — resolve missing docs or violations before submission.";

  return {
    contract: BUCKPARTS_GRANT_APPLICATION_KIT_READINESS_CONTRACT_V1,
    read_only: true,
    data_mutation: false,
    generated_at: new Date().toISOString(),
    repo_checkpoint_commit: input.repoCheckpointCommit ?? "UNKNOWN",
    grant_docs_present,
    grant_doc_paths: { ...GRANT_KIT_DOC_PATHS },
    grant_doc_present,
    truth_policy_route_present: truthPolicyPresent,
    wrong_part_prevention_route_present: wrongPartPresent,
    public_trust_pages_present,
    truth_claims_register_has_forbidden_section,
    forbidden_claim_violations,
    unproven_metric_violations,
    ecommerce_positioning_risk,
    affiliate_overclaim_risk,
    kit_ready_for_jared_review,
    grant_positioning_summary,
    proven_facts,
    inferred_facts,
    unknown_facts,
  };
}
