/**
 * Read-only Command Center lane: BuckParts Certainty Engine north-star checklist.
 *
 * Judges repo/product posture against homeowner certainty — not mutation authority.
 * Does not authorize BuckParts Verified Links, CSV apply, Supabase, evidence, public UI, or Netlify.
 */

import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { parse } from "csv-parse/sync";

import { buyLinkGateFailureKind } from "@/lib/retailers/launch-buy-links";

import type { AirPurifierDemandSelectedBatchOwnerReviewLaneV1 } from "./air-purifier-demand-selected-batch-owner-review-v1";
import type { DemandToCoverageNextLaneReportV1 } from "./demand-to-coverage-next-lane-v1";
import type { PagePublishabilityTruthSummaryV1 } from "./buckparts-page-publishability-truth-v1";
import type { RpwfePurchaseOptionRescueOwnerReviewLaneV1 } from "./rpwfe-purchase-option-rescue-owner-review-v1";

export const BUCKPARTS_CERTAINTY_ENGINE_CHECKLIST_CONTRACT_V1 =
  "buckparts_certainty_engine_checklist_v1" as const;

export const BUCKPARTS_CERTAINTY_ENGINE_CHECKLIST_CC_JQ_PATH_V1 =
  ".command_center_v2.buckparts_certainty_engine_checklist_v1" as const;

export const BUCKPARTS_CERTAINTY_ENGINE_CHECKLIST_SOURCE_COMMAND_V1 =
  "npm run buckparts:command-center" as const;

/** Stable top-level jq fields — do not nest-only under customer_facing_terminology. */
export const BUCKPARTS_VERIFIED_LINK_BRANDED_TERM_V1 = "BuckParts Verified Link" as const;

export const BUCKPARTS_VERIFIED_LINK_DEFINITION_V1 =
  "A place to buy that BuckParts has checked against the part, listing, and evidence we trust." as const;

export const BUCKPARTS_AI_VS_BUCKPARTS_POSITIONING_V1 = "AI can suggest. BuckParts verifies." as const;

export const BUCKPARTS_AI_VS_BUCKPARTS_EXPLANATION_V1 =
  "Generic AI can guess or summarize possible replacements, but BuckParts is designed to show evidence, separate official and compatible options, flag uncertainty, and withhold a BuckParts Verified Link until the buying path is checked." as const;

export type CertaintyChecklistItemStatusV1 =
  | "PROVEN"
  | "NOT_PROVEN"
  | "BLOCKED"
  | "PARTIAL"
  | "FUTURE";

export type CertaintyChecklistItemV1 = {
  id: string;
  label: string;
  status: CertaintyChecklistItemStatusV1;
  why_it_matters: string;
  proof_or_blocker: string;
  priority_rank: number;
};

export type BuckpartsCertaintyEngineChecklistLaneV1 = {
  contract: typeof BUCKPARTS_CERTAINTY_ENGINE_CHECKLIST_CONTRACT_V1;
  read_only: true;
  data_mutation: false;
  recommended_jq_path: typeof BUCKPARTS_CERTAINTY_ENGINE_CHECKLIST_CC_JQ_PATH_V1;
  source_command: typeof BUCKPARTS_CERTAINTY_ENGINE_CHECKLIST_SOURCE_COMMAND_V1;
  north_star_statement: string;
  master_question: string;
  branded_term: typeof BUCKPARTS_VERIFIED_LINK_BRANDED_TERM_V1;
  branded_term_definition: typeof BUCKPARTS_VERIFIED_LINK_DEFINITION_V1;
  ai_vs_buckparts_positioning: typeof BUCKPARTS_AI_VS_BUCKPARTS_POSITIONING_V1;
  ai_vs_buckparts_explanation: typeof BUCKPARTS_AI_VS_BUCKPARTS_EXPLANATION_V1;
  customer_facing_terminology: {
    branded_term: "BuckParts Verified Link";
    branded_term_definition: string;
    forbidden_customer_language: string[];
    preferred_language: string[];
  };
  login_and_email_stance: {
    forced_login_before_value: false;
    optional_email_save_reminder_after_value: true;
    recommended_first_version: string;
    future_account_value: string[];
  };
  marketing_plan: {
    founder_ai_solo_builder_handle: string;
    buckparts_brand_handle: string;
    every_post_must_include_educational_component: true;
    founder_themes: string[];
    brand_themes: string[];
  };
  future_brand_product_ideas: string[];
  current_blockers: string[];
  verified_link_coverage: {
    refrigerator_filter_slugs_in_catalog: number | "UNKNOWN";
    refrigerator_filter_slugs_with_safe_buyer_path: number | "UNKNOWN";
    coverage_percent: number | "UNKNOWN";
    source_path: "data/filters.csv+data/retailer_links.csv" | "UNKNOWN";
  };
  checklist_item_count: number;
  checklist_items: CertaintyChecklistItemV1[];
  csv_apply_authorized: false;
  supabase_mutation_authorized: false;
  evidence_write_authorized: false;
  public_ui_mutation_authorized: false;
  netlify_api_authorized: false;
  buy_cta_authorized: false;
  buckparts_verified_link_authorized: false;
  proven_facts: string[];
  inferred_facts: string[];
  unknown_facts: string[];
  recommended_next_action: string;
};

export type BuildBuckpartsCertaintyEngineChecklistDepsV1 = {
  rootDir: string;
  fileExists?: (absolutePath: string) => boolean;
  readTextFile?: (absolutePath: string) => string;
  rpwfeOwnerReview?: RpwfePurchaseOptionRescueOwnerReviewLaneV1 | null;
  apDemandSelectedOwnerReview?: AirPurifierDemandSelectedBatchOwnerReviewLaneV1 | null;
  demandToCoverageNextLane?: DemandToCoverageNextLaneReportV1 | null;
  pagePublishabilityTruth?: PagePublishabilityTruthSummaryV1 | null;
};

function checklistItem(args: {
  id: string;
  label: string;
  status: CertaintyChecklistItemStatusV1;
  why_it_matters: string;
  proof_or_blocker: string;
  priority_rank: number;
}): CertaintyChecklistItemV1 {
  return {
    id: args.id,
    label: args.label,
    status: args.status,
    why_it_matters: args.why_it_matters,
    proof_or_blocker: args.proof_or_blocker,
    priority_rank: args.priority_rank,
  };
}

function computeRefrigeratorVerifiedLinkCoverage(args: {
  rootDir: string;
  fileExists: (absolutePath: string) => boolean;
  readTextFile: (absolutePath: string) => string;
}):
  | {
      ok: true;
      total: number;
      with_safe_path: number;
      coverage_percent: number;
    }
  | { ok: false; reason: string } {
  const filtersPath = path.join(args.rootDir, "data/filters.csv");
  const linksPath = path.join(args.rootDir, "data/retailer_links.csv");
  if (!args.fileExists(filtersPath) || !args.fileExists(linksPath)) {
    return { ok: false, reason: "filters_or_retailer_links_csv_missing" };
  }
  try {
    const filters = parse(args.readTextFile(filtersPath), {
      columns: true,
      skip_empty_lines: true,
      relax_column_count: true,
    }) as Array<{ slug?: string; filter_slug?: string }>;
    const links = parse(args.readTextFile(linksPath), {
      columns: true,
      skip_empty_lines: true,
      relax_column_count: true,
    }) as Array<{
      filter_slug?: string;
      retailer_key?: string;
      affiliate_url?: string;
      browser_truth_classification?: string | null;
      browser_truth_buyable_subtype?: string | null;
    }>;
    const bySlug = new Map<string, typeof links>();
    for (const row of links) {
      const slug = (row.filter_slug ?? "").trim().toLowerCase();
      if (!slug) continue;
      const list = bySlug.get(slug) ?? [];
      list.push(row);
      bySlug.set(slug, list);
    }
    let total = 0;
    let withSafe = 0;
    for (const filter of filters) {
      const slug = (filter.slug ?? filter.filter_slug ?? "").trim().toLowerCase();
      if (!slug) continue;
      total += 1;
      const rows = bySlug.get(slug) ?? [];
      const hasSafe = rows.some(
        (row) =>
          buyLinkGateFailureKind({
            retailer_key: row.retailer_key,
            affiliate_url: row.affiliate_url ?? "",
            browser_truth_classification: row.browser_truth_classification,
            browser_truth_buyable_subtype: row.browser_truth_buyable_subtype,
          }) === null,
      );
      if (hasSafe) withSafe += 1;
    }
    const coverage_percent = total > 0 ? Math.round((withSafe / total) * 1000) / 10 : 0;
    return { ok: true, total, with_safe_path: withSafe, coverage_percent };
  } catch {
    return { ok: false, reason: "csv_parse_failed" };
  }
}

export function buildBuckpartsCertaintyEngineChecklistV1(
  deps: BuildBuckpartsCertaintyEngineChecklistDepsV1,
): BuckpartsCertaintyEngineChecklistLaneV1 {
  const fileExists = deps.fileExists ?? ((abs: string) => existsSync(abs));
  const readTextFile = deps.readTextFile ?? ((abs: string) => readFileSync(abs, "utf8"));

  const coverage = computeRefrigeratorVerifiedLinkCoverage({
    rootDir: deps.rootDir,
    fileExists,
    readTextFile,
  });

  const rpwfe = deps.rpwfeOwnerReview ?? null;
  const apReview = deps.apDemandSelectedOwnerReview ?? null;
  const demandLane = deps.demandToCoverageNextLane ?? null;
  const publishability = deps.pagePublishabilityTruth ?? null;

  const current_blockers: string[] = [];
  if (rpwfe) {
    current_blockers.push(
      `rpwfe:current_public_state=${rpwfe.current_public_state}`,
      `rpwfe:compatible_model_count=${String(rpwfe.compatible_model_count)}`,
      `rpwfe:existing_retailer_row_status=${rpwfe.existing_retailer_row_status}`,
      `rpwfe:compatible_waterdrop_path_status=${rpwfe.compatible_waterdrop_path_status}`,
    );
  }
  if (apReview) {
    current_blockers.push("ap_batch_start:blocked");
    for (const blocker of apReview.blockers.slice(0, 6)) {
      current_blockers.push(`ap_owner_review:${blocker}`);
    }
  }
  if (demandLane?.recommendation_status === "START_NEW_DEMAND_SELECTED_BATCH") {
    current_blockers.push(
      `demand_to_coverage:${demandLane.recommended_wedge ?? "UNKNOWN"}:${demandLane.recommendation_status}`,
    );
  }

  const coverageProof =
    coverage.ok === true
      ? `PROVEN: committed data/filters.csv has ${String(coverage.total)} refrigerator filter slugs; data/retailer_links.csv shows ${String(coverage.with_safe_path)} with a gated safe buyer path (${String(coverage.coverage_percent)}%).`
      : `BLOCKED: cannot prove refrigerator verified-link coverage (${coverage.ok === false ? coverage.reason : "UNKNOWN"}).`;

  const firstItemStatus: CertaintyChecklistItemStatusV1 =
    coverage.ok === true && coverage.with_safe_path === coverage.total && coverage.total > 0
      ? "PROVEN"
      : coverage.ok === true
        ? "NOT_PROVEN"
        : "BLOCKED";

  const publishabilityNoBuy =
    publishability?.sample_rows?.filter(
      (row) => row.cta.buyer_path_state === "suppress_buy" || row.cta.safe_cta_link_count === 0,
    ).length ?? "UNKNOWN";

  const items: CertaintyChecklistItemV1[] = [
    checklistItem({
      id: "every_filter_has_buckparts_verified_link_or_safe_buyer_path",
      label: "Every filter page must have a BuckParts Verified Link or safe buyer path.",
      status: firstItemStatus,
      why_it_matters:
        "Without a checked buying option on every filter page, BuckParts cannot be the certainty step homeowners feel they must take before purchase.",
      proof_or_blocker: coverageProof,
      priority_rank: 1,
    }),
    checklistItem({
      id: "buyer_path_coverage_scoreboard",
      label: "Buyer path coverage scoreboard (filters with vs without a verified buying path).",
      status: coverage.ok === true ? "PARTIAL" : "NOT_PROVEN",
      why_it_matters:
        "Operators and homeowners need an honest scoreboard — not vibes — for where verified buying paths exist vs where pages still suppress buy.",
      proof_or_blocker:
        coverage.ok === true
          ? `PROVEN partial: refrigerator CSV scoreboard ${String(coverage.with_safe_path)}/${String(coverage.total)} safe paths. UNKNOWN: wedge-wide unified scoreboard across AP/WHW/vacuum in this lane.`
          : "NOT_PROVEN: scoreboard inputs missing from committed CSV.",
      priority_rank: 2,
    }),
    checklistItem({
      id: "high_demand_no_buy_emergency_lane",
      label: "High-demand / no-buy emergency lane (demand present, customer sees no verified path).",
      status: rpwfe?.customer_visible_problem === true ? "BLOCKED" : "PARTIAL",
      why_it_matters:
        "High-traffic filter pages that suppress buy without a plain explanation destroy trust and block the certainty-engine promise.",
      proof_or_blocker: rpwfe
        ? `BLOCKED example: /filter/rpwfe — ${rpwfe.current_public_state}; ${rpwfe.existing_retailer_row_status}; compatible_waterdrop_path_status=${rpwfe.compatible_waterdrop_path_status}.`
        : "PARTIAL: emergency lane concept documented; RPWFE owner-review lane not attached to this build input.",
      priority_rank: 3,
    }),
    checklistItem({
      id: "above_the_fold_certainty_snapshot",
      label: "Above-the-fold certainty snapshot (trust + fit signals before scroll).",
      status: "NOT_PROVEN",
      why_it_matters:
        "Homeowners decide in seconds; burying certainty 2–3 scrolls down forces work BuckParts should do for them.",
      proof_or_blocker:
        "NOT_PROVEN: no repo-wide proof that every filter PDP exposes a dedicated above-the-fold certainty snapshot component.",
      priority_rank: 4,
    }),
    checklistItem({
      id: "one_obvious_safest_next_step",
      label: "One obvious safest next step on every filter page (not a wall of equal options).",
      status: "PARTIAL",
      why_it_matters:
        "Multiple competing CTAs recreate Amazon/Google confusion; BuckParts should rank and present the safest verified path first.",
      proof_or_blocker:
        "PARTIAL: launch-buy-links arbitration exists in code; NOT_PROVEN: every PDP enforces a single primary BuckParts Verified Link presentation standard.",
      priority_rank: 5,
    }),
    checklistItem({
      id: "no_buy_pages_explain_exact_reason_in_homeowner_language",
      label: "No-buy pages explain the exact reason in homeowner language (not internal gate codes).",
      status: rpwfe ? "BLOCKED" : "NOT_PROVEN",
      why_it_matters:
        "Suppressing buy without a clear reason feels like a dead end; homeowners need to know what is missing and what BuckParts checked.",
      proof_or_blocker: rpwfe
        ? `BLOCKED example: rpwfe public_state=${rpwfe.current_public_state} with SEARCH_PLACEHOLDER_BLOCKED row — customer-visible copy must explain OEM vs compatible paths in plain language.`
        : `NOT_PROVEN: publishability sample includes suppress_buy rows (${String(publishabilityNoBuy)} in sample); full homeowner-language coverage unproven.`,
      priority_rank: 6,
    }),
    checklistItem({
      id: "official_vs_compatible_impossible_to_miss",
      label: "Official vs compatible replacement — impossible to miss on the page.",
      status: "NOT_PROVEN",
      why_it_matters:
        "Wrong-part risk spikes when homeowners cannot tell OEM from compatible; BuckParts must make the distinction visually dominant.",
      proof_or_blocker:
        "NOT_PROVEN: RPWFE lane requires safe_labeling_required=true but official_label_authorized=false and compatible_label_authorized=false.",
      priority_rank: 7,
    }),
    checklistItem({
      id: "compatible_replacement_evidence_lane",
      label: "Compatible replacement evidence lane (proof before compatible BuckParts Verified Links).",
      status: "PARTIAL",
      why_it_matters:
        "Compatible listings need evidence-backed labeling — not guesswork — before any verified buying path is shown.",
      proof_or_blocker:
        "PARTIAL: evidence files and owner-review packets exist for many tokens; NOT_PROVEN: universal compatible-evidence gate on every compatible row.",
      priority_rank: 8,
    }),
    checklistItem({
      id: "model_first_lookup_is_first_class",
      label: "Refrigerator model lookup is first-class input (normal, not “messy”).",
      status: "PARTIAL",
      why_it_matters:
        "Sticker photos and model numbers are how homeowners actually shop; treating model lookup as edge-case input blocks the certainty engine.",
      proof_or_blocker:
        "PARTIAL: fridge model routes and model-first resolver lanes exist in Command Center; NOT_PROVEN: unified model-first entry is the default path on every surface.",
      priority_rank: 9,
    }),
    checklistItem({
      id: "buckparts_does_the_checking",
      label: "BuckParts does the checking (homeowner is not handed a long DIY checklist as the main product).",
      status: "PARTIAL",
      why_it_matters:
        "The product promise is certainty as a service — BuckParts runs evidence and gates, not a homework list for anxious buyers.",
      proof_or_blocker:
        "PARTIAL: buy-path gates and evidence inventory exist; NOT_PROVEN: all customer surfaces replace self-serve checklists with BuckParts-verified conclusions.",
      priority_rank: 10,
    }),
    checklistItem({
      id: "buying_path_probation_plain_language",
      label: "Buying Path Probation explained in plain homeowner language (no unexplained jargon).",
      status: "NOT_PROVEN",
      why_it_matters:
        "Internal probation concepts must translate to risks homeowners understand (wrong part, RFID/chip sensitivity, multipack mismatch) without jargon like “chip compatibility.”",
      proof_or_blocker:
        "NOT_PROVEN: no repo-proven customer-facing probation copy standard wired to every gated row.",
      priority_rank: 11,
    }),
    checklistItem({
      id: "wrong_part_risk_score_or_certainty_state",
      label: "Wrong-part risk score or certainty state visible per filter/page.",
      status: "NOT_PROVEN",
      why_it_matters:
        "A single certainty state (high/medium/blocked) helps homeowners decide whether to proceed or pause — faster than reading every evidence note.",
      proof_or_blocker:
        "NOT_PROVEN: page_state and publishability lanes exist; homeowner-facing certainty score not proven on PDPs.",
      priority_rank: 12,
    }),
    checklistItem({
      id: "internet_claims_vs_buckparts_evidence_panel",
      label: "Internet claims vs BuckParts evidence panel (what the web says vs what we verified).",
      status: "FUTURE",
      why_it_matters:
        "Homeowners arrive with SERP noise; BuckParts should contrast unverified claims against checked evidence.",
      proof_or_blocker:
        "FUTURE: public trust routes exist (/truth-policy, /wrong-part-prevention); per-filter contrast panel not proven.",
      priority_rank: 13,
    }),
    checklistItem({
      id: "human_made_visual_identity",
      label: "Human-made visual identity (intentional, cool — not generic AI template).",
      status: "PARTIAL",
      why_it_matters:
        "Trust is emotional; a distinctive human-made brand signals care and reduces “scam affiliate site” anxiety.",
      proof_or_blocker:
        "PARTIAL: branded trust components and motion discipline exist in repo; NOT_PROVEN: gold-tier standard on every template.",
      priority_rank: 14,
    }),
    checklistItem({
      id: "gold_tier_page_design_standard",
      label: "Gold-tier page design standard (density, hierarchy, warmth).",
      status: "NOT_PROVEN",
      why_it_matters:
        "Certainty requires clarity and craft; cluttered or generic layouts undermine “must-check” positioning.",
      proof_or_blocker:
        "NOT_PROVEN: no automated gold-tier design audit passes all filter PDPs.",
      priority_rank: 15,
    }),
    checklistItem({
      id: "visual_match_proof",
      label: "Visual Match Proof / Picture Match Check",
      status: "NOT_PROVEN",
      why_it_matters:
        "Homeowners gain confidence when they can visually compare the filter they have with the replacement option, but visual similarity alone is not proof.",
      proof_or_blocker:
        "NOT_PROVEN: image/photo comparison is not currently proven as a live customer feature in this repo.",
      priority_rank: 16,
    }),
    checklistItem({
      id: "why_buckparts_beats_generic_ai",
      label: "Why BuckParts beats generic AI (only when evidence and buying paths are verified).",
      status: "PARTIAL",
      why_it_matters:
        "AI can suggest. BuckParts verifies. BuckParts is better than ChatGPT/Claude only when it has durable evidence, verified buying paths, official-vs-compatible labels, no-buy gates, and page-level proof — not when it guesses.",
      proof_or_blocker:
        "PARTIAL: ai_vs_buckparts_positioning and explanation are fixed in this lane; NOT_PROVEN: every filter page already delivers evidence panels, verified paths, and no-buy gates sitewide.",
      priority_rank: 17,
    }),
    checklistItem({
      id: "buckparts_confidence_case_visible",
      label: "BuckParts confidence case visible (what we verified and why we trust it).",
      status: "FUTURE",
      why_it_matters: "Shows the work behind a BuckParts Verified Link — not just a link.",
      proof_or_blocker: "FUTURE: evidence trails exist in ops artifacts; per-page confidence case UI not proven.",
      priority_rank: 18,
    }),
    checklistItem({
      id: "why_this_fits_visible",
      label: "“Why this fits your fridge/filter” visible near the verified path.",
      status: "NOT_PROVEN",
      why_it_matters: "Fit explanation is the core anxiety reducer for replacement filters.",
      proof_or_blocker: "NOT_PROVEN: part-trust copy exists in places; universal fit block unproven.",
      priority_rank: 19,
    }),
    checklistItem({
      id: "is_this_the_same_thing_tool",
      label: "“Is this the same thing?” comparison tool (side-by-side SKU/label match).",
      status: "FUTURE",
      why_it_matters: "Homeowners ask equivalence constantly; BuckParts should answer visually.",
      proof_or_blocker: "FUTURE: not implemented as a customer tool in repo.",
      priority_rank: 20,
    }),
    checklistItem({
      id: "replacement_doppelganger_warnings",
      label: "Replacement doppelganger warnings (look-alike parts that do not fit).",
      status: "FUTURE",
      why_it_matters: "Near-matches cause expensive wrong purchases.",
      proof_or_blocker: "FUTURE: wrong-part-prevention narrative exists; per-SKU doppelganger UI not proven.",
      priority_rank: 21,
    }),
    checklistItem({
      id: "chip_rfid_sensitive_warning_system_plain_language",
      label: "Chip/RFID-sensitive warning system in plain language (when applicable).",
      status: "NOT_PROVEN",
      why_it_matters:
        "Some filters (e.g. RFID-tagged OEM lines) need explicit warnings without unexplained “chip compatibility” jargon.",
      proof_or_blocker:
        "NOT_PROVEN: RPWFE notes RFID in catalog data; customer-facing plain-language warning system not proven sitewide.",
      priority_rank: 22,
    }),
    checklistItem({
      id: "safe_exit_when_uncertain",
      label: "Safe exit when uncertain (what to do instead of buying the wrong part).",
      status: "PARTIAL",
      why_it_matters: "Certainty engine must recommend stopping when evidence is insufficient.",
      proof_or_blocker:
        "PARTIAL: suppress_buy and go-unavailable paths exist; NOT_PROVEN: consistent safe-exit copy on every uncertain page.",
      priority_rank: 23,
    }),
    checklistItem({
      id: "my_home_filters",
      label: "My Home Filters (remember this home’s filters locally first).",
      status: "FUTURE",
      why_it_matters: "Repeat homeowners need memory, not re-search fatigue.",
      proof_or_blocker:
        "FUTURE: recommended_first_version is local save/print/copy before accounts; feature not proven shipped.",
      priority_rank: 24,
    }),
    checklistItem({
      id: "printable_sticky_note_filter_cards",
      label: "Printable / sticky-note filter cards for the fridge.",
      status: "FUTURE",
      why_it_matters: "Physical reminders at the point of use drive repeat certainty checks.",
      proof_or_blocker: "FUTURE: product idea captured in checklist; not proven implemented.",
      priority_rank: 25,
    }),
    checklistItem({
      id: "replacement_passport",
      label: "Replacement passport (history of what was verified and bought).",
      status: "FUTURE",
      why_it_matters: "Longitudinal trust beats one-off affiliate clicks.",
      proof_or_blocker: "FUTURE: not proven in product surfaces.",
      priority_rank: 26,
    }),
    checklistItem({
      id: "label_photo_screenshot_upload",
      label:
        "Label / photo / screenshot upload — model sticker, filter label, Amazon screenshot, retailer screenshot, or appliance tag.",
      status: "NOT_PROVEN",
      why_it_matters:
        "Major future product capability (not a minor nice-to-have): homeowners upload what they actually see; BuckParts translates stickers and screenshots into model/part certainty.",
      proof_or_blocker:
        "NOT_PROVEN: no repo-proven public upload flow for model stickers, filter labels, Amazon/retailer screenshots, or appliance tags.",
      priority_rank: 27,
    }),
    checklistItem({
      id: "input_translator_for_truly_confusing_inputs",
      label: "Input translator for truly confusing numbers (messy sticker → model/part).",
      status: "FUTURE",
      why_it_matters: "Reduces abandonment when homeowners cannot parse OEM strings.",
      proof_or_blocker: "FUTURE: depends on label-photo intake and model-first resolver maturity.",
      priority_rank: 28,
    }),
    checklistItem({
      id: "filter_graveyard",
      label: "Filter graveyard (retired / wrong / do-not-rebuy markers).",
      status: "FUTURE",
      why_it_matters: "Prevents repeat wrong-part purchases across years.",
      proof_or_blocker: "FUTURE: not proven implemented.",
      priority_rank: 29,
    }),
    checklistItem({
      id: "public_trust_policy_visible",
      label: "Public trust policy visible and linked from filter journeys.",
      status: "PARTIAL",
      why_it_matters: "Explains how BuckParts verifies before showing any BuckParts Verified Link.",
      proof_or_blocker:
        "PARTIAL: /truth-policy and /wrong-part-prevention routes exist in grant readiness lanes; sitewide linkage depth NOT_PROVEN.",
      priority_rank: 30,
    }),
    checklistItem({
      id: "homeowner_readable_evidence_trail",
      label: "Homeowner-readable evidence trail (what we checked, when, outcome).",
      status: "PARTIAL",
      why_it_matters: "Transparency converts skepticism into must-check habit.",
      proof_or_blocker:
        "PARTIAL: data/evidence artifacts and browser_truth_notes exist; homeowner-readable per-page trail NOT_PROVEN everywhere.",
      priority_rank: 31,
    }),
    checklistItem({
      id: "buckparts_seal_of_confidence_future_goal",
      label: "BuckParts seal of confidence (future brand goal — replacement-filter trust mark).",
      status: "FUTURE",
      why_it_matters:
        "Long-term brand north star: BuckParts as the replacement-filter seal homeowners look for before purchase.",
      proof_or_blocker: "FUTURE: brand goal only — not a live customer mark; no adoption claims.",
      priority_rank: 32,
    }),
    checklistItem({
      id: "founder_x_handle_plan",
      label: "Founder AI/solo-builder X handle plan (build-in-public education).",
      status: "FUTURE",
      why_it_matters: "Founder channel teaches how BuckParts is built and verified.",
      proof_or_blocker:
        "FUTURE: handle placeholder @FOUNDER_HANDLE_TBD — operator must assign real handle before posting.",
      priority_rank: 33,
    }),
    checklistItem({
      id: "buckparts_brand_x_handle_plan",
      label: "BuckParts brand X handle plan (wrong-part prevention education).",
      status: "FUTURE",
      why_it_matters: "Brand channel teaches evidence-before-verified-link doctrine for homeowners.",
      proof_or_blocker:
        "FUTURE: handle placeholder @BUCKPARTS_BRAND_HANDLE_TBD — operator must assign real handle before posting.",
      priority_rank: 34,
    }),
    checklistItem({
      id: "every_marketing_post_teaches",
      label: "Every marketing post includes an educational component.",
      status: "NOT_PROVEN",
      why_it_matters: "Marketing must reinforce certainty habits, not generic affiliate promotion.",
      proof_or_blocker:
        "NOT_PROVEN: marketing_intelligence_engine lane may propose assets; post-level compliance not proven.",
      priority_rank: 35,
    }),
    checklistItem({
      id: "public_wrong_part_prevention_examples",
      label: "Public wrong-part prevention examples (teach the mistake BuckParts blocks).",
      status: "PARTIAL",
      why_it_matters: "Concrete stories beat abstract trust claims.",
      proof_or_blocker:
        "PARTIAL: /wrong-part-prevention page exists; depth and coverage of examples NOT_PROVEN in this lane.",
      priority_rank: 36,
    }),
    checklistItem({
      id: "revolutionary_page_standard",
      label: "Revolutionary page standard (must-check before buy — not thin SEO filler).",
      status: "NOT_PROVEN",
      why_it_matters: "Thin pages cannot earn “check BuckParts first” behavior.",
      proof_or_blocker:
        "NOT_PROVEN: publishability and usefulness gates exist; revolutionary standard not proven for all indexable filters.",
      priority_rank: 37,
    }),
    checklistItem({
      id: "optional_email_save_reminder_after_value",
      label: "Optional email save/reminder only after BuckParts delivers value.",
      status: "FUTURE",
      why_it_matters: "Capture homeowners after trust is earned — not before first certainty win.",
      proof_or_blocker: "FUTURE: login_and_email_stance.optional_email_save_reminder_after_value=true; not shipped.",
      priority_rank: 38,
    }),
    checklistItem({
      id: "no_forced_login_before_value",
      label: "No forced login before value (read/check/filter lookup first).",
      status: "PROVEN",
      why_it_matters: "Forced accounts before certainty destroy the must-check funnel.",
      proof_or_blocker:
        "PROVEN: public filter and model routes are readable without auth; lane policy forced_login_before_value=false.",
      priority_rank: 39,
    }),
  ];

  const proven_facts = [
    "PROVEN: buckparts_certainty_engine_checklist_v1 is read-only with all mutation and BuckParts Verified Link authorization flags false.",
    "PROVEN: north_star_statement and master_question are fixed doctrine strings in this lane.",
    "PROVEN: top-level branded_term and branded_term_definition are stable jq fields; ai_vs_buckparts_positioning is AI can suggest. BuckParts verifies.",
    "PROVEN: customer-facing branded term is BuckParts Verified Link; forbidden_customer_language includes buy button.",
    coverage.ok === true
      ? `PROVEN: committed CSV shows ${String(coverage.with_safe_path)}/${String(coverage.total)} refrigerator filters with a gated safe buyer path — first checklist item remains NOT_PROVEN/BLOCKED until 100%.`
      : "UNKNOWN: refrigerator verified-link coverage could not be computed from CSV.",
  ];
  if (rpwfe) {
    proven_facts.push(
      `PROVEN: rpwfe_purchase_option_rescue_owner_review_v1 attached — current_public_state=${rpwfe.current_public_state}.`,
    );
  }
  if (apReview?.batch_start_authorized === false) {
    proven_facts.push("PROVEN: air_purifier_demand_selected_batch_owner_review_v1 reports batch_start_authorized=false.");
  }

  const inferred_facts = [
    "INFERRED: Homeowners who follow redirects with browser-like clients may reach Amazon PDPs even when curl-only smoke sees HTTP 500 on some ASINs (bot wall — separate from this lane).",
  ];

  const unknown_facts = [
    "UNKNOWN: live production Supabase buyer-path coverage vs committed CSV (lane uses CSV only for scoreboard).",
    "UNKNOWN: customer adoption, revenue, conversion, or traffic — not measured in this lane.",
  ];

  return {
    contract: BUCKPARTS_CERTAINTY_ENGINE_CHECKLIST_CONTRACT_V1,
    read_only: true,
    data_mutation: false,
    recommended_jq_path: BUCKPARTS_CERTAINTY_ENGINE_CHECKLIST_CC_JQ_PATH_V1,
    source_command: BUCKPARTS_CERTAINTY_ENGINE_CHECKLIST_SOURCE_COMMAND_V1,
    north_star_statement:
      "BuckParts should become the site homeowners feel they have to check before buying a replacement filter because otherwise they are not certain they are buying the correct part.",
    master_question:
      "Does this page make the customer more certain they are buying the correct part than Amazon search, Google results, or random retailer listings?",
    branded_term: BUCKPARTS_VERIFIED_LINK_BRANDED_TERM_V1,
    branded_term_definition: BUCKPARTS_VERIFIED_LINK_DEFINITION_V1,
    ai_vs_buckparts_positioning: BUCKPARTS_AI_VS_BUCKPARTS_POSITIONING_V1,
    ai_vs_buckparts_explanation: BUCKPARTS_AI_VS_BUCKPARTS_EXPLANATION_V1,
    customer_facing_terminology: {
      branded_term: BUCKPARTS_VERIFIED_LINK_BRANDED_TERM_V1,
      branded_term_definition: BUCKPARTS_VERIFIED_LINK_DEFINITION_V1,
      forbidden_customer_language: ["buy button"],
      preferred_language: [
        "BuckParts Verified Link",
        "verified buying path",
        "verified place to buy",
        "checked buying option",
      ],
    },
    login_and_email_stance: {
      forced_login_before_value: false,
      optional_email_save_reminder_after_value: true,
      recommended_first_version:
        "Local My Home Filters save/print/copy/reminder path before any account system.",
      future_account_value: [
        "cross-device home filter memory",
        "replacement reminders",
        "uploaded label photos",
        "filter history",
      ],
    },
    marketing_plan: {
      founder_ai_solo_builder_handle: "@FOUNDER_HANDLE_TBD",
      buckparts_brand_handle: "@BUCKPARTS_BRAND_HANDLE_TBD",
      every_post_must_include_educational_component: true,
      founder_themes: [
        "learning",
        "vibe-coding",
        "building in public",
        "what went wrong",
        "what was learned",
      ],
      brand_themes: [
        "wrong-part prevention",
        "evidence before BuckParts Verified Links",
        "official vs compatible clarity",
        "no verified link until evidence is clean",
      ],
    },
    future_brand_product_ideas: [
      "BuckParts as replacement-filter seal of confidence",
      "Visual Match Proof / Picture Match Check (compare what you have vs replacement — similarity is not proof)",
      "label/photo/screenshot upload for model stickers, filter labels, Amazon/retailer screenshots, and appliance tags",
      "printable/sticky-note filter cards",
      "home filter memory",
      "merch as future brand lane (not a core product blocker)",
    ],
    current_blockers,
    verified_link_coverage: {
      refrigerator_filter_slugs_in_catalog: coverage.ok === true ? coverage.total : "UNKNOWN",
      refrigerator_filter_slugs_with_safe_buyer_path:
        coverage.ok === true ? coverage.with_safe_path : "UNKNOWN",
      coverage_percent: coverage.ok === true ? coverage.coverage_percent : "UNKNOWN",
      source_path: coverage.ok === true ? "data/filters.csv+data/retailer_links.csv" : "UNKNOWN",
    },
    checklist_item_count: items.length,
    checklist_items: items,
    csv_apply_authorized: false,
    supabase_mutation_authorized: false,
    evidence_write_authorized: false,
    public_ui_mutation_authorized: false,
    netlify_api_authorized: false,
    buy_cta_authorized: false,
    buckparts_verified_link_authorized: false,
    proven_facts,
    inferred_facts,
    unknown_facts,
    recommended_next_action:
      "Use this checklist to rank certainty-engine gaps before any BuckParts Verified Link or public UI work; first unblock verified-link coverage and high-demand no-buy pages (e.g. rpwfe) using existing owner-review lanes — no mutation from this lane.",
  };
}
