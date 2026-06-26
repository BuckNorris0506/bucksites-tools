/**
 * EveryDrop / Whirlpool manufacturer configuration for safe-link rescue framework v1.
 */

import {
  isManufacturerSiteSearchUrl,
  isSearchPlaceholderBuyLink,
} from "@/lib/retailers/launch-buy-links";

import {
  deriveEverydropStyleOfficialProofSignals,
  isUrlOnHost,
  loadRepoProvenOfficialTargetFromOwnerProof,
  normManufacturerToken,
  type ManufacturerRescueManufacturerConfigV1,
  type OfficialProofSignalsInputV1,
  type OfficialProofSignalsV1,
  type WrongFamilyAssessmentV1,
} from "./manufacturer-safe-link-rescue-framework-v1";
import type { OemBrowserClassification } from "./rpwfe-official-ge-browser-capture-v1";

export const WHIRLPOOL_OFFICIAL_HOST_V1 = "whirlpool.com" as const;
export const WHIRLPOOL_PARTS_SEARCH_HOST_V1 = "whirlpoolparts.com" as const;
export const WHIRLPOOL_OFFICIAL_ACCESSORY_PATH_V1 =
  "/accessories/kitchen-accessories/refrigerator/" as const;

export const EVERYDROP_WHIRLPOOL_RESCUE_COHORT_SLUGS_V1 = [
  "edr3rxd1",
  "edr4rxd1",
  "ukf8001",
  "w10413645a",
  "4396508",
  "4396395",
  "4396842",
] as const;

export type EverydropWhirlpoolRescueSlugV1 = (typeof EVERYDROP_WHIRLPOOL_RESCUE_COHORT_SLUGS_V1)[number];

export const EVERYDROP_WHIRLPOOL_OWNER_PROOF_RESULT_REL_BY_SLUG_V1: Partial<
  Record<EverydropWhirlpoolRescueSlugV1, string>
> = {
  edr3rxd1:
    "data/fridge/batch-production/drafts/fridge-safe-link-owner-browser-proof-result-edr3rxd1-v1.json",
  edr4rxd1:
    "data/fridge/batch-production/drafts/fridge-safe-link-owner-browser-proof-result-edr4rxd1-v1.json",
};

export const EVERYDROP_WRONG_FAMILY_FORBIDDEN_TOKENS_V1: Readonly<Record<string, readonly string[]>> =
  {};

const whirlpoolSearchPlaceholderStrategy = {
  isSearchPlaceholderUrl(retailerKey: string | null | undefined, url: string): boolean {
    if (!isUrlOnHost(url, WHIRLPOOL_PARTS_SEARCH_HOST_V1)) return false;
    return (
      isSearchPlaceholderBuyLink(retailerKey ?? "oem-parts-catalog", url) ||
      isManufacturerSiteSearchUrl(url) ||
      url.toLowerCase().includes("catalog.jsp") ||
      url.toLowerCase().includes("searchkeyword=")
    );
  },
};

const whirlpoolPdpDiscoveryStrategy = {
  discoverPdpUrl(): null {
    return null;
  },
  isOfficialPdpUrl(url: string): boolean {
    try {
      const u = new URL(url);
      const host = u.hostname.toLowerCase();
      const p = u.pathname.toLowerCase();
      return host.includes(WHIRLPOOL_OFFICIAL_HOST_V1) && p.includes(WHIRLPOOL_OFFICIAL_ACCESSORY_PATH_V1);
    } catch {
      const lower = url.toLowerCase();
      return lower.includes(WHIRLPOOL_OFFICIAL_HOST_V1) && lower.includes(WHIRLPOOL_OFFICIAL_ACCESSORY_PATH_V1);
    }
  },
  isDirectPdpFinalUrl(args: { finalUrl: string; filterSlug?: string; oemPartToken?: string }): boolean {
    return args.finalUrl.toLowerCase().includes(WHIRLPOOL_OFFICIAL_ACCESSORY_PATH_V1.slice(1));
  },
  isOfficialManufacturerPath(args: { finalUrl: string }): boolean {
    return (
      isUrlOnHost(args.finalUrl, WHIRLPOOL_OFFICIAL_HOST_V1) &&
      whirlpoolPdpDiscoveryStrategy.isOfficialPdpUrl(args.finalUrl) &&
      whirlpoolPdpDiscoveryStrategy.isDirectPdpFinalUrl({ finalUrl: args.finalUrl })
    );
  },
};

const everydropWrongFamilyStrategy = {
  forbiddenTokensForSlug(filterSlug: string): readonly string[] {
    return EVERYDROP_WRONG_FAMILY_FORBIDDEN_TOKENS_V1[filterSlug.trim().toLowerCase()] ?? [];
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
    const forbidden = everydropWrongFamilyStrategy.forbiddenTokensForSlug(args.filterSlug);
    return {
      blocked: false,
      forbidden_tokens_checked: [...forbidden],
      detected_forbidden_tokens: [],
      notes: "no forbidden wrong-family tokens detected",
    };
  },
};

const everydropValidationGateStrategy = {
  deriveGates() {
    return [];
  },
  allGatesPass() {
    return false;
  },
};

export function assessEverydropSupersessionForSlug(args: {
  slug: EverydropWhirlpoolRescueSlugV1;
  oemToken: string;
  title: string;
  h1Text: string;
  textSample: string;
}): { required: boolean; notes: string | null } {
  if (args.slug !== "w10413645a") {
    return { required: false, notes: null };
  }
  const blob = `${args.title}\n${args.h1Text}\n${args.textSample}`.toUpperCase();
  const legacy = blob.includes("W10413645A");
  const successor = blob.includes("EDR2RXD1");
  if (successor && !legacy) {
    return {
      required: true,
      notes:
        "Page identity emphasizes EDR2RXD1 successor without literal W10413645A — supersession label required before apply.",
    };
  }
  return {
    required: true,
    notes:
      "W10413645A is a legacy Whirlpool token superseded by EDR2RXD1 in repo discovery — owner must confirm official replacement PDP.",
  };
}

const everydropSupersessionPolicy = {
  requiresReview(filterSlug: string): boolean {
    return filterSlug.trim().toLowerCase() === "w10413645a";
  },
  assess(args: {
    filterSlug: string;
    oemPartToken: string;
    title: string;
    h1Text: string;
    textSample: string;
  }) {
    return assessEverydropSupersessionForSlug({
      slug: args.filterSlug as EverydropWhirlpoolRescueSlugV1,
      oemToken: args.oemPartToken,
      title: args.title,
      h1Text: args.h1Text,
      textSample: args.textSample,
    });
  },
};

export const EVERYDROP_WHIRLPOOL_MANUFACTURER_RESCUE_CONFIG_V1: ManufacturerRescueManufacturerConfigV1 =
  {
    manufacturer_key: "everydrop_whirlpool",
    search_placeholder: whirlpoolSearchPlaceholderStrategy,
    pdp_discovery: whirlpoolPdpDiscoveryStrategy,
    wrong_family: everydropWrongFamilyStrategy,
    validation_gates: everydropValidationGateStrategy,
    supersession: everydropSupersessionPolicy,
    exact_token_mode: "identity_blob_includes",
    browser_capture_user_agent:
      "BuckPartsOEMBrowserTruth/1.0 (+https://buckparts.com; read-only EveryDrop Whirlpool official capture)",
  };

export function loadEverydropRepoProvenOfficialTargetUrlV1(args: {
  rootDir: string;
  slug: EverydropWhirlpoolRescueSlugV1;
}): {
  url: string | null;
  source: "owner_browser_proof_result" | "committed_browser_evidence" | null;
} {
  return loadRepoProvenOfficialTargetFromOwnerProof({
    rootDir: args.rootDir,
    slug: args.slug,
    ownerProofRelBySlug: EVERYDROP_WHIRLPOOL_OWNER_PROOF_RESULT_REL_BY_SLUG_V1,
    isOfficialPdpUrl: whirlpoolPdpDiscoveryStrategy.isOfficialPdpUrl,
    requiredPathType: "official_manufacturer_pdp",
    requiredProofStatus: "PASS",
  });
}

export function deriveEverydropWhirlpoolProofSignalsFromFramework(args: {
  slug: EverydropWhirlpoolRescueSlugV1;
  oemToken: string;
  targetUrl: string | null;
  finalUrl: string;
  title: string;
  h1Text: string;
  textSample: string;
  purchaseActions: string[];
  classification: OemBrowserClassification;
  captureSucceeded: boolean;
}): OfficialProofSignalsV1 & {
  whirlpool_official_pdp_proof_result: "PROVEN" | "INFERRED" | "UNKNOWN";
  supersession_review_required: boolean;
  supersession_notes: string | null;
} {
  const supersession = assessEverydropSupersessionForSlug({
    slug: args.slug,
    oemToken: args.oemToken,
    title: args.title,
    h1Text: args.h1Text,
    textSample: args.textSample,
  });
  const wrongFamily = everydropWrongFamilyStrategy.assess({
    filterSlug: args.slug,
    oemPartToken: args.oemToken,
  });
  const input: OfficialProofSignalsInputV1 = {
    filterSlug: args.slug,
    oemPartToken: args.oemToken,
    targetUrl: args.targetUrl,
    finalUrl: args.finalUrl,
    title: args.title,
    h1Text: args.h1Text,
    textSample: args.textSample,
    purchaseActions: args.purchaseActions,
    classification: args.classification,
    captureSucceeded: args.captureSucceeded,
    wrongFamily,
    supersession,
    pdpDiscovery: whirlpoolPdpDiscoveryStrategy,
    exactTokenMode: "identity_blob_includes",
  };
  const derived = deriveEverydropStyleOfficialProofSignals(input);
  return {
    ...derived,
    whirlpool_official_pdp_proof_result: derived.official_pdp_proof_result,
    supersession_review_required: derived.supersession_review_required,
    supersession_notes: derived.supersession_notes,
  };
}
