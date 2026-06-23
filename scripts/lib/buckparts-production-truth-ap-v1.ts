/**
 * BuckParts Production Truth Test Suite v1 — Air Purifier runtime checks.
 * Uses the same Supabase loaders as production pages; read-only; no mutations.
 */

import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { parse } from "csv-parse/sync";

import type { AirPurifierFilterWithModels } from "@/lib/data/air-purifier/filters";
import type { AirPurifierModelWithFilters } from "@/lib/data/air-purifier/models";
import {
  buyLinkGateFailureKind,
  isDirectBuyableSafeCtaRow,
  selectBestVerifiedBuyLink,
} from "@/lib/retailers/launch-buy-links";
import { isAffiliateUrlSafeForGoRedirect } from "@/lib/retailers/go-redirect-gate";

import {
  PRODUCTION_TRUTH_GOLDEN_CASES_AP_V1,
  type ProductionTruthGoldenAssertionV1,
  type ProductionTruthGoldenCaseApV1,
} from "./buckparts-production-truth-golden-cases-ap-v1";

export const PRODUCTION_TRUTH_AP_CONTRACT_V1 = "buckparts_production_truth_ap_v1" as const;

export const PRODUCTION_TRUTH_AP_RETAILER_LINKS_CSV_REL_V1 =
  "data/air-purifier/retailer_links.csv" as const;

export type ProductionTruthAssertionResultV1 = {
  assertion_id: string;
  kind: ProductionTruthGoldenAssertionV1["kind"];
  testability: ProductionTruthGoldenAssertionV1["testability"];
  blocks_case_pass: boolean;
  status: "PASS" | "FAIL" | "SKIP" | "UNKNOWN";
  expected: string | boolean;
  actual: string | boolean | number | null;
  detail: string;
};

export type ProductionTruthInventoryWarningV1 = {
  assertion_id: string;
  kind: ProductionTruthGoldenAssertionV1["kind"];
  testability: ProductionTruthGoldenAssertionV1["testability"];
  status: "FAIL";
  expected: string | boolean;
  actual: string | boolean | number | null;
  detail: string;
};

export type ProductionTruthCaseResultV1 = {
  case_id: string;
  title: string;
  case_type: ProductionTruthGoldenCaseApV1["case_type"];
  /** Blocking assertions only (excludes inventory_warning / PARTIAL hygiene checks). */
  status: "PASS" | "FAIL" | "SKIP" | "UNKNOWN";
  /** safe_cta_present | safe_cta_absent when defined; otherwise mirrors blocking status. */
  customer_safety_status: "PASS" | "FAIL" | "SKIP" | "UNKNOWN";
  inventory_warnings: ProductionTruthInventoryWarningV1[];
  filter_slug: string | null;
  model_slug: string | null;
  authority_artifacts: string[];
  assertions: ProductionTruthAssertionResultV1[];
};

export type ProductionTruthApReportV1 = {
  contract: typeof PRODUCTION_TRUTH_AP_CONTRACT_V1;
  read_only: true;
  data_mutation: false;
  mutation_authorized: false;
  generated_at: string;
  supabase_configured: boolean;
  runtime_loader: "getAirPurifierFilterBySlug | getAirPurifierModelBySlug";
  summary: {
    total_cases: number;
    pass: number;
    fail: number;
    pass_with_inventory_warnings: number;
    inventory_warning_count: number;
    skip: number;
    unknown: number;
  };
  cases: ProductionTruthCaseResultV1[];
  proven_facts: string[];
  inferred_facts: string[];
  unknown_facts: string[];
};

export type CsvPrimaryAuthorityV1 = {
  filter_slug: string;
  affiliate_url: string;
  browser_truth_classification: string | null;
  csv_safe_direct_buyable: boolean;
};

export type ProductionTruthApDepsV1 = {
  rootDir?: string;
  now?: () => Date;
  getFilterBySlug?: (slug: string) => Promise<AirPurifierFilterWithModels | null>;
  getModelBySlug?: (slug: string) => Promise<AirPurifierModelWithFilters | null>;
  fetchRawApprovedLinks?: (filterId: string) => Promise<
    Array<{
      id: string;
      affiliate_url: string;
      is_primary: boolean;
      retailer_key: string | null;
      browser_truth_classification: string | null;
      browser_truth_buyable_subtype?: string | null;
      browser_truth_checked_at?: string | null;
    }>
  >;
  supabaseConfigured?: () => boolean;
};

function rootDirOf(deps: ProductionTruthApDepsV1): string {
  return deps.rootDir ?? process.cwd();
}

export function isSupabaseConfiguredForProductionTruth(): boolean {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const key =
    process.env.SUPABASE_SERVICE_ROLE_KEY?.trim() ||
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim();
  return Boolean(url && key);
}

export function loadCsvPrimaryAuthorityForFilterV1(
  rootDir: string,
  filterSlug: string,
): CsvPrimaryAuthorityV1 | null {
  const abs = path.join(rootDir, PRODUCTION_TRUTH_AP_RETAILER_LINKS_CSV_REL_V1);
  if (!existsSync(abs)) return null;
  const rows = parse(readFileSync(abs, "utf8"), {
    columns: true,
    skip_empty_lines: true,
    relax_column_count: true,
  }) as Array<Record<string, string>>;

  const slug = filterSlug.trim().toLowerCase();
  const primary = rows.find(
    (r) =>
      String(r.filter_slug ?? "")
        .trim()
        .toLowerCase() === slug && String(r.is_primary ?? "").trim().toLowerCase() === "true",
  );
  if (!primary) return null;

  const classification = (primary.browser_truth_classification ?? "").trim() || null;
  const affiliate_url = (primary.affiliate_url ?? primary.destination_url ?? "").trim();

  return {
    filter_slug: slug,
    affiliate_url,
    browser_truth_classification: classification,
    csv_safe_direct_buyable: classification === "direct_buyable" && affiliate_url.length > 0,
  };
}

/** Whether a golden assertion failure should fail case status and suite exit code. */
export function assertionBlocksCasePassV1(
  assertion: ProductionTruthGoldenAssertionV1,
): boolean {
  if (assertion.blocks_case_pass !== undefined) return assertion.blocks_case_pass;
  return assertion.testability !== "PARTIAL";
}

function summarizeAssertionStatuses(
  assertions: ProductionTruthAssertionResultV1[],
  predicate: (a: ProductionTruthAssertionResultV1) => boolean,
): ProductionTruthCaseResultV1["status"] {
  const scoped = assertions.filter(predicate);
  if (scoped.length === 0) return "UNKNOWN";
  if (scoped.some((a) => a.status === "FAIL")) return "FAIL";
  if (scoped.every((a) => a.status === "SKIP")) return "SKIP";
  if (scoped.some((a) => a.status === "UNKNOWN")) return "UNKNOWN";
  return "PASS";
}

function summarizeBlockingCaseStatus(
  assertions: ProductionTruthAssertionResultV1[],
): ProductionTruthCaseResultV1["status"] {
  return summarizeAssertionStatuses(assertions, (a) => a.blocks_case_pass);
}

function summarizeCustomerSafetyStatus(
  assertions: ProductionTruthAssertionResultV1[],
): ProductionTruthCaseResultV1["customer_safety_status"] {
  const safety = assertions.find(
    (a) => a.kind === "safe_cta_present" || a.kind === "safe_cta_absent",
  );
  if (safety) return safety.status;
  return summarizeBlockingCaseStatus(assertions);
}

function collectInventoryWarnings(
  assertions: ProductionTruthAssertionResultV1[],
): ProductionTruthInventoryWarningV1[] {
  return assertions
    .filter((a) => !a.blocks_case_pass && a.status === "FAIL")
    .map((a) => ({
      assertion_id: a.assertion_id,
      kind: a.kind,
      testability: a.testability,
      status: "FAIL" as const,
      expected: a.expected,
      actual: a.actual,
      detail: a.detail,
    }));
}

function evalAssertion(args: {
  assertion: ProductionTruthGoldenAssertionV1;
  filter: AirPurifierFilterWithModels | null;
  model: AirPurifierModelWithFilters | null;
  csvAuthority: CsvPrimaryAuthorityV1 | null;
  rawPrimaryAffiliateUrl: string | null;
}): ProductionTruthAssertionResultV1 {
  const { assertion, filter, model, csvAuthority, rawPrimaryAffiliateUrl } = args;
  const base = {
    assertion_id: assertion.assertion_id,
    kind: assertion.kind,
    testability: assertion.testability,
    blocks_case_pass: assertionBlocksCasePassV1(assertion),
    expected: assertion.expected,
  };

  if (!filter && !model) {
    return {
      ...base,
      status: "SKIP",
      actual: null,
      detail: "No runtime data — Supabase unavailable or slug not found.",
    };
  }

  const selectedBuy =
    filter != null
      ? selectBestVerifiedBuyLink(filter.retailer_links, undefined)
      : null;
  const selectedUrl = selectedBuy?.affiliate_url?.trim() ?? "";
  const safeCtaCount = filter?.retailer_links.length ?? 0;

  switch (assertion.kind) {
    case "safe_cta_present":
      return {
        ...base,
        status: safeCtaCount >= 1 ? "PASS" : "FAIL",
        actual: safeCtaCount,
        detail:
          safeCtaCount >= 1
            ? `Runtime gated safe CTA count=${safeCtaCount}.`
            : "Expected at least one safe buy row; got zero.",
      };

    case "safe_cta_absent":
      return {
        ...base,
        status: safeCtaCount === 0 ? "PASS" : "FAIL",
        actual: safeCtaCount,
        detail:
          safeCtaCount === 0
            ? "No gated safe CTA rows (expected suppression)."
            : `Expected suppression; runtime exposed ${safeCtaCount} safe row(s).`,
      };

    case "primary_affiliate_url_contains": {
      const needle = String(assertion.expected).toLowerCase();
      const hay = selectedUrl.toLowerCase();
      const pass = hay.includes(needle);
      return {
        ...base,
        status: pass ? "PASS" : "FAIL",
        actual: selectedUrl || rawPrimaryAffiliateUrl,
        detail: pass
          ? `Selected buy URL contains "${needle}".`
          : `Selected buy URL "${selectedUrl || rawPrimaryAffiliateUrl || "(none)"}" missing "${needle}".`,
      };
    }

    case "primary_affiliate_url_must_not_contain": {
      const needle = String(assertion.expected).toLowerCase();
      const hay = (rawPrimaryAffiliateUrl ?? selectedUrl).toLowerCase();
      if (!hay) {
        return {
          ...base,
          status: "PASS",
          actual: null,
          detail: "No primary URL exposed on gated buy path (suppression OK).",
        };
      }
      const pass = !hay.includes(needle);
      return {
        ...base,
        status: pass ? "PASS" : "FAIL",
        actual: hay,
        detail: pass
          ? `Primary path does not contain forbidden "${needle}".`
          : `Primary path still contains forbidden "${needle}".`,
      };
    }

    case "go_redirect_gate_safe": {
      if (!selectedBuy) {
        return {
          ...base,
          status: "SKIP",
          actual: false,
          detail: "No selected buy link to test /go gate.",
        };
      }
      const safe = isAffiliateUrlSafeForGoRedirect(
        selectedBuy.retailer_key,
        selectedBuy.affiliate_url,
        selectedBuy.browser_truth_classification ?? undefined,
        selectedBuy.browser_truth_buyable_subtype ?? null,
      );
      return {
        ...base,
        status: safe ? "PASS" : "FAIL",
        actual: safe,
        detail: safe
          ? "/go redirect gate passes for selected buy link."
          : ` /go redirect gate blocked: failure=${buyLinkGateFailureKind(selectedBuy) ?? "gate"}.`,
      };
    }

    case "csv_runtime_safe_cta_parity": {
      if (!csvAuthority) {
        return {
          ...base,
          status: "UNKNOWN",
          actual: null,
          detail: "CSV primary authority row not found.",
        };
      }
      const runtimeSafe = safeCtaCount >= 1;
      const csvSafe = csvAuthority.csv_safe_direct_buyable;
      const pass = csvSafe === runtimeSafe;
      if (csvSafe && !runtimeSafe) {
        return {
          ...base,
          status: "FAIL",
          actual: runtimeSafe,
          detail: `CSV says safe direct_buyable at ${csvAuthority.affiliate_url}; runtime has 0 gated safe rows (drift).`,
        };
      }
      if (!csvSafe && !runtimeSafe) {
        return {
          ...base,
          status: "PASS",
          actual: runtimeSafe,
          detail: "CSV and runtime both lack safe direct_buyable (aligned suppression).",
        };
      }
      return {
        ...base,
        status: pass ? "PASS" : "FAIL",
        actual: runtimeSafe,
        detail: pass
          ? "CSV safe-direct-buyable flag matches runtime safe CTA presence."
          : `CSV safe=${csvSafe} runtime safe=${runtimeSafe}.`,
      };
    }

    case "model_lists_filter": {
      const expectedSlug = String(assertion.expected);
      const found = model?.filters.some((f) => f.slug === expectedSlug) ?? false;
      return {
        ...base,
        status: found ? "PASS" : "FAIL",
        actual: model?.filters.map((f) => f.slug).join(",") ?? null,
        detail: found
          ? `Model lists expected filter ${expectedSlug}.`
          : `Model missing filter ${expectedSlug}; got [${model?.filters.map((f) => f.slug).join(", ") ?? ""}].`,
      };
    }

    case "filter_lists_model": {
      const expectedSlug = String(assertion.expected);
      const found = filter?.models.some((m) => m.slug === expectedSlug) ?? false;
      return {
        ...base,
        status: found ? "PASS" : "FAIL",
        actual: filter?.models.map((m) => m.slug).join(",") ?? null,
        detail: found
          ? `Filter lists expected model ${expectedSlug}.`
          : `Filter missing model ${expectedSlug}.`,
      };
    }

    default:
      return {
        ...base,
        status: "UNKNOWN",
        actual: null,
        detail: `Unhandled assertion kind: ${String(assertion.kind)}`,
      };
  }
}

export async function buildProductionTruthApReportV1(
  deps: ProductionTruthApDepsV1 = {},
): Promise<ProductionTruthApReportV1> {
  const rootDir = rootDirOf(deps);
  const now = deps.now ?? (() => new Date());
  const supabase_configured =
    deps.supabaseConfigured?.() ?? isSupabaseConfiguredForProductionTruth();

  let getFilterBySlug = deps.getFilterBySlug;
  let getModelBySlug = deps.getModelBySlug;
  let fetchRawApprovedLinks = deps.fetchRawApprovedLinks;

  if (supabase_configured && !getFilterBySlug) {
    const { getAirPurifierFilterBySlug } = await import("@/lib/data/air-purifier/filters");
    getFilterBySlug = getAirPurifierFilterBySlug;
  }
  if (supabase_configured && !getModelBySlug) {
    const { getAirPurifierModelBySlug } = await import("@/lib/data/air-purifier/models");
    getModelBySlug = getAirPurifierModelBySlug;
  }
  if (supabase_configured && !fetchRawApprovedLinks) {
    const { getSupabaseServerClient } = await import("@/lib/supabase/server-client");
    fetchRawApprovedLinks = async (filterId: string) => {
      const supabase = getSupabaseServerClient();
      const { data, error } = await supabase
        .from("air_purifier_retailer_links")
        .select(
          "id, affiliate_url, is_primary, retailer_key, browser_truth_classification, browser_truth_buyable_subtype, browser_truth_checked_at",
        )
        .eq("air_purifier_filter_id", filterId)
        .eq("status", "approved")
        .order("is_primary", { ascending: false })
        .order("retailer_name", { ascending: true });
      if (error) throw error;
      return (data ?? []) as Array<{
        id: string;
        affiliate_url: string;
        is_primary: boolean;
        retailer_key: string | null;
        browser_truth_classification: string | null;
        browser_truth_buyable_subtype?: string | null;
        browser_truth_checked_at?: string | null;
      }>;
    };
  }

  const cases: ProductionTruthCaseResultV1[] = [];

  for (const golden of PRODUCTION_TRUTH_GOLDEN_CASES_AP_V1) {
    let filter: AirPurifierFilterWithModels | null = null;
    let model: AirPurifierModelWithFilters | null = null;
    let rawPrimaryAffiliateUrl: string | null = null;

    if (!supabase_configured) {
      const skippedAssertions = golden.assertions.map((a) => ({
        assertion_id: a.assertion_id,
        kind: a.kind,
        testability: a.testability,
        blocks_case_pass: assertionBlocksCasePassV1(a),
        status: "SKIP" as const,
        expected: a.expected,
        actual: null,
        detail: "Supabase not configured — set NEXT_PUBLIC_SUPABASE_URL and key.",
      }));
      cases.push({
        case_id: golden.case_id,
        title: golden.title,
        case_type: golden.case_type,
        status: "SKIP",
        customer_safety_status: summarizeCustomerSafetyStatus(skippedAssertions),
        inventory_warnings: [],
        filter_slug: golden.filter_slug ?? null,
        model_slug: golden.model_slug ?? null,
        authority_artifacts: golden.authority_artifacts,
        assertions: skippedAssertions,
      });
      continue;
    }

    if (golden.filter_slug && getFilterBySlug) {
      filter = await getFilterBySlug(golden.filter_slug);
      if (filter && fetchRawApprovedLinks) {
        const raw = await fetchRawApprovedLinks(filter.id);
        const primary = raw.find((r) => r.is_primary === true);
        rawPrimaryAffiliateUrl = primary?.affiliate_url?.trim() ?? null;
      }
    }
    if (golden.model_slug && getModelBySlug) {
      model = await getModelBySlug(golden.model_slug);
    }

    const csvAuthority =
      golden.filter_slug != null
        ? loadCsvPrimaryAuthorityForFilterV1(rootDir, golden.filter_slug)
        : null;

    const assertions = golden.assertions.map((assertion) =>
      evalAssertion({
        assertion,
        filter,
        model,
        csvAuthority,
        rawPrimaryAffiliateUrl,
      }),
    );

    cases.push({
      case_id: golden.case_id,
      title: golden.title,
      case_type: golden.case_type,
      status: summarizeBlockingCaseStatus(assertions),
      customer_safety_status: summarizeCustomerSafetyStatus(assertions),
      inventory_warnings: collectInventoryWarnings(assertions),
      filter_slug: golden.filter_slug ?? null,
      model_slug: golden.model_slug ?? null,
      authority_artifacts: golden.authority_artifacts,
      assertions,
    });
  }

  const summary = {
    total_cases: cases.length,
    pass: cases.filter((c) => c.status === "PASS").length,
    fail: cases.filter((c) => c.status === "FAIL").length,
    pass_with_inventory_warnings: cases.filter(
      (c) => c.status === "PASS" && c.inventory_warnings.length > 0,
    ).length,
    inventory_warning_count: cases.reduce((n, c) => n + c.inventory_warnings.length, 0),
    skip: cases.filter((c) => c.status === "SKIP").length,
    unknown: cases.filter((c) => c.status === "UNKNOWN").length,
  };

  return {
    contract: PRODUCTION_TRUTH_AP_CONTRACT_V1,
    read_only: true,
    data_mutation: false,
    mutation_authorized: false,
    generated_at: now().toISOString(),
    supabase_configured,
    runtime_loader: "getAirPurifierFilterBySlug | getAirPurifierModelBySlug",
    summary,
    cases,
    proven_facts: [
      "PROVEN: Evaluator uses production SSR loaders and buy-link gates — not CSV-only classification.",
      "PROVEN: Golden cases cite committed retailer_links.csv and ap-runtime-convergence-gap audit.",
      "PROVEN: /go safety checked via isAffiliateUrlSafeForGoRedirect on selected buy link only (no HTTP /go click).",
    ],
    inferred_facts: [
      "INFERRED: ap-suppressed-holmes-hapf30 may PASS with inventory_warnings when safe_cta_absent passes but raw OEM search primary remains (search_placeholder_rescue out of scope).",
    ],
    unknown_facts: supabase_configured
      ? []
      : ["UNKNOWN: Live Supabase runtime truth not evaluated — credentials missing."],
  };
}

/** Count raw approved rows that would be safe CTAs if selected (diagnostic). */
export function countRawSafeCtaRowsV1(
  rows: Array<{
    affiliate_url: string;
    retailer_key?: string | null;
    browser_truth_classification?: string | null;
    browser_truth_buyable_subtype?: string | null;
  }>,
): number {
  return rows.filter((r) => isDirectBuyableSafeCtaRow(r)).length;
}
