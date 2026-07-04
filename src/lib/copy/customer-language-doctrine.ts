/**
 * Customer language + trust definitions — version marker and paths for tests / Command Center.
 * Human-readable rules: `docs/BuckParts-CUSTOMER-LANGUAGE-AND-DEFINITIONS.md`.
 * Does not affect buy-path or redirect logic.
 */

/** Bump when doctrine or scan list changes meaningfully. */
export const CUSTOMER_LANGUAGE_DOCTRINE_VERSION = 4;

export const CUSTOMER_LANGUAGE_DOCTRINE_REL_PATH =
  "docs/BuckParts-CUSTOMER-LANGUAGE-AND-DEFINITIONS.md" as const;

export const UNIVERSAL_PAGE_TRUST_CONTRACT_REL_PATH =
  "docs/BuckParts-UNIVERSAL-PAGE-TRUST-CONTRACT.md" as const;

export const WATERDROP_DA29_00020B_RESEARCH_DRAFT_REL_PATH =
  "docs/drafts/waterdrop-da29-00020b-oem-vs-compatible-trust-module-v1.md" as const;

export const WATERDROP_DA29_00020B_EVIDENCE_REL_PATH =
  "data/evidence/waterdrop-da29-00020b-live-outcome.2026-05-20.json" as const;

export const WATERDROP_DA29_00020B_INSERT_PLAN_REL_PATH =
  "docs/waterdrop-da29-00020b-retailer-link-insert-plan.sql" as const;

/** Primary read-only live HTTP validation (GET probes against NEXT_PUBLIC_SITE_URL). */
export const LIVE_SITE_SMOKE_CHECK_NPM_SCRIPT_V1 = "buckparts:live-site-smoke:check" as const;

/** Shorter alias to the same check script. */
export const LIVE_SITE_SMOKE_CHECK_ALIAS_NPM_SCRIPT_V1 = "buckparts:live" as const;

/** Writes data/reports/buckparts-live-site-smoke.json (+ optional Supabase when configured). */
export const LIVE_SITE_SMOKE_ARTIFACT_NPM_SCRIPT_V1 = "buckparts:live-site-smoke" as const;

/** BuckParts public copy standard — not operator/QA vocabulary. */
export const FULL_TRUTH_OR_UNKNOWN_RULE_V1 =
  "Public BuckParts copy is FULL truth or UNKNOWN only — no mostly true, probably true, good enough, or partial-confidence homeowner claims." as const;

/** Durable “no OEM cold” rule text for Command Center / HQ handoff (not customer-facing HTML). */
export const NO_OEM_COLD_RULE_V1 =
  "Public BuckParts customer-facing copy must not use OEM unless defined first/immediately as original equipment manufacturer; prefer Samsung-made, official Samsung filter, compatible replacement filter, or non-Samsung replacement filter where accurate." as const;

/**
 * Backend phrases that must never appear in homeowner-facing public copy sources.
 * Matched case-insensitively in doctrine tests.
 */
export const PUBLIC_BANNED_BACKEND_HOMEOWNER_PHRASES_V1 = [
  "Wrong-family mappings removed",
  "Buy links are separate from fit proof",
  "No buy button until the evidence is clean",
  "Compatible filter confidence: proven / needs review / not safe yet",
] as const;

/**
 * Backend/system jargon that must not appear in public page source (case-insensitive).
 * Scanned on trust pages and key public copy entrypoints.
 */
export const PUBLIC_BANNED_BACKEND_JARGON_V1 = [
  "structured data",
  "repository",
  "buying options hidden",
  "unsafe buy path",
  "No buy button yet",
  "affiliate partnerships",
  "listing evidence",
  "search page",
  "buy path",
  "proof packet",
  "confidence state",
  "compat row",
] as const;

/**
 * Additional homeowner-facing leaks (ERROR copy / internal vocabulary).
 * Matched inside string literals only so identifiers and data-attributes are not false positives.
 * Short tokens (`repo`, `slug`) use word-boundary matching.
 */
export const PUBLIC_BANNED_CUSTOMER_COPY_LEAKS_V1 = [
  "repo",
  "repository",
  "supabase",
  "slug",
  "browser truth",
  "direct buyable",
  "search placeholder",
] as const;

/** Public trust routes scanned for backend jargon (homeowner copy). */
export const PUBLIC_TRUST_PAGE_REL_PATHS_V1 = [
  "src/app/truth-policy/page.tsx",
  "src/app/wrong-part-prevention/page.tsx",
] as const;

/**
 * Public customer-facing surfaces scanned for ERROR-copy / internal-jargon leaks.
 * Does not include owner dashboard, scripts, tests, data JSON, or docs.
 */
export const PUBLIC_CUSTOMER_COPY_SURFACE_REL_PATHS_V1 = [
  "src/components/fridge/FilterPdpRepoEvidenceSection.tsx",
  "src/app/search/page.tsx",
  "src/app/not-found.tsx",
  "src/app/air-purifier/search/page.tsx",
  "src/app/vacuum/search/page.tsx",
  "src/app/humidifier/search/page.tsx",
  "src/lib/fridge/fridge-filter-pdp-customer-safety-v1.ts",
] as const;

/** Extract quoted string literals from TS/TSX for customer-copy scans. */
export function extractPublicCopyStringLiteralsV1(source: string): string[] {
  const withoutBlockComments = source.replace(/\/\*[\s\S]*?\*\//g, "");
  const withoutLineComments = withoutBlockComments.replace(/^\s*\/\/.*$/gm, "");
  const literals: string[] = [];
  const re = /(["'`])((?:\\.|(?!\1)[^\\])*?)\1/g;
  let match: RegExpExecArray | null;
  while ((match = re.exec(withoutLineComments)) !== null) {
    const body = match[2] ?? "";
    if (body.includes("${")) continue;
    // Skip import/module paths and bare technical paths (no spaces).
    if ((body.startsWith("./") || body.startsWith("../") || body.startsWith("@/")) && !/\s/.test(body)) {
      continue;
    }
    if (body.includes("/") && !/\s/.test(body) && !body.includes("://")) {
      continue;
    }
    literals.push(body);
  }
  return literals;
}

/** True when a banned leak phrase appears in customer-facing string literals. */
export function publicCopyLiteralsContainBannedLeakV1(
  literals: readonly string[],
  bannedPhrase: string,
): boolean {
  const needle = bannedPhrase.toLowerCase();
  const useWordBoundary = !needle.includes(" ") && !needle.includes("_") && needle.length <= 12;
  for (const literal of literals) {
    const hay = literal.toLowerCase();
    if (useWordBoundary) {
      const escaped = needle.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      if (new RegExp(`\\b${escaped}\\b`, "i").test(hay)) return true;
    } else if (hay.includes(needle)) {
      return true;
    }
  }
  return false;
}

export type WaterdropLiveCtaStatusV1 = "NOT_LIVE" | "BLOCKED" | "LIVE";

/** Owner-facing Command Center / blocked-link queue remediation (not customer HTML). */
export const OWNER_MANUFACTURER_CATALOG_SEARCH_REMEDIATION_V1 =
  "Replace manufacturer catalog/search rows with verified direct product pages where exact part-number proof exists." as const;

/**
 * Purchase-option ranking after buy-path gates (not customer HTML).
 * Waterdrop-first only on committed exact-proof slices; Amazon remains default elsewhere.
 */
export const PURCHASE_OPTION_MONETIZATION_PRIORITY_V1 =
  "Active monetization priority: Waterdrop-first when exact proof slice exists and browser-truth gates pass; Amazon fallback when Waterdrop is absent, unsafe, or unproven. No broad Waterdrop rollout. Compatible-replacement labels must state not made by Samsung where applicable." as const;
