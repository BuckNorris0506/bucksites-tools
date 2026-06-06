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

/** Draft owner browser proof result artifacts (read-only intake; no mutation). */
export const FRIDGE_OWNER_BROWSER_PROOF_RESULT_ARTIFACT_RELS_V1 = [
  FRIDGE_OWNER_BROWSER_PROOF_RESULT_WF3CB_REL_V1,
  FRIDGE_OWNER_BROWSER_PROOF_RESULT_EPTWFU01_REL_V1,
] as const;

export type OwnerBrowserProofResultUrlRowV1 = {
  url: string;
  retailer?: string;
  browser_proof_status?: string;
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
