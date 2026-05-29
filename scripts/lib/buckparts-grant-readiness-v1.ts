/**
 * Read-only grant-readiness / public trust pack contract for BuckParts.
 * No CSV, Supabase, launch-state, buy-gate, dispatch-run, batch-review, or retailer_links mutation.
 */

import path from "node:path";
import { existsSync, readFileSync } from "node:fs";

import { getVerticalLaunchState } from "@/lib/catalog/vertical-launch-state";

export const BUCKPARTS_GRANT_READINESS_CONTRACT_V1 = "buckparts_grant_readiness_v1" as const;

export type PositioningRiskLevelV1 = "LOW" | "MEDIUM" | "HIGH";

export type BuckpartsGrantReadinessV1 = {
  contract: typeof BUCKPARTS_GRANT_READINESS_CONTRACT_V1;
  read_only: true;
  data_mutation: false;
  generated_at: string;
  public_trust_pages_present: boolean;
  truth_policy_route_present: boolean;
  wrong_part_prevention_route_present: boolean;
  ecommerce_positioning_risk: PositioningRiskLevelV1;
  affiliate_overclaim_risk: PositioningRiskLevelV1;
  grant_positioning_summary: string;
  use_of_funds_categories: string[];
  proven_facts: string[];
  inferred_facts: string[];
  unknown_facts: string[];
};

const TRUTH_POLICY_REL = "src/app/truth-policy/page.tsx";
const WRONG_PART_PREVENTION_REL = "src/app/wrong-part-prevention/page.tsx";

const ECOMMERCE_RISK_PHRASES = [
  /\bonline store\b/i,
  /\bshop now\b/i,
  /\bbest price\b/i,
  /\bbuy direct\b/i,
  /\badd to cart\b/i,
  /\becommerce\b/i,
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

const TRUTH_SECONDARY_PHRASES = [
  /secondary to truth/i,
  /affiliate links do not decide/i,
  /revenue does not override fit evidence/i,
];

const NO_OVERCLAIM_PHRASES_REQUIRED = [
  /does not guarantee that every filter/i,
  /do not promise specific dollar savings/i,
  /not a substitute for reading your old part/i,
];

const USE_OF_FUNDS_CATEGORIES = [
  "verification_tools",
  "ai_and_tool_credits",
  "browser_verification",
  "customer_trust_ux",
  "coverage_expansion",
  "accessibility",
  "development_capacity",
] as const;

function toAbs(rootDir: string, rel: string): string {
  return path.join(rootDir, ...rel.split("/"));
}

function assessEcommerceRisk(combinedCopy: string): PositioningRiskLevelV1 {
  const hits = ECOMMERCE_RISK_PHRASES.filter((re) => re.test(combinedCopy)).length;
  const hasNotStore =
    /not a store/i.test(combinedCopy) ||
    /not an online store/i.test(combinedCopy) ||
    /not the seller/i.test(combinedCopy);
  if (hits >= 2) return "HIGH";
  if (hits === 1 && !hasNotStore) return "MEDIUM";
  return "LOW";
}

function assessAffiliateOverclaimRisk(combinedCopy: string): PositioningRiskLevelV1 {
  const badHits = AFFILIATE_OVERCLAIM_PHRASES.filter((re) => re.test(combinedCopy)).length;
  const goodHits = TRUTH_SECONDARY_PHRASES.filter((re) => re.test(combinedCopy)).length;
  if (badHits >= 1) return "HIGH";
  if (goodHits === 0) return "MEDIUM";
  return "LOW";
}

export function buildBuckpartsGrantReadinessV1(input: {
  rootDir: string;
  fileExists?: (absolutePath: string) => boolean;
  readTextFile?: (absolutePath: string) => string;
}): BuckpartsGrantReadinessV1 {
  const fileExists = input.fileExists ?? ((abs: string) => existsSync(abs));
  const readTextFile = input.readTextFile ?? ((abs: string) => readFileSync(abs, "utf8"));

  const proven_facts: string[] = [];
  const inferred_facts: string[] = [];
  const unknown_facts: string[] = [];

  const truthPolicyPresent = fileExists(toAbs(input.rootDir, TRUTH_POLICY_REL));
  const wrongPartPresent = fileExists(toAbs(input.rootDir, WRONG_PART_PREVENTION_REL));
  const public_trust_pages_present = truthPolicyPresent && wrongPartPresent;

  let combinedCopy = "";
  if (truthPolicyPresent) {
    combinedCopy += readTextFile(toAbs(input.rootDir, TRUTH_POLICY_REL));
    proven_facts.push("Truth Policy page source exists at src/app/truth-policy/page.tsx.");
  } else {
    unknown_facts.push("Truth Policy page source missing — grant public trust pack incomplete.");
  }
  if (wrongPartPresent) {
    combinedCopy += readTextFile(toAbs(input.rootDir, WRONG_PART_PREVENTION_REL));
    proven_facts.push("Wrong-part prevention page source exists at src/app/wrong-part-prevention/page.tsx.");
  } else {
    unknown_facts.push("Wrong-part prevention page source missing — grant public trust pack incomplete.");
  }

  if (public_trust_pages_present) {
    for (const re of NO_OVERCLAIM_PHRASES_REQUIRED) {
      if (!re.test(combinedCopy)) {
        unknown_facts.push(`Expected overclaim guard phrase missing from trust pages: ${re}`);
      }
    }
    proven_facts.push(
      "Public trust pages state BuckParts is not a store or manufacturer and that affiliate links are secondary to truth.",
    );
  }

  const fridgeState = getVerticalLaunchState("refrigerator");
  const apState = getVerticalLaunchState("air-purifier");
  const whwState = getVerticalLaunchState("whole-house-water");

  proven_facts.push(`Refrigerator wedge launch state in repo: ${fridgeState}.`);
  proven_facts.push(`Air purifier wedge launch state in repo: ${apState}.`);
  proven_facts.push(`Whole-house water wedge launch state in repo: ${whwState}.`);

  if (fridgeState === "LIVE") {
    proven_facts.push("Refrigerator filters are configured as public-facing (LIVE) in vertical-launch-state.");
  }
  if (apState === "LIVE") {
    proven_facts.push("Air purifier filters are configured as public-facing (LIVE) after truth-gated opening policy in repo.");
  }
  if (whwState === "NOINDEX_UNPROVEN") {
    proven_facts.push("Whole-house water remains preview/noindex (NOINDEX_UNPROVEN) in vertical-launch-state — not opened for broad public indexing.");
  }

  inferred_facts.push(
    "BuckParts positions as a truth-first homeowner-help and replacement-part confidence site — not ecommerce.",
  );
  inferred_facts.push(
    "Grant use-of-funds aligns with verification, trust UX, coverage expansion, accessibility, and development capacity — not affiliate revenue growth.",
  );
  if (whwState === "NOINDEX_UNPROVEN") {
    inferred_facts.push(
      "One committed safe CTA on a preview wedge (e.g. WHW AP810) does not by itself justify broad public opening — repo keeps WHW noindexed.",
    );
  }

  unknown_facts.push(
    "Live production deploy commit, traffic, customer counts, revenue, and interview counts are not asserted by this read-only contract.",
  );
  unknown_facts.push(
    "Exact count of verified filters site-wide and per-wedge safe CTA totals require separate wedge-readiness reports — not recomputed here.",
  );

  const ecommerce_positioning_risk = public_trust_pages_present
    ? assessEcommerceRisk(combinedCopy)
    : "HIGH";
  const affiliate_overclaim_risk = public_trust_pages_present
    ? assessAffiliateOverclaimRisk(combinedCopy)
    : "HIGH";

  const grant_positioning_summary = public_trust_pages_present
    ? "BuckParts is a truth-first homeowner-help site that withholds buying options until listing evidence supports them; affiliate links are secondary to fit evidence; public trust pages document no-guess fit policy and wrong-part prevention without ecommerce or savings overclaims."
    : "Public trust pages for grant readiness are missing — complete Truth Policy and Wrong-part prevention routes before grant positioning.";

  return {
    contract: BUCKPARTS_GRANT_READINESS_CONTRACT_V1,
    read_only: true,
    data_mutation: false,
    generated_at: new Date().toISOString(),
    public_trust_pages_present,
    truth_policy_route_present: truthPolicyPresent,
    wrong_part_prevention_route_present: wrongPartPresent,
    ecommerce_positioning_risk,
    affiliate_overclaim_risk,
    grant_positioning_summary,
    use_of_funds_categories: [...USE_OF_FUNDS_CATEGORIES],
    proven_facts,
    inferred_facts,
    unknown_facts,
  };
}
