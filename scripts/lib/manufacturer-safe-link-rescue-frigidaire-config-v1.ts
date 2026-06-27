/**
 * Frigidaire manufacturer configuration for safe-link rescue framework v1.
 * PDP URL shapes are PROVEN only from owner browser proof — no token inference.
 */

import { existsSync, readFileSync } from "node:fs";
import path from "node:path";

import {
  isManufacturerSiteSearchUrl,
  isSearchPlaceholderBuyLink,
} from "@/lib/retailers/launch-buy-links";

import {
  FRIDGE_OWNER_BROWSER_PROOF_RESULT_EPTWFU01_REL_V1,
  FRIDGE_OWNER_BROWSER_PROOF_RESULT_ULTRAWF_REL_V1,
  FRIDGE_OWNER_BROWSER_PROOF_RESULT_WF3CB_REL_V1,
} from "./fridge-safe-link-owner-browser-proof-result-v1";
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

export const FRIGIDAIRE_OFFICIAL_HOST_V1 = "frigidaire.com" as const;
export const FRIGIDAIRE_PARTS_DISTRIBUTOR_HOST_V1 = "frigidaireapplianceparts.com" as const;

/** Slugs with committed frigidaire.com catalogsearch primary rows (repo truth). */
export const FRIGIDAIRE_RESCUE_SEARCH_PLACEHOLDER_SLUGS_V1 = [
  "wf3cb",
  "ultrawf",
  "eptwfu01",
  "fppwfu01",
  "wf2cb",
  "wfcb",
  "purepour",
  "frig-242017801",
  "frig-242086201",
  "frig-242294502",
] as const;

export type FrigidaireRescueCohortSlugV1 =
  (typeof FRIGIDAIRE_RESCUE_SEARCH_PLACEHOLDER_SLUGS_V1)[number];

export const FRIGIDAIRE_OWNER_PROOF_RESULT_REL_BY_SLUG_V1: Partial<
  Record<FrigidaireRescueCohortSlugV1, string>
> = {
  wf3cb: FRIDGE_OWNER_BROWSER_PROOF_RESULT_WF3CB_REL_V1,
  eptwfu01: FRIDGE_OWNER_BROWSER_PROOF_RESULT_EPTWFU01_REL_V1,
  ultrawf: FRIDGE_OWNER_BROWSER_PROOF_RESULT_ULTRAWF_REL_V1,
};

export const FRIGIDAIRE_WRONG_FAMILY_FORBIDDEN_TOKENS_V1: Readonly<
  Record<string, readonly string[]>
> = {
  ultrawf: ["EPTWFU01"],
  eptwfu01: ["ULTRAWF", "WF3CB"],
  wf3cb: ["EPTWFU01", "ULTRAWF"],
  "frig-242086201": ["EPTWFU01", "ULTRAWF"],
  fppwfu01: ["FPPWFU02"],
  purepour: ["FPPWFU02"],
};

export const FRIGIDAIRE_CONFUSION_FAMILY_REVIEW_SLUGS_V1 = new Set<string>([
  "ultrawf",
  "eptwfu01",
  "wf3cb",
  "frig-242086201",
  "fppwfu01",
  "wf2cb",
  "wfcb",
  "purepour",
]);

export const FRIGIDAIRE_REFRIGERATOR_RESCUE_VALIDATION_GATE_IDS_V1 = [
  "frigidaire_search_placeholder_detected",
  "frigidaire_official_pdp_url_proven_in_repo",
  "frigidaire_pdp_pattern_not_guessed",
  "final_url_direct_official_pdp",
  "exact_token_in_primary_slice",
  "official_frigidaire_manufacturer_path",
  "direct_purchase_control_visible",
  "page_not_search_or_catalog",
  "page_not_blocked_or_error",
  "page_not_not_found",
  "wrong_family_token_not_detected",
  "browser_classification_direct_buyable",
  "confusion_family_review_cleared",
] as const;

export type FrigidaireRefrigeratorRescueValidationGateIdV1 =
  (typeof FRIGIDAIRE_REFRIGERATOR_RESCUE_VALIDATION_GATE_IDS_V1)[number];

const frigidaireSearchPlaceholderStrategy = {
  isSearchPlaceholderUrl(retailerKey: string | null | undefined, url: string): boolean {
    if (!isUrlOnHost(url, FRIGIDAIRE_OFFICIAL_HOST_V1)) return false;
    return (
      isSearchPlaceholderBuyLink(retailerKey ?? "oem-parts-catalog", url) ||
      isManufacturerSiteSearchUrl(url) ||
      url.toLowerCase().includes("/catalogsearch/")
    );
  },
};

function isFrigidaireOfficialAccessoryPdpUrl(url: string): boolean {
  try {
    const u = new URL(url);
    const host = u.hostname.toLowerCase();
    const path = u.pathname.toLowerCase();
    return (
      host.includes(FRIGIDAIRE_OFFICIAL_HOST_V1) &&
      path.includes("/p/accessories/") &&
      path.includes("/water-filters/")
    );
  } catch {
    const lower = url.toLowerCase();
    return (
      lower.includes(FRIGIDAIRE_OFFICIAL_HOST_V1) &&
      lower.includes("/p/accessories/") &&
      lower.includes("/water-filters/")
    );
  }
}

function isFrigidairePartsDistributorPdpUrl(url: string): boolean {
  try {
    const u = new URL(url);
    return (
      u.hostname.toLowerCase().includes(FRIGIDAIRE_PARTS_DISTRIBUTOR_HOST_V1) &&
      u.pathname.toLowerCase().includes("/partdetail/")
    );
  } catch {
    return (
      url.toLowerCase().includes(FRIGIDAIRE_PARTS_DISTRIBUTOR_HOST_V1) &&
      url.toLowerCase().includes("/partdetail/")
    );
  }
}

const frigidairePdpDiscoveryStrategy = {
  discoverPdpUrl(): null {
    return null;
  },
  isOfficialPdpUrl(url: string): boolean {
    return isFrigidaireOfficialAccessoryPdpUrl(url) || isFrigidairePartsDistributorPdpUrl(url);
  },
  isDirectPdpFinalUrl(args: {
    filterSlug: string;
    oemPartToken: string;
    finalUrl: string;
  }): boolean {
    const token = normManufacturerToken(args.oemPartToken);
    const u = args.finalUrl.toLowerCase();
    const tokenLower = token.toLowerCase();
    if (!frigidairePdpDiscoveryStrategy.isOfficialPdpUrl(args.finalUrl)) return false;
    if (isFrigidaireOfficialAccessoryPdpUrl(args.finalUrl)) {
      return u.includes(`/water-filters/${tokenLower}`) || u.endsWith(`/${tokenLower}`);
    }
    if (isFrigidairePartsDistributorPdpUrl(args.finalUrl)) {
      return u.includes(`/partdetail/water-filter/${tokenLower}/`);
    }
    return false;
  },
  isOfficialManufacturerPath(args: {
    finalUrl: string;
    title: string;
    h1Text: string;
    textSample: string;
  }): boolean {
    const blob = `${args.title}\n${args.h1Text}\n${args.textSample}`.toUpperCase();
    if (isFrigidaireOfficialAccessoryPdpUrl(args.finalUrl)) {
      return (
        isUrlOnHost(args.finalUrl, FRIGIDAIRE_OFFICIAL_HOST_V1) &&
        (blob.includes("FRIGIDAIRE") || blob.includes("PURESOURCE"))
      );
    }
    if (isFrigidairePartsDistributorPdpUrl(args.finalUrl)) {
      return (
        isUrlOnHost(args.finalUrl, FRIGIDAIRE_PARTS_DISTRIBUTOR_HOST_V1) &&
        (blob.includes("FRIGIDAIRE") || blob.includes("Genuine OEM".toUpperCase()))
      );
    }
    return false;
  },
};

const frigidaireWrongFamilyStrategy = {
  forbiddenTokensForSlug(filterSlug: string): readonly string[] {
    return FRIGIDAIRE_WRONG_FAMILY_FORBIDDEN_TOKENS_V1[filterSlug.trim().toLowerCase()] ?? [];
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
      forbiddenBySlug: FRIGIDAIRE_WRONG_FAMILY_FORBIDDEN_TOKENS_V1,
    });
  },
};

function deriveFrigidaireValidationGates(
  args: ValidationGateDerivationInputV1 & {
    repoProvenOfficialPdpUrl: string | null;
    pdpPatternStatus: "UNKNOWN" | "PROVEN_PARTIAL";
  },
): ManufacturerRescueValidationGateV1[] {
  const slug = args.filterSlug.trim().toLowerCase();
  const token = normManufacturerToken(args.oemPartToken);
  const directPdp = frigidairePdpDiscoveryStrategy.isDirectPdpFinalUrl({
    filterSlug: slug,
    oemPartToken: token,
    finalUrl: args.finalUrl,
  });
  const exactToken = assessExactTokenInTitleOrH1WordBoundary({
    oemPartToken: token,
    title: args.title,
    h1Text: args.h1Text,
  });
  const officialPath = frigidairePdpDiscoveryStrategy.isOfficialManufacturerPath({
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
  const confusionReview = FRIGIDAIRE_CONFUSION_FAMILY_REVIEW_SLUGS_V1.has(slug);
  const waiveWhenNoCapture = args.captureCompleted === false;
  const repoProven = args.repoProvenOfficialPdpUrl !== null;

  const gate = (
    gate_id: FrigidaireRefrigeratorRescueValidationGateIdV1,
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
      "frigidaire_search_placeholder_detected",
      args.csvPrimaryIsSearchPlaceholder,
      args.csvPrimaryIsSearchPlaceholder
        ? "CSV primary row is Frigidaire catalogsearch placeholder"
        : "CSV primary is not a Frigidaire search placeholder",
    ),
    gate(
      "frigidaire_official_pdp_url_proven_in_repo",
      repoProven,
      repoProven
        ? `repo owner browser proof official URL: ${args.repoProvenOfficialPdpUrl}`
        : "no PASS owner browser proof official_manufacturer_pdp URL on disk for slug",
    ),
    gate(
      "frigidaire_pdp_pattern_not_guessed",
      true,
      repoProven
        ? `per-slug URL proven from owner proof; manufacturer-wide inferrable pattern: ${args.pdpPatternStatus}`
        : "adapter does not infer Frigidaire PDP URLs without repo proof",
    ),
    gate(
      "final_url_direct_official_pdp",
      directPdp,
      directPdp
        ? `final URL matches proven Frigidaire official PDP shape for ${token}`
        : "final URL is not direct Frigidaire official PDP",
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
      "official_frigidaire_manufacturer_path",
      officialPath,
      officialPath
        ? "Frigidaire official manufacturer or authorized parts distributor path"
        : "official Frigidaire path not proven",
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
      "confusion_family_review_cleared",
      !confusionReview,
      confusionReview
        ? "Frigidaire confusion-family slug — owner compatibility review required before apply"
        : "no confusion-family review required",
      !confusionReview,
    ),
  ];
}

const frigidaireValidationGateStrategy = {
  deriveGates(input: ValidationGateDerivationInputV1): ManufacturerRescueValidationGateV1[] {
    return deriveFrigidaireValidationGates({
      ...input,
      repoProvenOfficialPdpUrl: input.discoveredPdpUrl,
      pdpPatternStatus: "UNKNOWN",
    });
  },
  allGatesPass(gates: ManufacturerRescueValidationGateV1[]): boolean {
    return allManufacturerGatesPass(gates);
  },
};

const frigidaireSupersessionPolicy = {
  requiresReview(filterSlug: string): boolean {
    return FRIGIDAIRE_CONFUSION_FAMILY_REVIEW_SLUGS_V1.has(filterSlug.trim().toLowerCase());
  },
  assess(args: { filterSlug: string }) {
    const required = FRIGIDAIRE_CONFUSION_FAMILY_REVIEW_SLUGS_V1.has(
      args.filterSlug.trim().toLowerCase(),
    );
    return {
      required,
      notes: required
        ? "Frigidaire confusion-family slug — owner must confirm exact filter family before apply"
        : null,
    };
  },
};

export const FRIGIDAIRE_MANUFACTURER_RESCUE_CONFIG_V1: ManufacturerRescueManufacturerConfigV1 = {
  manufacturer_key: "frigidaire",
  search_placeholder: frigidaireSearchPlaceholderStrategy,
  pdp_discovery: frigidairePdpDiscoveryStrategy,
  wrong_family: frigidaireWrongFamilyStrategy,
  validation_gates: frigidaireValidationGateStrategy,
  supersession: frigidaireSupersessionPolicy,
  exact_token_mode: "title_h1_word_boundary",
  browser_capture_user_agent:
    "BuckPartsOEMBrowserTruth/1.0 (+https://buckparts.com; read-only Frigidaire official capture)",
};

export function loadFrigidaireRepoProvenOfficialTargetUrlV1(args: {
  rootDir: string;
  slug: string;
  fileExists?: (abs: string) => boolean;
  readTextFile?: (abs: string) => string;
}): {
  url: string | null;
  source: "owner_browser_proof_result" | "committed_browser_evidence" | null;
  path_type: string | null;
} {
  const slug = args.slug.trim().toLowerCase();
  const rel = FRIGIDAIRE_OWNER_PROOF_RESULT_REL_BY_SLUG_V1[slug as FrigidaireRescueCohortSlugV1];
  if (!rel) {
    return { url: null, source: null, path_type: null };
  }
  const fileExists = args.fileExists ?? existsSync;
  const readTextFile = args.readTextFile ?? ((abs: string) => readFileSync(abs, "utf8"));
  const abs = path.join(args.rootDir, rel);
  if (!fileExists(abs)) {
    return { url: null, source: null, path_type: null };
  }
  try {
    const parsed = JSON.parse(readTextFile(abs)) as {
      verdict?: string;
      owner_proof_urls?: Array<{
        url?: string;
        path_type?: string;
        browser_proof_status?: string;
      }>;
    };
    if (parsed.verdict !== "PASS_BROWSER_PROOF") {
      return { url: null, source: null, path_type: null };
    }
    for (const row of parsed.owner_proof_urls ?? []) {
      const url = (row.url ?? "").trim();
      if (!url || !frigidairePdpDiscoveryStrategy.isOfficialPdpUrl(url)) continue;
      if (row.path_type !== "official_manufacturer_pdp") continue;
      if ((row.browser_proof_status ?? "").trim() !== "PASS") continue;
      return {
        url,
        source: "owner_browser_proof_result",
        path_type: row.path_type,
      };
    }
  } catch {
    return { url: null, source: null, path_type: null };
  }
  return { url: null, source: null, path_type: null };
}

export function discoverFrigidaireProvenPdpUrl(args: {
  rootDir: string;
  filterSlug: string;
  oemPartToken: string;
  fileExists?: (abs: string) => boolean;
  readTextFile?: (abs: string) => string;
}): PdpDiscoveryV1 | null {
  const proven = loadFrigidaireRepoProvenOfficialTargetUrlV1({
    rootDir: args.rootDir,
    slug: args.filterSlug,
    fileExists: args.fileExists,
    readTextFile: args.readTextFile,
  });
  if (!proven.url) return null;
  return {
    filter_slug: args.filterSlug.trim().toLowerCase(),
    oem_part_token: normManufacturerToken(args.oemPartToken),
    discovered_url: proven.url,
    discovery_provenance: "PROVEN_OWNER_BROWSER_PROOF",
    path_type: proven.path_type ?? "official_manufacturer_pdp",
    known_broken_destination: false,
  };
}

export function frigidaireManufacturerPdpPatternStatusV1(args: {
  provenSlugCount: number;
  cohortSlugCount: number;
}): "UNKNOWN" | "PROVEN_PARTIAL" {
  if (args.provenSlugCount === 0) return "UNKNOWN";
  if (args.provenSlugCount < args.cohortSlugCount) return "PROVEN_PARTIAL";
  return "PROVEN_PARTIAL";
}

export function deriveFrigidaireRescueValidationGates(args: {
  filterSlug: string;
  oemPartToken: string;
  csvPrimaryIsSearchPlaceholder: boolean;
  repoProvenOfficialPdpUrl: string | null;
  pdpPatternStatus: "UNKNOWN" | "PROVEN_PARTIAL";
  finalUrl: string;
  title: string;
  h1Text: string;
  textSample: string;
  purchaseActions: string[];
  classification: OemBrowserClassification;
  wrongFamily: WrongFamilyAssessmentV1;
  captureCompleted?: boolean;
}): ManufacturerRescueValidationGateV1[] {
  return deriveFrigidaireValidationGates({
    filterSlug: args.filterSlug,
    oemPartToken: args.oemPartToken,
    csvPrimaryIsSearchPlaceholder: args.csvPrimaryIsSearchPlaceholder,
    discoveredPdpUrl: args.repoProvenOfficialPdpUrl,
    discoveredPdpKnownBroken: false,
    finalUrl: args.finalUrl,
    title: args.title,
    h1Text: args.h1Text,
    textSample: args.textSample,
    purchaseActions: args.purchaseActions,
    classification: args.classification,
    wrongFamily: args.wrongFamily,
    captureCompleted: args.captureCompleted,
    repoProvenOfficialPdpUrl: args.repoProvenOfficialPdpUrl,
    pdpPatternStatus: args.pdpPatternStatus,
  });
}

export function toFrigidaireValidationGateInput(args: {
  filterSlug: string;
  oemPartToken: string;
  csvPrimaryIsSearchPlaceholder: boolean;
  repoProvenOfficialPdpUrl: string | null;
  pdpPatternStatus: "UNKNOWN" | "PROVEN_PARTIAL";
  finalUrl: string;
  title: string;
  h1Text: string;
  textSample: string;
  purchaseActions: string[];
  classification: OemBrowserClassification;
  wrongFamily: WrongFamilyAssessmentV1;
  captureCompleted?: boolean;
}): ValidationGateDerivationInputV1 & {
  repoProvenOfficialPdpUrl: string | null;
  pdpPatternStatus: "UNKNOWN" | "PROVEN_PARTIAL";
} {
  return {
    filterSlug: args.filterSlug,
    oemPartToken: args.oemPartToken,
    csvPrimaryIsSearchPlaceholder: args.csvPrimaryIsSearchPlaceholder,
    discoveredPdpUrl: args.repoProvenOfficialPdpUrl,
    discoveredPdpKnownBroken: false,
    finalUrl: args.finalUrl,
    title: args.title,
    h1Text: args.h1Text,
    textSample: args.textSample,
    purchaseActions: args.purchaseActions,
    classification: args.classification,
    wrongFamily: args.wrongFamily,
    captureCompleted: args.captureCompleted,
    repoProvenOfficialPdpUrl: args.repoProvenOfficialPdpUrl,
    pdpPatternStatus: args.pdpPatternStatus,
  };
}
