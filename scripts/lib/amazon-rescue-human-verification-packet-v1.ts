/**
 * Read-only human verification packet for Amazon rescue tokens that lack
 * `data/evidence/amazon-{canonical_slug}-*.json` self-filter evidence.
 *
 * Field expectations are aligned with `scripts/report-amazon-refrigerator-token-precheck.ts`
 * (`exactTokenProof`, `evidenceBuyabilityProof`, `classifyAmazonAsinReusePolicy` inputs)
 * and `scripts/lib/amazon-asin-reuse-policy.ts` — repo truth over memory.
 */

/** Default queue from operator brief; deferred 4396842 is never included. */
export const AMAZON_RESCUE_HUMAN_VERIFICATION_DEFAULT_TOKENS = [
  "ADQ75795101",
  "DA97-08006B",
  "DA97-17376A",
  "DA97-19467C",
  "W10413645A",
] as const;

export const DEFERRED_EXCLUDED_RESCUE_TOKEN = "4396842";

export type HumanBrowserAllowedOutcomeV1 =
  | "DIRECT_BUYABLE_EXACT_TOKEN"
  | "BLOCKED_UNSAFE"
  | "NOT_FOUND"
  | "SEARCH_RESULTS_ONLY"
  | "HUMAN_BROWSER_VERIFICATION_REQUIRED";

export type ResolvedRowInputV1 = {
  token: string;
  canonical_slug: string | null;
  filter_id: string | null;
  resolution_via: string | null;
  resolution_error: string | null;
};

export type AmazonRescueHumanVerificationItemV1 = {
  token: string;
  canonical_slug: string | null;
  filter_id: string | null;
  resolution_via: string | null;
  resolution_error: string | null;
  expected_evidence_filename_prefix: string | null;
  expected_evidence_glob_note: string;
  exact_browser_checks: string[];
  allowed_outcomes: HumanBrowserAllowedOutcomeV1[];
  required_evidence_fields: ReadonlyArray<{ path: string; required_for: string }>;
  not_accepted_as_proof: string[];
  outcome_recording_hints: ReadonlyArray<{
    human_outcome: HumanBrowserAllowedOutcomeV1;
    record: string;
  }>;
};

export type AmazonRescueHumanVerificationPacketV1 = {
  report_name: "buckparts_amazon_rescue_human_verification_packet_v1";
  generated_at: string;
  read_only: true;
  data_mutation: false;
  scope: "refrigerator_water_amazon_rescue_human_browser_only";
  excluded_tokens: string[];
  items: AmazonRescueHumanVerificationItemV1[];
  references: ReadonlyArray<{ path: string; note: string }>;
};

const ALLOWED_OUTCOMES: HumanBrowserAllowedOutcomeV1[] = [
  "DIRECT_BUYABLE_EXACT_TOKEN",
  "BLOCKED_UNSAFE",
  "NOT_FOUND",
  "SEARCH_RESULTS_ONLY",
  "HUMAN_BROWSER_VERIFICATION_REQUIRED",
];

const NOT_ACCEPTED = [
  "Queue-only strings (e.g. `top_candidate_tokens_head` in another filter’s `amazon-*-live-outcome*.json`) — not self-filter PDP proof.",
  "Any evidence file whose basename does not match `amazon-{canonical_slug}-` for this token’s resolved `filters.slug` (precheck only ingests self-prefix files).",
  "ASIN reuse or buyability inferred from unrelated filters’ committed `retailer_links` rows.",
  "Amazon search results page as PDP: title must be a seller-controlled product PDP for the chosen ASIN.",
  "Token match only in sponsored ad text, reviews, Q&A, or “Customers also bought” — not seller-controlled PDP identity.",
] as const;

const BROWSER_CHECKS = [
  "Search Amazon for the exact OEM token string (case-insensitive ok for typing; record literal token as searched).",
  "Open a single product detail page (PDP) for one ASIN; copy canonical `/dp/{ASIN}` URL (10-char ASIN).",
  "Confirm the literal token appears in seller-controlled PDP title (or equivalent primary product identity Amazon shows for that ASIN).",
  "Record whether Add to Cart / Buy Now (or explicit out-of-stock / unavailable) is visible — do not guess inventory.",
  "Record OEM vs aftermarket vs unknown seller relationship from visible PDP copy only.",
  "If no defensible exact-token PDP exists, document that outcome explicitly (do not substitute a nearby part number).",
] as const;

/** Fields `report-amazon-refrigerator-token-precheck.ts` reads from each self-prefix evidence JSON. */
const REQUIRED_FIELDS: ReadonlyArray<{ path: string; required_for: string }> = [
  { path: "asin", required_for: "ASIN reuse policy (10-char); null only when NOT_FOUND with no PDP" },
  { path: "verdict", required_for: "`NO_SAFE_PDP_FOUND_FROM_OWNER_BROWSER_SEARCH` when no safe PDP (see precheck `noSafePdpFound`)" },
  { path: "browser_evidence.amazon_pdp_url_canonical", required_for: "Canonical PDP URL tied to `asin`" },
  {
    path: "browser_evidence.token_visible_in_pdp_title",
    required_for: "Exact-token proof branch (or top-level `exact_token_proof` / `owner_browser_finding.exact_token_visible_in_title`)",
  },
  {
    path: "browser_evidence.seller_title_visible",
    required_for: "`evidenceRelationshipProof` / seller-controlled copy (precheck)",
  },
  {
    path: "browser_evidence.oem_or_aftermarket",
    required_for: "`evidenceAttributionCanBeLabeled` (precheck)",
  },
  {
    path: "buyability_proof or browser_evidence.buy_path_visible or browser_evidence.browser_verdict",
    required_for: "`evidenceBuyabilityProof` (precheck)",
  },
  { path: "read_only: true, data_mutation: false", required_for: "Contract parity with existing evidence JSON" },
];

const OUTCOME_HINTS: ReadonlyArray<{ human_outcome: HumanBrowserAllowedOutcomeV1; record: string }> = [
  {
    human_outcome: "DIRECT_BUYABLE_EXACT_TOKEN",
    record:
      "Set `asin`, canonical `/dp/` URL, `browser_evidence.token_visible_in_pdp_title: true`, visible buy path, OEM/aftermarket attribution fields, `verdict` not `NO_SAFE_PDP_FOUND_FROM_OWNER_BROWSER_SEARCH`. Align `browser_verdict` with repo examples (e.g. `PASS_OEM_DIRECT_BUYABLE`) only if observation matches.",
  },
  {
    human_outcome: "BLOCKED_UNSAFE",
    record:
      "Document unsafe listing (wrong part, misleading pack, incompatible substitute) with visible PDP facts; do not assert BuckParts `retailer_links` approval — classification stays evidence-only.",
  },
  {
    human_outcome: "NOT_FOUND",
    record:
      "Use `verdict: NO_SAFE_PDP_FOUND_FROM_OWNER_BROWSER_SEARCH` and/or `owner_browser_finding` pattern like `data/evidence/amazon-4396842-owner-review-no-safe-pdp.2026-05-10.json`; `asin` may be null.",
  },
  {
    human_outcome: "SEARCH_RESULTS_ONLY",
    record:
      "If only search/SERP or non-PDP interstitial observed, set relationship / title proofs false or UNKNOWN so precheck does not treat as exact PDP.",
  },
  {
    human_outcome: "HUMAN_BROWSER_VERIFICATION_REQUIRED",
    record:
      "Save partial observations (ambiguous title, pack count unclear, collision visible) without claiming `PASS_OEM_DIRECT_BUYABLE`; precheck may stay UNKNOWN or policy `HUMAN_BROWSER_VERIFICATION_REQUIRED`.",
  },
];

const REFERENCES: ReadonlyArray<{ path: string; note: string }> = [
  {
    path: "scripts/report-amazon-refrigerator-token-precheck.ts",
    note: "Self evidence glob `amazon-${slugLower}-`; `exactTokenProof` / `evidenceBuyabilityProof` / `noSafePdpFound`",
  },
  { path: "scripts/lib/amazon-asin-reuse-policy.ts", note: "`classifyAmazonAsinReusePolicy` classification inputs" },
  {
    path: "data/evidence/amazon-edr1rxd1-oem-pdp-evidence.2026-05-04.json",
    note: "Example OEM PDP browser_evidence capture (read-only contract)",
  },
  {
    path: "data/evidence/amazon-4396842-owner-review-no-safe-pdp.2026-05-10.json",
    note: "Example NO_SAFE PDP owner review structure",
  },
];

export function evidenceFilenamePrefixForSlug(canonical_slug: string | null): string | null {
  if (!canonical_slug || !canonical_slug.trim()) return null;
  return `data/evidence/amazon-${canonical_slug.trim().toLowerCase()}-`;
}

export function normalizeTokenList(tokens: string[]): { use: string[]; excluded: string[] } {
  const excluded: string[] = [];
  const seen = new Set<string>();
  const use: string[] = [];
  for (const raw of tokens) {
    const t = raw.trim().toUpperCase();
    if (!t) continue;
    if (t === DEFERRED_EXCLUDED_RESCUE_TOKEN.toUpperCase()) {
      excluded.push(raw.trim());
      continue;
    }
    if (seen.has(t)) continue;
    seen.add(t);
    use.push(raw.trim());
  }
  return { use, excluded };
}

export function buildAmazonRescueHumanVerificationPacketV1(args: {
  generated_at: string;
  rows: ResolvedRowInputV1[];
  excluded_tokens?: string[];
}): AmazonRescueHumanVerificationPacketV1 {
  const items: AmazonRescueHumanVerificationItemV1[] = args.rows.map((row) => {
    const prefix = evidenceFilenamePrefixForSlug(row.canonical_slug);
    return {
      token: row.token,
      canonical_slug: row.canonical_slug,
      filter_id: row.filter_id,
      resolution_via: row.resolution_via,
      resolution_error: row.resolution_error,
      expected_evidence_filename_prefix: prefix,
      expected_evidence_glob_note: prefix
        ? `Save new read-only JSON under '${prefix}' + descriptive suffix + '.json' (see existing amazon-* evidence naming).`
        : "Resolve filter slug before saving; precheck requires `amazon-{slug}-` self-prefix files.",
      exact_browser_checks: [...BROWSER_CHECKS],
      allowed_outcomes: [...ALLOWED_OUTCOMES],
      required_evidence_fields: [...REQUIRED_FIELDS],
      not_accepted_as_proof: [...NOT_ACCEPTED],
      outcome_recording_hints: [...OUTCOME_HINTS],
    };
  });

  return {
    report_name: "buckparts_amazon_rescue_human_verification_packet_v1",
    generated_at: args.generated_at,
    read_only: true,
    data_mutation: false,
    scope: "refrigerator_water_amazon_rescue_human_browser_only",
    excluded_tokens: [...(args.excluded_tokens ?? [])],
    items,
    references: [...REFERENCES],
  };
}
