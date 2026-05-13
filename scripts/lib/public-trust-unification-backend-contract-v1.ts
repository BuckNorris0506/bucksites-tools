import path from "node:path";

import type { PublicTrustUnificationBackendContractV1 } from "./buckparts-command-center-v2-types";

/** Fixed set — scorecard lane is PROVEN only when every listed path exists under `rootDir` (repo evidence). */
export const PUBLIC_TRUST_UNIFICATION_REQUIRED_SIGNALS_V1 = [
  "part_trust_types_and_builders",
  "public_trust_copy_and_checklist",
  "trust_aware_buy_section",
  "tiered_buy_links_primary_cta",
  "launch_buy_links_gating_and_browser_truth_fields",
  "legacy_go_uuid_route_handoff",
  "no_buy_reason_model",
  "wrong_purchase_risk_model",
] as const;

const REQUIRED_PATH_GROUPS: { signal_id: (typeof PUBLIC_TRUST_UNIFICATION_REQUIRED_SIGNALS_V1)[number]; paths: string[] }[] =
  [
    { signal_id: "part_trust_types_and_builders", paths: ["src/lib/trust/part-trust.ts"] },
    { signal_id: "public_trust_copy_and_checklist", paths: ["src/lib/copy/public-trust.ts"] },
    { signal_id: "trust_aware_buy_section", paths: ["src/components/trust/TrustAwareBuySection.tsx"] },
    { signal_id: "tiered_buy_links_primary_cta", paths: ["src/components/TieredBuyLinks.tsx"] },
    {
      signal_id: "launch_buy_links_gating_and_browser_truth_fields",
      paths: ["src/lib/retailers/launch-buy-links.ts"],
    },
    { signal_id: "legacy_go_uuid_route_handoff", paths: ["src/app/go/[linkId]/route.ts"] },
    { signal_id: "no_buy_reason_model", paths: ["src/lib/no-buy/no-buy-reason.ts"] },
    { signal_id: "wrong_purchase_risk_model", paths: ["src/lib/risk/wrong-purchase-risk.ts"] },
  ];

const EVALUATED_SURFACE_SPECS = [
  {
    surface_id: "refrigerator_filter_slug_pdp_trust_shell",
    relPaths: [
      "src/app/filter/[slug]/page.tsx",
      "src/components/trust/TrustAwareBuySection.tsx",
      "src/lib/trust/part-trust.ts",
      "src/lib/copy/public-trust.ts",
      "src/lib/retailers/launch-buy-links.ts",
    ],
    evidence_basis:
      "Filter PDP imports TrustAwareBuySection; part-trust builds PartTrustSummary; public-trust supplies compare-before-buy copy; launch-buy-links gates buy rows including browser_truth_* fields.",
    compare_before_buying_guidance:
      "Use public-trust checklist lines and TrustAwareBuySection trust summary copy on the filter PDP — this contract does not execute pages.",
    safe_buy_cta_state:
      "TieredBuyLinks (used inside TrustAwareBuySection) renders a primary /go link when gated real links exist; otherwise shows the no-options copy path in TieredBuyLinks.",
    uncertainty_or_no_buy_fallback:
      "TrustAwareBuySection supports suppressBuy; TieredBuyLinks shows a neutral message when no gated real links remain after filterRealBuyRetailerLinks.",
    next_action:
      "Re-run this read-only contract after changing trust, copy, gating, or filter PDP wiring; no retailer_links mutations from this path.",
    provenance_source_fields_available:
      "Named in-repo: PartTrustSummary, buildPartPageTrust, TrustAwareBuySection props (trustSummary, suppressBuy, borderless, className), BuyLinkRow browser_truth_checked_at / browser_truth_classification / browser_truth_buyable_subtype (see launch-buy-links and TieredBuyLinks).",
  },
  {
    surface_id: "vertical_filter_and_model_pages_trust_shell",
    relPaths: [
      "src/components/vertical/VerticalFilterPageContent.tsx",
      "src/components/vertical/VerticalModelPageContent.tsx",
      "src/components/trust/TrustAwareBuySection.tsx",
    ],
    evidence_basis:
      "Vertical filter/model content modules import TrustAwareBuySection for non-fridge wedges (repo wiring only).",
    compare_before_buying_guidance:
      "Same compare-before-buy copy module as fridge filter path; vertical pages reuse TrustAwareBuySection rather than inventing a second buy shell.",
    safe_buy_cta_state:
      "Depends on the same TrustAwareBuySection + TieredBuyLinks stack as other PDPs when buy links are passed through.",
    uncertainty_or_no_buy_fallback:
      "UNKNOWN at page-runtime from this contract — only file presence is checked here.",
    next_action:
      "Inspect vertical loaders separately if a wedge-specific trust gap is suspected; this contract stays file-presence only.",
    provenance_source_fields_available:
      "VerticalModelPageContent / VerticalFilterPageContent import TrustAwareBuySection; model trust uses buildModelPageTrust in part-trust (not executed here).",
  },
  {
    surface_id: "legacy_go_uuid_route_handoff",
    relPaths: ["src/app/go/[linkId]/route.ts", "src/lib/retailers/launch-buy-links.ts"],
    evidence_basis:
      "Legacy fridge wedge go route loads retailer row by UUID and redirects; launch-buy-links defines browser-truth gating vocabulary used by buy UI.",
    compare_before_buying_guidance:
      "Users should still compare OEM statements on the PDP; /go is an outbound handoff, not a compatibility guarantee.",
    safe_buy_cta_state:
      "Go route returns goFallbackRedirect when UUID invalid or row missing — safe refusal without exposing arbitrary URLs.",
    uncertainty_or_no_buy_fallback:
      "Handler path returns fallback redirects on missing data; exact runtime branch is not executed in this contract.",
    next_action:
      "Keep go handler and getRetailerLinkById read paths aligned; no schema changes from this report.",
    provenance_source_fields_available:
      "Go route uses getRetailerLinkById; BuyLinkRow-shaped rows carry affiliate_url and retailer_key (see data layer imports in route file).",
  },
  {
    surface_id: "no_buy_and_wrong_purchase_risk_models",
    relPaths: ["src/lib/no-buy/no-buy-reason.ts", "src/lib/risk/wrong-purchase-risk.ts"],
    evidence_basis:
      "Dedicated modules encode no-buy reasons and wrong-purchase risk for operator-style pages and metrics (command surface references these areas).",
    compare_before_buying_guidance:
      "Treat these modules as structured uncertainty signals — not a substitute for OEM documentation review.",
    safe_buy_cta_state:
      "UNKNOWN for live CTA wiring from this slice alone — modules inform messaging/state; they do not authorize checkout.",
    uncertainty_or_no_buy_fallback:
      "no-buy and wrong-purchase modules are the repo-backed place to surface explicit no-buy / risk messaging when integrated.",
    next_action:
      "Cross-check command-surface page_state / no_buy_reason fields against these modules when extending metrics.",
    provenance_source_fields_available:
      "Exports depend on module definitions in the two files (read source for exact type and helper names).",
  },
  {
    surface_id: "about_page_static_meta_from_public_trust",
    relPaths: ["src/app/about/page.tsx", "src/lib/copy/public-trust.ts"],
    evidence_basis:
      "About page metadata description is imported from public-trust copy module — static SEO/trust alignment point.",
    compare_before_buying_guidance:
      "ABOUT_PAGE_META_DESCRIPTION is informational only; PDP compare steps remain on filter/model pages.",
    safe_buy_cta_state:
      "About route is informational; no buy CTA contract is asserted here beyond copy import wiring.",
    uncertainty_or_no_buy_fallback:
      "N/A for purchase — informational surface only.",
    next_action:
      "If global trust messaging changes, update public-trust and re-run this contract.",
    provenance_source_fields_available:
      "ABOUT_PAGE_META_DESCRIPTION from public-trust; Next metadata object in about/page.tsx.",
  },
] as const;

function toAbs(rootDir: string, rel: string): string {
  return path.join(rootDir, ...rel.split("/"));
}

export function buildPublicTrustUnificationBackendContractV1(input: {
  rootDir: string;
  fileExists: (absolutePath: string) => boolean;
}): PublicTrustUnificationBackendContractV1 {
  const proven_facts: string[] = [];
  const unknown_facts: string[] = [];
  const required_signals = [...PUBLIC_TRUST_UNIFICATION_REQUIRED_SIGNALS_V1];

  if (!input.rootDir || input.rootDir.trim() === "") {
    return {
      contract: "public_trust_unification_backend_contract_v1",
      runtime_status: "UNKNOWN_INPUT",
      page_contracts_evaluated_count: 0,
      proven_signal_count: 0,
      missing_signal_count: required_signals.length,
      coverage_status: "UNKNOWN",
      required_signals,
      evaluated_surfaces: [],
      proven_facts: ["rootDir was empty — cannot resolve repo-relative paths for trust signal files."],
      unknown_facts: ["Re-run with a valid repository root so file existence checks can execute."],
      owner_approval_required: false,
      data_mutation: false,
      read_only: true,
    };
  }

  let runtime_status: PublicTrustUnificationBackendContractV1["runtime_status"] = "OK";
  let blockedReason: string | null = null;

  const presentSignals = new Set<string>();
  const missingSignals = new Set<string>();

  for (const group of REQUIRED_PATH_GROUPS) {
    let allPresent = true;
    for (const rel of group.paths) {
      const abs = toAbs(input.rootDir, rel);
      try {
        if (!input.fileExists(abs)) allPresent = false;
      } catch (e) {
        runtime_status = "BLOCKED";
        blockedReason = `fileExists threw for ${rel}: ${e instanceof Error ? e.message : String(e)}`;
        allPresent = false;
      }
    }
    if (allPresent) presentSignals.add(group.signal_id);
    else missingSignals.add(group.signal_id);
  }

  if (runtime_status === "BLOCKED") {
    unknown_facts.push(blockedReason ?? "file_exists_check_blocked");
    return {
      contract: "public_trust_unification_backend_contract_v1",
      runtime_status: "BLOCKED",
      page_contracts_evaluated_count: 0,
      proven_signal_count: 0,
      missing_signal_count: required_signals.length,
      coverage_status: "BLOCKED",
      required_signals,
      evaluated_surfaces: [],
      proven_facts: [
        "public_trust_unification_backend_contract_v1 is read-only and performs existence checks only — no DB or retailer_links writes.",
      ],
      unknown_facts,
      owner_approval_required: false,
      data_mutation: false,
      read_only: true,
    };
  }

  const proven_signal_count = presentSignals.size;
  const missing_signal_count = missingSignals.size;

  let coverage_status: PublicTrustUnificationBackendContractV1["coverage_status"];
  if (proven_signal_count === required_signals.length) coverage_status = "PROVEN";
  else if (proven_signal_count > 0) coverage_status = "PARTIAL";
  else coverage_status = "UNKNOWN";

  if (coverage_status === "PROVEN") {
    proven_facts.push(
      `All ${required_signals.length} required trust signal path groups exist under repo root (fileExists).`,
      "Required modules cover: part trust summary builders, public compare/checklist copy, TrustAwareBuySection, TieredBuyLinks, launch-buy-links gating + browser_truth fields, legacy /go UUID route, no-buy reason model, wrong-purchase risk model.",
    );
  } else if (coverage_status === "PARTIAL") {
    proven_facts.push(
      `Partial trust signal coverage: ${proven_signal_count} of ${required_signals.length} required signal path groups exist.`,
    );
    unknown_facts.push(
      `Missing signal ids (path group not fully present): ${[...missingSignals].sort().join(", ") || "UNKNOWN"}.`,
    );
  } else {
    unknown_facts.push(
      "No required trust signal path groups were found — root may be wrong or checkout incomplete relative to this contract.",
    );
  }

  const evaluated_surfaces = EVALUATED_SURFACE_SPECS.slice(0, 5).map((spec) => {
    const found: string[] = [];
    const missing: string[] = [];
    for (const rel of spec.relPaths) {
      const abs = toAbs(input.rootDir, rel);
      if (input.fileExists(abs)) found.push(rel);
      else missing.push(rel);
    }
    const confidence_state =
      missing.length === 0 ? "PROVEN" : found.length === 0 ? "UNKNOWN" : ("PARTIAL" as const);
    const what_was_found =
      found.length > 0
        ? `Present paths (${found.length}): ${found.join("; ")}` +
          (missing.length > 0 ? ` — missing: ${missing.join("; ")}` : "")
        : `No evaluated paths found under root — missing: ${missing.join("; ")}`;

    return {
      surface_id: spec.surface_id,
      what_was_found,
      confidence_state,
      evidence_basis: spec.evidence_basis,
      compare_before_buying_guidance: spec.compare_before_buying_guidance,
      safe_buy_cta_state: spec.safe_buy_cta_state,
      uncertainty_or_no_buy_fallback: spec.uncertainty_or_no_buy_fallback,
      next_action: spec.next_action,
      provenance_source_fields_available: spec.provenance_source_fields_available,
    };
  });

  const page_contracts_evaluated_count = evaluated_surfaces.length;

  proven_facts.push(
    "Evaluated surfaces are capped and based on static path lists plus fileExists — they do not crawl all public routes.",
  );

  return {
    contract: "public_trust_unification_backend_contract_v1",
    runtime_status,
    page_contracts_evaluated_count,
    proven_signal_count,
    missing_signal_count,
    coverage_status,
    required_signals,
    evaluated_surfaces,
    proven_facts,
    unknown_facts,
    owner_approval_required: false,
    data_mutation: false,
    read_only: true,
  };
}
