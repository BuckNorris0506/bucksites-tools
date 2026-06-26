/**
 * GE Appliance Parts manufacturer configuration for safe-link rescue framework v1.
 */

import { isKnownBrokenUrl, isSearchPlaceholderBuyLink } from "@/lib/retailers/launch-buy-links";
import { inferGeAppliancePartsSpecUrlV1 } from "@/lib/owner-dashboard/batch-production-non-amazon-pdp-source-v1";

import { assessGswf2Conflation } from "./fridge-safe-link-gswf-ge-official-browser-capture-v1";
import {
  assessExactTokenInTitleOrH1WordBoundary,
  assessForbiddenTokensWrongFamily,
  allManufacturerGatesPass,
  isUrlOnHost,
  normManufacturerToken,
  type ManufacturerRescueManufacturerConfigV1,
  type ManufacturerRescueValidationGateV1,
  type PdpDiscoveryV1,
  type ValidationGateDerivationInputV1,
  type WrongFamilyAssessmentV1,
} from "./manufacturer-safe-link-rescue-framework-v1";
import type { OemBrowserClassification } from "./rpwfe-official-ge-browser-capture-v1";

export const GE_APPLIANCE_PARTS_HOST_V1 = "geapplianceparts.com" as const;
export const GE_SPEC_PDP_PATH_PATTERN_V1 = "/store/parts/spec/" as const;

export const GE_WRONG_FAMILY_FORBIDDEN_TOKENS_V1: Readonly<Record<string, readonly string[]>> = {
  xwf: ["XWFE"],
  xwfe: ["XWF"],
  gswf: ["GSWF2"],
  gswf2: ["GSWF"],
  mwf: ["MWFP"],
  "smartwater-mwfp": ["MWF"],
};

export const GE_SUPERSESSION_REVIEW_SLUGS_V1 = new Set<string>(["xwf", "xwfe"]);

export const GE_REFRIGERATOR_RESCUE_VALIDATION_GATE_IDS_V1 = [
  "ge_search_placeholder_detected",
  "ge_spec_pdp_url_discovered",
  "ge_spec_pdp_not_known_broken",
  "final_url_direct_spec_pdp",
  "exact_token_in_primary_slice",
  "official_ge_manufacturer_path",
  "direct_purchase_control_visible",
  "page_not_search_or_catalog",
  "page_not_blocked_or_error",
  "page_not_not_found",
  "wrong_family_token_not_detected",
  "browser_classification_direct_buyable",
  "supersession_review_cleared",
] as const;

export type GeRefrigeratorRescueValidationGateIdV1 =
  (typeof GE_REFRIGERATOR_RESCUE_VALIDATION_GATE_IDS_V1)[number];

const geSearchPlaceholderStrategy = {
  isSearchPlaceholderUrl(retailerKey: string | null | undefined, url: string): boolean {
    if (!isUrlOnHost(url, GE_APPLIANCE_PARTS_HOST_V1)) return false;
    return isSearchPlaceholderBuyLink(retailerKey ?? "oem-parts-catalog", url);
  },
};

const gePdpDiscoveryStrategy = {
  discoverPdpUrl(args: { filterSlug: string; oemPartToken: string }): PdpDiscoveryV1 | null {
    const token = normManufacturerToken(args.oemPartToken);
    if (!token) return null;
    const inferred = inferGeAppliancePartsSpecUrlV1(token);
    const url = inferred ?? `https://www.geapplianceparts.com/store/parts/spec/${token}`;
    return {
      filter_slug: args.filterSlug.trim().toLowerCase(),
      oem_part_token: token,
      discovered_url: url,
      discovery_provenance: "INFERRED_GE_SPEC",
      path_type: "official_manufacturer_spec_pdp",
      known_broken_destination: isKnownBrokenUrl(url),
    };
  },
  isOfficialPdpUrl(url: string): boolean {
    try {
      const u = new URL(url);
      return (
        u.hostname.toLowerCase().includes(GE_APPLIANCE_PARTS_HOST_V1) &&
        u.pathname.toLowerCase().includes("/parts/spec/")
      );
    } catch {
      return false;
    }
  },
  isDirectPdpFinalUrl(args: {
    filterSlug: string;
    oemPartToken: string;
    finalUrl: string;
  }): boolean {
    const u = args.finalUrl.toLowerCase();
    const tokenLower = normManufacturerToken(args.oemPartToken).toLowerCase();
    return (
      /\/parts\/spec\//i.test(u) &&
      (u.includes(`/spec/${tokenLower}`) || (u.includes(tokenLower) && !u.includes(`${tokenLower}2`)))
    );
  },
  isOfficialManufacturerPath(args: {
    finalUrl: string;
    title: string;
    h1Text: string;
    textSample: string;
  }): boolean {
    const u = args.finalUrl.toLowerCase();
    const blob = `${args.title}\n${args.h1Text}\n${args.textSample}`.toUpperCase();
    return (
      u.includes(GE_APPLIANCE_PARTS_HOST_V1) &&
      (blob.includes("GE") || blob.includes("GE APPLIANCE") || u.includes(GE_APPLIANCE_PARTS_HOST_V1))
    );
  },
};

const geWrongFamilyStrategy = {
  forbiddenTokensForSlug(filterSlug: string): readonly string[] {
    return GE_WRONG_FAMILY_FORBIDDEN_TOKENS_V1[filterSlug.trim().toLowerCase()] ?? [];
  },
  assess(args: {
    filterSlug: string;
    oemPartToken: string;
    finalUrl?: string;
    title?: string;
    h1Text?: string;
    textSample?: string;
    candidateToken?: string | null;
  }): WrongFamilyAssessmentV1 {
    return assessForbiddenTokensWrongFamily({
      ...args,
      forbiddenBySlug: GE_WRONG_FAMILY_FORBIDDEN_TOKENS_V1,
      slugHook: (input) => {
        if (input.filterSlug !== "gswf") return null;
        const conflation = assessGswf2Conflation(input);
        if (!conflation.blocked) return null;
        return {
          blocked: true,
          forbidden_tokens_checked: [...(GE_WRONG_FAMILY_FORBIDDEN_TOKENS_V1.gswf ?? [])],
          detected_forbidden_tokens: ["GSWF2"],
          notes: conflation.notes,
        };
      },
    });
  },
};

function deriveGeValidationGates(
  args: ValidationGateDerivationInputV1,
): ManufacturerRescueValidationGateV1[] {
  const slug = args.filterSlug.trim().toLowerCase();
  const token = normManufacturerToken(args.oemPartToken);
  const directPdp = gePdpDiscoveryStrategy.isDirectPdpFinalUrl({
    filterSlug: slug,
    oemPartToken: token,
    finalUrl: args.finalUrl,
  });
  const exactToken = assessExactTokenInTitleOrH1WordBoundary({
    oemPartToken: token,
    title: args.title,
    h1Text: args.h1Text,
  });
  const officialPath = gePdpDiscoveryStrategy.isOfficialManufacturerPath({
    finalUrl: args.finalUrl,
    title: args.title,
    h1Text: args.h1Text,
    textSample: args.textSample,
  });
  const purchaseVisible = args.purchaseActions.length > 0;
  const notSearch = args.classification !== "likely_search_results";
  const notBlocked =
    args.classification !== "likely_blocked" && args.classification !== "browser_error";
  const not404 = args.classification !== "likely_not_found";
  const directBuyable = args.classification === "direct_buyable";
  const supersession = GE_SUPERSESSION_REVIEW_SLUGS_V1.has(slug);
  const waiveWhenNoCapture = args.captureCompleted === false;

  const gate = (
    gate_id: GeRefrigeratorRescueValidationGateIdV1,
    pass: boolean,
    notes: string,
    waived = false,
  ): ManufacturerRescueValidationGateV1 => ({
    gate_id,
    status: waived ? "WAIVED" : pass ? "PASS" : args.captureCompleted === false ? "UNKNOWN" : "FAIL",
    notes,
  });

  return [
    gate(
      "ge_search_placeholder_detected",
      args.csvPrimaryIsSearchPlaceholder,
      args.csvPrimaryIsSearchPlaceholder
        ? "CSV primary row is GE catalog search placeholder"
        : "CSV primary is not a GE search placeholder (may be already applied)",
    ),
    gate(
      "ge_spec_pdp_url_discovered",
      args.discoveredPdpUrl !== null,
      args.discoveredPdpUrl ?? "no inferred GE spec PDP URL",
    ),
    gate(
      "ge_spec_pdp_not_known_broken",
      args.discoveredPdpKnownBroken !== true,
      args.discoveredPdpKnownBroken
        ? "repo truth marks inferred GE spec PDP as known_broken_destination"
        : "inferred GE spec PDP is not in known-broken registry",
    ),
    gate(
      "final_url_direct_spec_pdp",
      directPdp,
      directPdp ? `final URL is GE /parts/spec/ for ${token}` : "final URL is not direct GE spec PDP",
      waiveWhenNoCapture,
    ),
    gate(
      "exact_token_in_primary_slice",
      exactToken && !args.wrongFamily.blocked,
      exactToken
        ? `exact token ${token} visible in title or h1`
        : `exact token ${token} not proven in title/h1 primary slice`,
      waiveWhenNoCapture,
    ),
    gate(
      "official_ge_manufacturer_path",
      officialPath,
      officialPath ? "geapplianceparts.com official manufacturer path" : "official GE path not proven",
      waiveWhenNoCapture,
    ),
    gate(
      "direct_purchase_control_visible",
      purchaseVisible,
      purchaseVisible
        ? `purchase actions: ${args.purchaseActions.slice(0, 3).join(" | ")}`
        : "no Add to Cart / purchase control visible",
      waiveWhenNoCapture,
    ),
    gate(
      "page_not_search_or_catalog",
      notSearch,
      notSearch ? "page not classified as search/catalog" : "page classified as search or catalog",
      waiveWhenNoCapture,
    ),
    gate(
      "page_not_blocked_or_error",
      notBlocked,
      notBlocked ? "page not blocked/error" : `browser classification: ${args.classification}`,
      waiveWhenNoCapture,
    ),
    gate(
      "page_not_not_found",
      not404,
      not404 ? "page not 404/discontinued" : "page not found or unavailable",
      waiveWhenNoCapture,
    ),
    gate(
      "wrong_family_token_not_detected",
      !args.wrongFamily.blocked,
      args.wrongFamily.notes,
      waiveWhenNoCapture,
    ),
    gate(
      "browser_classification_direct_buyable",
      directBuyable,
      directBuyable
        ? "browser classification direct_buyable"
        : `classification: ${args.classification}`,
      waiveWhenNoCapture,
    ),
    gate(
      "supersession_review_cleared",
      !supersession,
      supersession
        ? "XWF/XWFE supersession — owner compatibility review required before apply"
        : "no supersession review required",
      !supersession,
    ),
  ];
}

const geValidationGateStrategy = {
  deriveGates(input: ValidationGateDerivationInputV1): ManufacturerRescueValidationGateV1[] {
    return deriveGeValidationGates(input);
  },
  allGatesPass(gates: ManufacturerRescueValidationGateV1[]): boolean {
    return allManufacturerGatesPass(gates);
  },
};

const geSupersessionPolicy = {
  requiresReview(filterSlug: string): boolean {
    return GE_SUPERSESSION_REVIEW_SLUGS_V1.has(filterSlug.trim().toLowerCase());
  },
  assess(args: {
    filterSlug: string;
    oemPartToken: string;
    title: string;
    h1Text: string;
    textSample: string;
  }) {
    const required = GE_SUPERSESSION_REVIEW_SLUGS_V1.has(args.filterSlug.trim().toLowerCase());
    return {
      required,
      notes: required
        ? "XWF/XWFE supersession — owner compatibility review required before apply"
        : null,
    };
  },
};

export const GE_MANUFACTURER_RESCUE_CONFIG_V1: ManufacturerRescueManufacturerConfigV1 = {
  manufacturer_key: "ge_appliance_parts",
  search_placeholder: geSearchPlaceholderStrategy,
  pdp_discovery: gePdpDiscoveryStrategy,
  wrong_family: geWrongFamilyStrategy,
  validation_gates: geValidationGateStrategy,
  supersession: geSupersessionPolicy,
  exact_token_mode: "title_h1_word_boundary",
  browser_capture_user_agent:
    "BuckPartsOEMBrowserTruth/1.0 (+https://buckparts.com; read-only GE official capture)",
};

/** Map legacy GE gate input field names to framework validation input. */
export function toGeValidationGateInput(args: {
  filterSlug: string;
  oemPartToken: string;
  csvPrimaryIsSearchPlaceholder: boolean;
  discoveredSpecUrl: string | null;
  discoveredSpecKnownBroken?: boolean;
  finalUrl: string;
  title: string;
  h1Text: string;
  textSample: string;
  purchaseActions: string[];
  classification: OemBrowserClassification;
  wrongFamily: WrongFamilyAssessmentV1;
  captureCompleted?: boolean;
}): ValidationGateDerivationInputV1 {
  return {
    filterSlug: args.filterSlug,
    oemPartToken: args.oemPartToken,
    csvPrimaryIsSearchPlaceholder: args.csvPrimaryIsSearchPlaceholder,
    discoveredPdpUrl: args.discoveredSpecUrl,
    discoveredPdpKnownBroken: args.discoveredSpecKnownBroken,
    finalUrl: args.finalUrl,
    title: args.title,
    h1Text: args.h1Text,
    textSample: args.textSample,
    purchaseActions: args.purchaseActions,
    classification: args.classification,
    wrongFamily: args.wrongFamily,
    captureCompleted: args.captureCompleted,
  };
}
