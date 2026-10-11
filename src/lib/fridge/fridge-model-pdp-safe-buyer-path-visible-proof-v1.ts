/**
 * Owner-review UI prototype: homeowner-visible proof metadata gate for fridge model PDPs.
 * Scope: exactly the 21 SAFE_BUYER_PATH_PASS slugs from live customer-visible proof readiness.
 * Does not expand CTAs, invent links, emit Product JSON-LD offers, or claim live HTML proof.
 *
 * CHECKED_STORE_PROOF =
 *   allowlist scope (shouldShowFridgeModelPdpVisibleProofBlockV1)
 *   AND every displayed part has a link permitted by isLiveBuyerPathCtaEligibleV1.
 * Allowlist membership alone never emits the checked-store sentence.
 * Currency is that helper's existing LIVE_BROWSER_TRUTH_MAX_AGE_MS rule.
 */

import { isLiveBuyerPathCtaEligibleV1 } from "@/lib/retailers/live-buyer-path-go-decision-v1";

export const FRIDGE_MODEL_PDP_VISIBLE_PROOF_BLOCK_CONTRACT_V1 =
  "fridge_model_pdp_visible_proof_block_owner_review_v1" as const;

export const FRIDGE_MODEL_PDP_VISIBLE_PROOF_BLOCK_MARKER_V1 =
  "FridgeModelPdpVisibleProofBlock" as const;

/** Exact 21 SAFE_BUYER_PATH_PASS slugs (readiness packet / CTA-go PASS). */
export const FRIDGE_MODEL_PDP_SAFE_BUYER_PATH_VISIBLE_PROOF_SLUGS_V1 = [
  "frigidaire-ffhb2740ps",
  "frigidaire-fghb2868pf",
  "frigidaire-fgsc2335tf",
  "ge-cwe23sshww",
  "ge-gfe28gmkbb",
  "ge-gfe28gmkes",
  "ge-gfe28gskes",
  "ge-gfe28gskss",
  "ge-gfe28gynfs",
  "ge-gfe28hskss",
  "ge-gye22gskww",
  "ge-pfe28kmkww",
  "ge-pfe28kynbb",
  "samsung-rf263beaesr",
  "samsung-rf28nhedbsr",
  "samsung-rf28r7201sr",
  "samsung-rf28r7351sg",
  "whirlpool-wrf540cwhz",
  "whirlpool-wrs325sdhz",
  "whirlpool-wrx735sdhz",
  "whirlpool-wrx986sihz",
] as const;

export type FridgeModelPdpSafeBuyerPathVisibleProofSlugV1 =
  (typeof FRIDGE_MODEL_PDP_SAFE_BUYER_PATH_VISIBLE_PROOF_SLUGS_V1)[number];

export const FRIDGE_MODEL_PDP_VISIBLE_PROOF_EXCLUDED_FAIL_SLUGS_V1 = [
  "ge-gfe24jgkww",
  "ge-gfe27jmkes",
  "ge-gne25jmkww",
  "ge-gne27jstss",
  "ge-gse25hskss",
  "ge-gte18gsnrss",
  "ge-pvd28bymfs",
] as const;

export const FRIDGE_MODEL_PDP_VISIBLE_PROOF_EXCLUDED_QUARANTINED_SLUGS_V1 = [
  "lg-lfxc22596s",
  "lg-lfxs26973s",
  "lg-lfxs28968s",
  "lg-lmxs28626s",
  "lg-lrfvs3006s",
  "lg-lrfxs3106s",
  "samsung-rf27t5201sr",
  "samsung-rf27t5501sr",
  "samsung-rf28r6301sr",
  "samsung-rf28t5101sr",
  "samsung-rs22t5201sg",
] as const;

export const FRIDGE_MODEL_PDP_VISIBLE_PROOF_EXCLUDED_PARTIAL_SLUGS_V1 = [
  "ge-gfe28hmkww",
  "ge-gsc25frshss",
  "ge-gse26gshess",
] as const;

const SAFE_SLUG_SET = new Set<string>(FRIDGE_MODEL_PDP_SAFE_BUYER_PATH_VISIBLE_PROOF_SLUGS_V1);

export function normalizeFridgeModelPdpVisibleProofSlugV1(slug: string): string {
  return slug.trim().toLowerCase();
}

export function isFridgeModelPdpSafeBuyerPathVisibleProofSlugV1(slug: string): boolean {
  return SAFE_SLUG_SET.has(normalizeFridgeModelPdpVisibleProofSlugV1(slug));
}

/**
 * Fail-closed gate: block only on exact SAFE_BUYER_PATH_PASS allowlist, never quarantine,
 * never FAIL/PARTIAL, and only when at least one mapped filter exists.
 */
export function shouldShowFridgeModelPdpVisibleProofBlockV1(args: {
  fridgeModelSlug: string;
  quarantined: boolean;
  mappedFilterCount: number;
}): boolean {
  if (args.quarantined) return false;
  if (args.mappedFilterCount <= 0) return false;
  const slug = normalizeFridgeModelPdpVisibleProofSlugV1(args.fridgeModelSlug);
  if (!isFridgeModelPdpSafeBuyerPathVisibleProofSlugV1(slug)) return false;
  if (
    (FRIDGE_MODEL_PDP_VISIBLE_PROOF_EXCLUDED_FAIL_SLUGS_V1 as readonly string[]).includes(slug)
  ) {
    return false;
  }
  if (
    (FRIDGE_MODEL_PDP_VISIBLE_PROOF_EXCLUDED_QUARANTINED_SLUGS_V1 as readonly string[]).includes(
      slug,
    )
  ) {
    return false;
  }
  if (
    (FRIDGE_MODEL_PDP_VISIBLE_PROOF_EXCLUDED_PARTIAL_SLUGS_V1 as readonly string[]).includes(slug)
  ) {
    return false;
  }
  return true;
}

/** Homeowner proof status for safe buyer-path pages (no raw enums). */
export const FRIDGE_MODEL_PDP_VISIBLE_PROOF_STATUS_SAFE_V1 =
  "We checked a direct store product page against the filter number(s) listed for this model." as const;

export const FRIDGE_MODEL_PDP_VISIBLE_PROOF_COMPAT_FRAMING_V1 =
  "These are listed as compatible replacement filter numbers for this fridge model. Compare them to the text on the cartridge you remove before you buy." as const;

export const FRIDGE_MODEL_PDP_VISIBLE_PROOF_SUPPRESS_NOTE_V1 =
  "When we have not confirmed a safe store link, BuckParts suppresses buy guidance so you are not pointed at an unchecked page." as const;

export const FRIDGE_MODEL_PDP_VISIBLE_PROOF_NO_UNSAFE_CTA_NOTE_V1 =
  "A BuckParts Verified Link appears only after a product-page check clears. Search-only listings stay hidden." as const;

export type FridgeModelPdpVisibleProofLinkV1 = {
  retailer_key?: string | null;
  affiliate_url?: string | null;
  browser_truth_classification?: string | null;
  browser_truth_buyable_subtype?: string | null;
  browser_truth_notes?: string | null;
  browser_truth_checked_at?: string | null;
};

export type FridgeModelPdpVisibleProofFilterV1 = {
  oem_part_number?: string | null;
  retailer_links?: readonly FridgeModelPdpVisibleProofLinkV1[] | null;
};

export type FridgeModelPdpVisibleProofCopyV1 = {
  heading: string;
  intro: string;
  proof_status: string | null;
  last_checked_label: string | null;
  mapped_filters_label: string;
  part_numbers_display: string;
  identity_framing: string;
  suppress_note: string;
  no_unsafe_cta_note: string;
};

export function formatFridgeModelPdpVisibleProofPartNumbersV1(
  partNumbers: readonly string[],
): string {
  const cleaned = Array.from(
    new Set(partNumbers.map((p) => p.trim()).filter(Boolean)),
  );
  if (cleaned.length === 0) return "the filter number listed for this model";
  if (cleaned.length === 1) return cleaned[0]!;
  if (cleaned.length === 2) return `${cleaned[0]} and ${cleaned[1]}`;
  return `${cleaned.slice(0, -1).join(", ")}, and ${cleaned[cleaned.length - 1]}`;
}

export function pickLatestBrowserProofCheckedAtV1(
  checkedAtValues: readonly (string | null | undefined)[],
): string | null {
  let bestMs = Number.NEGATIVE_INFINITY;
  let bestIso: string | null = null;
  for (const raw of checkedAtValues) {
    if (!raw?.trim()) continue;
    const ms = Date.parse(raw);
    if (Number.isNaN(ms)) continue;
    if (ms > bestMs) {
      bestMs = ms;
      bestIso = raw.trim();
    }
  }
  return bestIso;
}

export function fridgeVisibleProofLinkIsCurrentEvidenceV1(
  link: FridgeModelPdpVisibleProofLinkV1,
  options?: { now?: Date },
): boolean {
  const affiliateUrl = link.affiliate_url?.trim() ?? "";
  if (!affiliateUrl) return false;
  return isLiveBuyerPathCtaEligibleV1(
    {
      retailer_key: link.retailer_key,
      affiliate_url: affiliateUrl,
      browser_truth_classification: link.browser_truth_classification,
      browser_truth_buyable_subtype: link.browser_truth_buyable_subtype,
      browser_truth_notes: link.browser_truth_notes,
      browser_truth_checked_at: link.browser_truth_checked_at,
    },
    { now: options?.now },
  );
}

export function splitCheckedStoreProofPartsV1(
  filters: readonly FridgeModelPdpVisibleProofFilterV1[],
  options?: { now?: Date },
): { displayedPartNumbers: string[]; qualifyingPartNumbers: string[] } {
  const displayedPartNumbers: string[] = [];
  const qualifyingPartNumbers: string[] = [];
  for (const filter of filters) {
    const partNumber = filter.oem_part_number?.trim() ?? "";
    if (!partNumber || displayedPartNumbers.includes(partNumber)) continue;
    displayedPartNumbers.push(partNumber);
    const links = filter.retailer_links ?? [];
    if (links.some((link) => fridgeVisibleProofLinkIsCurrentEvidenceV1(link, options))) {
      qualifyingPartNumbers.push(partNumber);
    }
  }
  return { displayedPartNumbers, qualifyingPartNumbers };
}

/** Aggregate sentence only when every displayed part has current buyer-path evidence. */
export function checkedStoreProofSentenceV1(
  displayedPartNumbers: readonly string[],
  qualifyingPartNumbers: readonly string[],
): string | null {
  if (qualifyingPartNumbers.length === 0 || displayedPartNumbers.length === 0) return null;
  const qualifying = new Set(qualifyingPartNumbers);
  const coversEveryDisplayedPart = displayedPartNumbers.every((part) => qualifying.has(part));
  if (coversEveryDisplayedPart) return FRIDGE_MODEL_PDP_VISIBLE_PROOF_STATUS_SAFE_V1;
  return `We checked a direct store product page against ${formatFridgeModelPdpVisibleProofPartNumbersV1(qualifyingPartNumbers)}.`;
}

export function buildFridgeModelPdpVisibleProofCopyV1(args: {
  partNumbers: readonly string[];
  qualifyingPartNumbers?: readonly string[];
  lastCheckedYyyyMmDd: string | null;
}): FridgeModelPdpVisibleProofCopyV1 {
  const part_numbers_display = formatFridgeModelPdpVisibleProofPartNumbersV1(args.partNumbers);
  const proof_status = checkedStoreProofSentenceV1(
    args.partNumbers,
    args.qualifyingPartNumbers ?? [],
  );
  return {
    heading: "What we checked for this model",
    intro:
      "Before a store link appears on this page, we check a direct product page against the filter number(s) mapped to this fridge model.",
    proof_status,
    last_checked_label:
      proof_status && args.lastCheckedYyyyMmDd
        ? `Last checked ${args.lastCheckedYyyyMmDd}`
        : null,
    mapped_filters_label: "Filter number(s) to compare",
    part_numbers_display,
    identity_framing: FRIDGE_MODEL_PDP_VISIBLE_PROOF_COMPAT_FRAMING_V1,
    suppress_note: FRIDGE_MODEL_PDP_VISIBLE_PROOF_SUPPRESS_NOTE_V1,
    no_unsafe_cta_note: FRIDGE_MODEL_PDP_VISIBLE_PROOF_NO_UNSAFE_CTA_NOTE_V1,
  };
}
