/**
 * Read-only validation for draft owner browser proof result artifacts.
 * Planning/intake only — no CSV/Supabase/evidence mutation; no /go fetches.
 */

import { readFileSync } from "node:fs";
import path from "node:path";

import { FRIDGE_OWNER_BROWSER_PROOF_SESSION_RESULT_OPTIONS_V1 } from "./fridge-safe-link-owner-browser-proof-session-v1";

export const FRIDGE_OWNER_BROWSER_PROOF_RESULT_CONTRACT_V1 =
  "fridge_safe_link_owner_browser_proof_result_v1" as const;

export const FRIDGE_OWNER_BROWSER_PROOF_RESULT_WF3CB_REL_V1 =
  "data/fridge/batch-production/drafts/fridge-safe-link-owner-browser-proof-result-wf3cb-v1.json" as const;

export const FRIDGE_OWNER_BROWSER_PROOF_RESULT_EPTWFU01_REL_V1 =
  "data/fridge/batch-production/drafts/fridge-safe-link-owner-browser-proof-result-eptwfu01-v1.json" as const;

export const FRIDGE_OWNER_BROWSER_PROOF_RESULT_EDR3RXD1_REL_V1 =
  "data/fridge/batch-production/drafts/fridge-safe-link-owner-browser-proof-result-edr3rxd1-v1.json" as const;

export const FRIDGE_OWNER_BROWSER_PROOF_RESULT_EDR4RXD1_REL_V1 =
  "data/fridge/batch-production/drafts/fridge-safe-link-owner-browser-proof-result-edr4rxd1-v1.json" as const;

export const FRIDGE_OWNER_BROWSER_PROOF_RESULT_WFCB_REL_V1 =
  "data/fridge/batch-production/drafts/fridge-safe-link-owner-browser-proof-result-wfcb-v1.json" as const;

export const FRIDGE_OWNER_BROWSER_PROOF_RESULT_ULTRAWF_REL_V1 =
  "data/fridge/batch-production/drafts/fridge-safe-link-owner-browser-proof-result-ultrawf-v1.json" as const;

/** Draft owner browser proof result artifacts (read-only intake; no mutation). */
export const FRIDGE_OWNER_BROWSER_PROOF_RESULT_ARTIFACT_RELS_V1 = [
  FRIDGE_OWNER_BROWSER_PROOF_RESULT_WF3CB_REL_V1,
  FRIDGE_OWNER_BROWSER_PROOF_RESULT_EPTWFU01_REL_V1,
  FRIDGE_OWNER_BROWSER_PROOF_RESULT_EDR3RXD1_REL_V1,
  FRIDGE_OWNER_BROWSER_PROOF_RESULT_EDR4RXD1_REL_V1,
  FRIDGE_OWNER_BROWSER_PROOF_RESULT_WFCB_REL_V1,
  FRIDGE_OWNER_BROWSER_PROOF_RESULT_ULTRAWF_REL_V1,
] as const;

export type OwnerBrowserProofResultUrlRowV1 = {
  url: string;
  retailer?: string;
  browser_proof_status?: string;
  path_type?: string;
  proven_observations?: string[];
  inferred_observations?: string[];
  unknown_observations?: string[];
};

export type OwnerBrowserProofResultV1 = {
  contract: string;
  read_only?: boolean;
  data_mutation?: boolean;
  mutation_authorized?: boolean;
  verified_link_authorized?: boolean;
  csv_apply_authorized?: boolean;
  supabase_mutation_authorized?: boolean;
  evidence_write_authorized?: boolean;
  production_go_click_authorized?: boolean;
  command_center_closure_authorized?: boolean;
  truth_closure_authorized?: boolean;
  apply_planning_authorized?: boolean;
  slug: string;
  oem_part_token: string;
  verdict: string;
  owner_proof_urls: OwnerBrowserProofResultUrlRowV1[];
  unverified_candidates?: Array<{ url?: string; status?: string; reason?: string }>;
  hold_candidates?: OwnerBrowserProofResultUrlRowV1[];
  amazon_pass_candidates?: Array<
    OwnerBrowserProofResultUrlRowV1 & { assessment?: string }
  >;
  failed_candidates?: Array<
    OwnerBrowserProofResultUrlRowV1 & { action?: string; assessment?: string }
  >;
  urls_to_avoid?: Array<{
    retailer?: string;
    url?: string;
    action?: string;
    reason?: string;
    evidence_level?: string;
  }>;
  not_authorized?: string[];
  proven_facts?: string[];
  inferred_facts?: string[];
  unknown_facts?: string[];
};

function loadJson<T>(rootDir: string, rel: string): T {
  return JSON.parse(readFileSync(path.join(rootDir, rel), "utf8")) as T;
}

export function validateOwnerBrowserProofResultV1(
  result: OwnerBrowserProofResultV1,
): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  if (result.contract !== FRIDGE_OWNER_BROWSER_PROOF_RESULT_CONTRACT_V1) {
    errors.push(`contract must be ${FRIDGE_OWNER_BROWSER_PROOF_RESULT_CONTRACT_V1}`);
  }
  if (result.read_only !== true) errors.push("read_only must be true");
  if (result.data_mutation !== false) errors.push("data_mutation must be false");
  if (result.mutation_authorized !== false) errors.push("mutation_authorized must be false");
  if (result.verified_link_authorized !== false) {
    errors.push("verified_link_authorized must be false");
  }
  if (result.csv_apply_authorized !== false) errors.push("csv_apply_authorized must be false");
  if (result.supabase_mutation_authorized !== false) {
    errors.push("supabase_mutation_authorized must be false");
  }
  if (result.evidence_write_authorized !== false) {
    errors.push("evidence_write_authorized must be false");
  }
  if (result.production_go_click_authorized !== false) {
    errors.push("production_go_click_authorized must be false");
  }
  if (
    !(FRIDGE_OWNER_BROWSER_PROOF_SESSION_RESULT_OPTIONS_V1 as readonly string[]).includes(
      result.verdict,
    )
  ) {
    errors.push(`invalid verdict: ${result.verdict}`);
  }
  if (!result.slug?.trim()) errors.push("slug required");
  if (!result.oem_part_token?.trim()) errors.push("oem_part_token required");
  if (!Array.isArray(result.owner_proof_urls) || result.owner_proof_urls.length === 0) {
    errors.push("owner_proof_urls required");
  }
  for (const row of result.owner_proof_urls ?? []) {
    if (!row.url?.trim()) errors.push("owner_proof_urls row missing url");
  }
  if (!result.not_authorized?.includes("VALIDATION_PASS")) {
    errors.push("not_authorized must include VALIDATION_PASS");
  }

  return { valid: errors.length === 0, errors };
}

export function loadOwnerBrowserProofResultWf3cbV1(
  rootDir: string = process.cwd(),
): OwnerBrowserProofResultV1 {
  return loadJson<OwnerBrowserProofResultV1>(
    rootDir,
    FRIDGE_OWNER_BROWSER_PROOF_RESULT_WF3CB_REL_V1,
  );
}

export function loadOwnerBrowserProofResultEptwfu01V1(
  rootDir: string = process.cwd(),
): OwnerBrowserProofResultV1 {
  return loadJson<OwnerBrowserProofResultV1>(
    rootDir,
    FRIDGE_OWNER_BROWSER_PROOF_RESULT_EPTWFU01_REL_V1,
  );
}

export function loadOwnerBrowserProofResultEdr3rxd1V1(
  rootDir: string = process.cwd(),
): OwnerBrowserProofResultV1 {
  return loadJson<OwnerBrowserProofResultV1>(
    rootDir,
    FRIDGE_OWNER_BROWSER_PROOF_RESULT_EDR3RXD1_REL_V1,
  );
}

export function loadOwnerBrowserProofResultEdr4rxd1V1(
  rootDir: string = process.cwd(),
): OwnerBrowserProofResultV1 {
  return loadJson<OwnerBrowserProofResultV1>(
    rootDir,
    FRIDGE_OWNER_BROWSER_PROOF_RESULT_EDR4RXD1_REL_V1,
  );
}

export function loadOwnerBrowserProofResultWfcbV1(
  rootDir: string = process.cwd(),
): OwnerBrowserProofResultV1 {
  return loadJson<OwnerBrowserProofResultV1>(
    rootDir,
    FRIDGE_OWNER_BROWSER_PROOF_RESULT_WFCB_REL_V1,
  );
}

export function loadOwnerBrowserProofResultUltrawfV1(
  rootDir: string = process.cwd(),
): OwnerBrowserProofResultV1 {
  return loadJson<OwnerBrowserProofResultV1>(
    rootDir,
    FRIDGE_OWNER_BROWSER_PROOF_RESULT_ULTRAWF_REL_V1,
  );
}

export function loadOwnerBrowserProofResultArtifactsV1(
  rootDir: string = process.cwd(),
): OwnerBrowserProofResultV1[] {
  return FRIDGE_OWNER_BROWSER_PROOF_RESULT_ARTIFACT_RELS_V1.map((rel) =>
    loadJson<OwnerBrowserProofResultV1>(rootDir, rel),
  );
}

export function proveWf3cbOwnerBrowserProofPassV1(result: OwnerBrowserProofResultV1): {
  pass_verdict: boolean;
  proof_url_count: number;
  amazon_unverified: boolean;
} {
  return {
    pass_verdict: result.slug === "wf3cb" && result.verdict === "PASS_BROWSER_PROOF",
    proof_url_count: result.owner_proof_urls.length,
    amazon_unverified: (result.unverified_candidates ?? []).some((c) =>
      (c.url ?? "").includes("B0045LLC7K"),
    ),
  };
}

export function proveEptwfu01OwnerBrowserProofPassV1(result: OwnerBrowserProofResultV1): {
  pass_verdict: boolean;
  proof_url_count: number;
  amazon_hold_single_filter: boolean;
} {
  return {
    pass_verdict: result.slug === "eptwfu01" && result.verdict === "PASS_BROWSER_PROOF",
    proof_url_count: result.owner_proof_urls.length,
    amazon_hold_single_filter: (result.unverified_candidates ?? []).some((c) =>
      (c.url ?? "").includes("B0CXKH95V1"),
    ),
  };
}

export function proveEdr3rxd1OwnerBrowserProofPassV1(result: OwnerBrowserProofResultV1): {
  pass_verdict: boolean;
  whirlpool_proof_count: number;
  home_depot_held_not_buyable: boolean;
  amazon_pass_with_buckparts_tag: boolean;
  b087_hard_excluded: boolean;
} {
  const proofUrls = [
    ...result.owner_proof_urls,
    ...(result.amazon_pass_candidates ?? []),
    ...(result.hold_candidates ?? []),
  ];
  return {
    pass_verdict: result.slug === "edr3rxd1" && result.verdict === "PASS_BROWSER_PROOF",
    whirlpool_proof_count: result.owner_proof_urls.length,
    home_depot_held_not_buyable: (result.hold_candidates ?? []).some(
      (c) =>
        (c.url ?? "").includes("302727620") &&
        (c.browser_proof_status ?? "").includes("HOLD") &&
        (c.proven_observations ?? []).some((o) => o.toLowerCase().includes("unavailable")),
    ),
    amazon_pass_with_buckparts_tag: (result.amazon_pass_candidates ?? []).some(
      (c) =>
        (c.url ?? "").includes("B00UB441HS") &&
        (c.url ?? "").includes("tag=buckparts20-20"),
    ),
    b087_hard_excluded:
      !proofUrls.some((c) => (c.url ?? "").includes("B087PDLZL9")) &&
      (result.urls_to_avoid ?? []).some(
        (u) =>
          (u.url ?? "").includes("B087PDLZL9") && u.action === "HARD_DO_NOT_USE",
      ),
  };
}

export function proveEdr4rxd1OwnerBrowserProofPassV1(result: OwnerBrowserProofResultV1): {
  pass_verdict: boolean;
  proof_url_count: number;
  amazon_pass_single_pack: boolean;
} {
  return {
    pass_verdict: result.slug === "edr4rxd1" && result.verdict === "PASS_BROWSER_PROOF",
    proof_url_count: result.owner_proof_urls.length,
    amazon_pass_single_pack: result.owner_proof_urls.some(
      (u) =>
        (u.url ?? "").includes("B00UB38V2A") && u.browser_proof_status === "PASS",
    ),
  };
}

export function proveWfcbOwnerBrowserProofPassV1(result: OwnerBrowserProofResultV1): {
  pass_verdict: boolean;
  pass_proof_url_count: number;
  hold_out_of_stock_count: number;
  amazon_pass_candidate_count: number;
  swift_green_excluded: boolean;
} {
  return {
    pass_verdict: result.slug === "wfcb" && result.verdict === "PASS_BROWSER_PROOF",
    pass_proof_url_count: result.owner_proof_urls.length,
    hold_out_of_stock_count: (result.hold_candidates ?? []).length,
    amazon_pass_candidate_count: (result.amazon_pass_candidates ?? []).length,
    swift_green_excluded: (result.failed_candidates ?? []).some((c) =>
      (c.proven_observations ?? []).some((o) => o.includes("Swift Green")),
    ),
  };
}

export function proveUltrawfOwnerBrowserProofPassV1(result: OwnerBrowserProofResultV1): {
  pass_verdict: boolean;
  proof_url_count: number;
  amazon_pass_candidate_asin: boolean;
} {
  return {
    pass_verdict: result.slug === "ultrawf" && result.verdict === "PASS_BROWSER_PROOF",
    proof_url_count: result.owner_proof_urls.length,
    amazon_pass_candidate_asin: (result.amazon_pass_candidates ?? []).some((c) =>
      (c.url ?? "").includes("B002JAKRAM"),
    ),
  };
}
