/**
 * Owner-review UI prototype: homeowner-visible proof metadata gate for fridge model PDPs.
 * Scope: exactly the 21 SAFE_BUYER_PATH_PASS slugs from live customer-visible proof readiness.
 * Does not expand CTAs, invent links, emit Product JSON-LD offers, or claim live HTML proof.
 */

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

export type FridgeModelPdpVisibleProofCopyV1 = {
  heading: string;
  intro: string;
  proof_status: string;
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

export function buildFridgeModelPdpVisibleProofCopyV1(args: {
  partNumbers: readonly string[];
  lastCheckedYyyyMmDd: string | null;
}): FridgeModelPdpVisibleProofCopyV1 {
  const part_numbers_display = formatFridgeModelPdpVisibleProofPartNumbersV1(args.partNumbers);
  return {
    heading: "What we checked for this model",
    intro:
      "Before a store link appears on this page, we check a direct product page against the filter number(s) mapped to this fridge model.",
    proof_status: FRIDGE_MODEL_PDP_VISIBLE_PROOF_STATUS_SAFE_V1,
    last_checked_label: args.lastCheckedYyyyMmDd
      ? `Last checked ${args.lastCheckedYyyyMmDd}`
      : null,
    mapped_filters_label: "Filter number(s) to compare",
    part_numbers_display,
    identity_framing: FRIDGE_MODEL_PDP_VISIBLE_PROOF_COMPAT_FRAMING_V1,
    suppress_note: FRIDGE_MODEL_PDP_VISIBLE_PROOF_SUPPRESS_NOTE_V1,
    no_unsafe_cta_note: FRIDGE_MODEL_PDP_VISIBLE_PROOF_NO_UNSAFE_CTA_NOTE_V1,
  };
}
