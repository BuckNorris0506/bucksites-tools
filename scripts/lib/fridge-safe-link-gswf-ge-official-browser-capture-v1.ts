/**
 * Read-only Playwright capture for GSWF official GE Appliance Parts spec PDP.
 * Writes draft proof artifacts only — no CSV/Supabase/evidence mutation.
 */

import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { setTimeout as delay } from "node:timers/promises";
import { chromium } from "playwright";

import { classifyOemPage, type OemBrowserClassification } from "./rpwfe-official-ge-browser-capture-v1";

export const FRIDGE_SAFE_LINK_GSWF_GE_OFFICIAL_OWNER_BROWSER_PROOF_CONTRACT_V1 =
  "fridge_safe_link_gswf_ge_official_owner_browser_proof_v1" as const;

export const FRIDGE_SAFE_LINK_GSWF_GE_OFFICIAL_TARGET_URL_V1 =
  "https://www.geapplianceparts.com/store/parts/spec/GSWF" as const;

export const FRIDGE_SAFE_LINK_GSWF_GE_OFFICIAL_PROOF_JSON_REL_V1 =
  "data/fridge/batch-production/drafts/fridge-safe-link-gswf-ge-official-owner-browser-proof-v1.json" as const;

export const FRIDGE_SAFE_LINK_GSWF_GE_OFFICIAL_PROOF_MD_REL_V1 =
  "data/fridge/batch-production/drafts/fridge-safe-link-gswf-ge-official-owner-browser-proof-v1.md" as const;

export const FRIDGE_SAFE_LINK_GSWF_GE_OFFICIAL_SCREENSHOT_REL_V1 =
  "data/fridge/batch-production/drafts/screenshots/fridge-safe-link-gswf-ge-official-spec-v1.png" as const;

export const FRIDGE_SAFE_LINK_GSWF_GE_OFFICIAL_PROOF_ALLOWED_WRITE_REL_PATHS_V1 = [
  FRIDGE_SAFE_LINK_GSWF_GE_OFFICIAL_PROOF_JSON_REL_V1,
  FRIDGE_SAFE_LINK_GSWF_GE_OFFICIAL_PROOF_MD_REL_V1,
  FRIDGE_SAFE_LINK_GSWF_GE_OFFICIAL_SCREENSHOT_REL_V1,
] as const;

const FILTER_SLUG = "gswf" as const;
const OEM_TOKEN = "GSWF" as const;
const GOTO_MS = 48_000;
const SETTLE_MS = 2_000;
const HARD_MS = 75_000;
const PURCHASE_RE =
  /add to cart|buy now|checkout|add to basket|add to bag|shop now|purchase|add to order/i;

export type FridgeSafeLinkGswfGeOfficialOwnerBrowserProofV1 = {
  contract: typeof FRIDGE_SAFE_LINK_GSWF_GE_OFFICIAL_OWNER_BROWSER_PROOF_CONTRACT_V1;
  read_only: true;
  data_mutation: false;
  mutation_authorized: false;
  verified_link_authorized: false;
  csv_apply_authorized: false;
  supabase_mutation_authorized: false;
  evidence_write_authorized: false;
  netlify_api_authorized: false;
  production_go_click_authorized: false;
  filter_slug: typeof FILTER_SLUG;
  oem_part_token: typeof OEM_TOKEN;
  target_url: typeof FRIDGE_SAFE_LINK_GSWF_GE_OFFICIAL_TARGET_URL_V1;
  path_type: "official_manufacturer_spec_pdp";
  checked_at: string;
  capture_method: "playwright_headless" | "owner_browser_checklist_only";
  http_load_result: "PROVEN" | "INFERRED" | "UNKNOWN";
  browser_truth_status: "PASS" | "FAIL" | "UNKNOWN";
  direct_pdp_status: "PROVEN" | "NOT_PROVEN" | "UNKNOWN";
  exact_token_gswf_proven: boolean | "UNKNOWN";
  current_direct_buyability_proven: boolean | "UNKNOWN";
  official_manufacturer_path_proven: boolean | "UNKNOWN";
  gswf2_conflation_blocked: boolean;
  gswf2_conflation_notes: string;
  ge_pdp_proof_result: "PROVEN" | "INFERRED" | "UNKNOWN";
  evidence_summary: string;
  captured_signals: {
    final_url: string | null;
    page_title: string | null;
    h1_text: string | null;
    purchase_actions_visible: string[];
    classification: OemBrowserClassification | "UNKNOWN";
    classification_notes: string | null;
    text_sample_excerpt: string | null;
    screenshot_path: string | null;
    navigation_error: string | null;
  };
  blockers: string[];
  owner_browser_checklist: string[];
  apply_plan_proposal_justified: false;
  recommended_next_action: string;
  proven_facts: string[];
  unknown_facts: string[];
};

export function assessGswf2Conflation(args: {
  finalUrl: string;
  title: string;
  h1Text: string;
  textSample: string;
}): { blocked: boolean; notes: string; exactToken: boolean | "UNKNOWN" } {
  const url = args.finalUrl.toLowerCase();
  const h1 = args.h1Text.toUpperCase();
  const title = args.title.toUpperCase();
  const blob = `${title}\n${h1}\n${args.textSample.toUpperCase()}`;

  if (url.includes("/gswf2") || /\/spec\/gswf2\b/i.test(url)) {
    return {
      blocked: true,
      notes: "final URL resolves to GSWF2 spec path — not GSWF slug target",
      exactToken: false,
    };
  }

  const tokenInIdentity = /\bGSWF\b/.test(title) || /\bGSWF\b/.test(h1);
  const gswf2InIdentity = /\bGSWF2\b/.test(title) || /\bGSWF2\b/.test(h1);

  if (gswf2InIdentity && !tokenInIdentity) {
    return {
      blocked: true,
      notes: "page identity shows GSWF2 without literal GSWF in title/h1",
      exactToken: false,
    };
  }

  if (!tokenInIdentity && !/\bGSWF\b/.test(blob)) {
    return {
      blocked: true,
      notes: "literal GSWF not visible in page title, h1, or text sample",
      exactToken: false,
    };
  }

  if (gswf2InIdentity && tokenInIdentity) {
    return {
      blocked: false,
      notes: "GSWF and GSWF2 both mentioned — owner must confirm single-pack GSWF PDP not GSWF2 housing",
      exactToken: true,
    };
  }

  return {
    blocked: false,
    notes: "no GSWF2 primary identity detected on GSWF spec URL",
    exactToken: tokenInIdentity,
  };
}

export function deriveGswfGeOfficialProofSignals(args: {
  targetUrl: string;
  finalUrl: string;
  title: string;
  h1Text: string;
  textSample: string;
  purchaseActions: string[];
  classification: OemBrowserClassification;
  captureSucceeded: boolean;
}): Pick<
  FridgeSafeLinkGswfGeOfficialOwnerBrowserProofV1,
  | "http_load_result"
  | "browser_truth_status"
  | "direct_pdp_status"
  | "exact_token_gswf_proven"
  | "current_direct_buyability_proven"
  | "official_manufacturer_path_proven"
  | "gswf2_conflation_blocked"
  | "gswf2_conflation_notes"
  | "ge_pdp_proof_result"
  | "blockers"
> {
  const u = args.finalUrl.toLowerCase();
  const conflation = assessGswf2Conflation({
    finalUrl: args.finalUrl,
    title: args.title,
    h1Text: args.h1Text,
    textSample: args.textSample,
  });

  const directPdp =
    /\/parts\/spec\/gswf\b/i.test(u) ||
    (/\/parts\/spec\//i.test(u) && u.includes("gswf") && !u.includes("gswf2"));
  const officialPath =
    u.includes("geapplianceparts.com") &&
    (`${args.title}\n${args.h1Text}\n${args.textSample}`.toUpperCase().includes("GE") ||
      u.includes("geapplianceparts.com"));
  const purchaseVisible = args.purchaseActions.length > 0;
  const notSearch = args.classification !== "likely_search_results";
  const notBlocked = args.classification !== "likely_blocked" && args.classification !== "browser_error";
  const not404 = args.classification !== "likely_not_found";

  const blockers: string[] = [];
  if (!args.captureSucceeded) blockers.push("browser_capture_not_completed");
  if (!directPdp) blockers.push("final_url_not_direct_spec_pdp");
  if (conflation.blocked) blockers.push(`gswf2_conflation:${conflation.notes}`);
  if (conflation.exactToken !== true) blockers.push("exact_token_GSWF_not_proven");
  if (!officialPath) blockers.push("official_ge_manufacturer_path_not_proven");
  if (!purchaseVisible) blockers.push("direct_purchase_control_not_visible");
  if (!notSearch) blockers.push("page_classified_as_search_or_catalog");
  if (!notBlocked) blockers.push(`browser_classification_${args.classification}`);
  if (!not404) blockers.push("page_not_found_or_unavailable");

  const pass =
    args.captureSucceeded &&
    directPdp &&
    conflation.exactToken === true &&
    !conflation.blocked &&
    officialPath &&
    purchaseVisible &&
    notSearch &&
    notBlocked &&
    not404 &&
    args.classification === "direct_buyable";

  const httpLoad: "PROVEN" | "INFERRED" | "UNKNOWN" = args.captureSucceeded
    ? args.classification === "browser_error" || args.classification === "timeout"
      ? "UNKNOWN"
      : "PROVEN"
    : "UNKNOWN";

  let geProof: "PROVEN" | "INFERRED" | "UNKNOWN" = "UNKNOWN";
  if (pass) geProof = "PROVEN";
  else if (args.captureSucceeded && directPdp && conflation.exactToken === true) geProof = "INFERRED";

  return {
    http_load_result: httpLoad,
    browser_truth_status: pass ? "PASS" : args.captureSucceeded ? "FAIL" : "UNKNOWN",
    direct_pdp_status: directPdp ? "PROVEN" : u.includes("gswf") ? "NOT_PROVEN" : "UNKNOWN",
    exact_token_gswf_proven: conflation.exactToken,
    current_direct_buyability_proven: purchaseVisible && args.classification === "direct_buyable",
    official_manufacturer_path_proven: officialPath,
    gswf2_conflation_blocked: conflation.blocked,
    gswf2_conflation_notes: conflation.notes,
    ge_pdp_proof_result: geProof,
    blockers,
  };
}

export function buildOwnerBrowserChecklistOnlyProof(args: {
  now?: () => Date;
  captureError?: string;
}): FridgeSafeLinkGswfGeOfficialOwnerBrowserProofV1 {
  const now = args.now ?? (() => new Date());
  const checklist = [
    "Open https://www.geapplianceparts.com/store/parts/spec/GSWF in owner US browser (not BuckParts /go).",
    "Confirm final URL remains /store/parts/spec/GSWF (not catalog/search).",
    "Confirm page title or H1 contains literal GSWF (not GSWF2-only identity).",
    "Confirm GE Appliance Parts / official manufacturer context.",
    "Confirm Add to Cart (or equivalent) and price/stock visible on single-pack GSWF PDP.",
    "Confirm page is not GSWF2 housing listing — gswf2 is a separate slug in filters.csv.",
    "Do not mutate retailer_links.csv, Supabase, or data/evidence from this checklist alone.",
  ];

  return {
    contract: FRIDGE_SAFE_LINK_GSWF_GE_OFFICIAL_OWNER_BROWSER_PROOF_CONTRACT_V1,
    read_only: true,
    data_mutation: false,
    mutation_authorized: false,
    verified_link_authorized: false,
    csv_apply_authorized: false,
    supabase_mutation_authorized: false,
    evidence_write_authorized: false,
    netlify_api_authorized: false,
    production_go_click_authorized: false,
    filter_slug: FILTER_SLUG,
    oem_part_token: OEM_TOKEN,
    target_url: FRIDGE_SAFE_LINK_GSWF_GE_OFFICIAL_TARGET_URL_V1,
    path_type: "official_manufacturer_spec_pdp",
    checked_at: now().toISOString(),
    capture_method: "owner_browser_checklist_only",
    http_load_result: "UNKNOWN",
    browser_truth_status: "UNKNOWN",
    direct_pdp_status: "UNKNOWN",
    exact_token_gswf_proven: "UNKNOWN",
    current_direct_buyability_proven: "UNKNOWN",
    official_manufacturer_path_proven: "UNKNOWN",
    gswf2_conflation_blocked: false,
    gswf2_conflation_notes: "live capture unavailable — conflation not assessed",
    ge_pdp_proof_result: "UNKNOWN",
    evidence_summary:
      "UNKNOWN: live GE spec PDP not captured in this environment; owner-browser checklist required.",
    captured_signals: {
      final_url: null,
      page_title: null,
      h1_text: null,
      purchase_actions_visible: [],
      classification: "UNKNOWN",
      classification_notes: args.captureError ?? "playwright capture not run or failed",
      text_sample_excerpt: null,
      screenshot_path: null,
      navigation_error: args.captureError ?? null,
    },
    blockers: [
      "live_browser_capture_unavailable_or_failed",
      "exact_token_GSWF_not_proven",
      "current_direct_buyability_not_proven",
      "mutation_authorized=false",
      "verified_link_authorized=false",
    ],
    owner_browser_checklist: checklist,
    apply_plan_proposal_justified: false,
    recommended_next_action:
      "Complete owner-browser checklist for GE spec GSWF PDP; rerun npm run buckparts:fridge-safe-link-gswf-ge-official-proof when Playwright capture is available.",
    proven_facts: [
      "PROVEN: draft proof packet is read_only=true; all mutation flags false.",
      "PROVEN: target is gswf/GSWF official spec URL only — Amazon B0002GTTRC out of scope for this packet.",
    ],
    unknown_facts: [
      "UNKNOWN: HTTP load, page title, exact token, buyability, and GSWF2 conflation until owner browser or successful Playwright capture.",
    ],
  };
}

export async function captureGswfGeOfficialOwnerBrowserProofV1(args: {
  rootDir: string;
  now?: () => Date;
  writeDrafts?: boolean;
}): Promise<FridgeSafeLinkGswfGeOfficialOwnerBrowserProofV1> {
  const now = args.now ?? (() => new Date());
  const targetUrl = FRIDGE_SAFE_LINK_GSWF_GE_OFFICIAL_TARGET_URL_V1;
  const screenshotRel = FRIDGE_SAFE_LINK_GSWF_GE_OFFICIAL_SCREENSHOT_REL_V1;

  let finalUrl = "";
  let title = "";
  let h1Text = "";
  let textSample = "";
  let purchaseActions: string[] = [];
  let gotoErr = "";
  let hardTimedOut = false;
  let gotoFailed = false;
  let captureSucceeded = false;

  try {
    const browser = await chromium.launch({ headless: true });
    try {
      const context = await browser.newContext({
        userAgent:
          "BuckPartsOEMBrowserTruth/1.0 (+https://buckparts.com; read-only GSWF official GE capture)",
        viewport: { width: 1280, height: 720 },
      });
      const page = await context.newPage();

      const navigate = async () => {
        try {
          await page.goto(targetUrl, { waitUntil: "domcontentloaded", timeout: GOTO_MS });
          await delay(SETTLE_MS);
        } catch (e) {
          gotoFailed = true;
          gotoErr = e instanceof Error ? e.message : String(e);
        }
      };

      let hardTimer: ReturnType<typeof setTimeout> | undefined;
      await Promise.race([
        navigate().finally(() => {
          if (hardTimer !== undefined) clearTimeout(hardTimer);
        }),
        new Promise<void>((resolve) => {
          hardTimer = setTimeout(() => {
            hardTimedOut = true;
            resolve();
          }, HARD_MS);
        }),
      ]);

      finalUrl = page.url();
      title = (await page.title().catch(() => "")) ?? "";
      h1Text = (await page.locator("h1").first().textContent().catch(() => ""))?.trim() ?? "";
      textSample = (
        await page.evaluate(() => document.body?.innerText ?? "").catch(() => "")
      ).slice(0, 12_000);

      const candidates = page.locator(
        'button, [role="button"], a, input[type="submit"], input[type="button"]',
      );
      const count = Math.min(await candidates.count().catch(() => 0), 200);
      const seen = new Set<string>();
      for (let i = 0; i < count; i++) {
        const el = candidates.nth(i);
        if (!(await el.isVisible().catch(() => false))) continue;
        const text = (
          [
            await el.textContent().catch(() => ""),
            await el.getAttribute("aria-label").catch(() => ""),
            await el.getAttribute("title").catch(() => ""),
          ]
            .filter(Boolean)
            .join(" ")
            .replace(/\s+/g, " ")
            .trim()
        );
        if (!text || !PURCHASE_RE.test(text) || seen.has(text)) continue;
        seen.add(text);
        purchaseActions.push(text);
        if (purchaseActions.length >= 6) break;
      }

      if (args.writeDrafts !== false) {
        const screenshotAbs = path.join(args.rootDir, screenshotRel);
        mkdirSync(path.dirname(screenshotAbs), { recursive: true });
        await page.screenshot({ path: screenshotAbs, fullPage: false }).catch(() => {});
      }

      await context.close().catch(() => {});
      captureSucceeded = Boolean(finalUrl && !gotoFailed && !hardTimedOut);
    } finally {
      await browser.close().catch(() => {});
    }
  } catch (e) {
    gotoErr = e instanceof Error ? e.message : String(e);
    return buildOwnerBrowserChecklistOnlyProof({ now, captureError: gotoErr });
  }

  const { classification, notes } = classifyOemPage({
    finalUrl,
    title,
    textSample,
    purchaseActions,
    hardTimeout: hardTimedOut,
    gotoFailed,
    errorNote: gotoErr.replace(/\s+/g, " ").slice(0, 400),
  });

  const derived = deriveGswfGeOfficialProofSignals({
    targetUrl,
    finalUrl,
    title,
    h1Text,
    textSample,
    purchaseActions,
    classification,
    captureSucceeded,
  });

  const checklist = [
    "Verify captured final URL matches /store/parts/spec/GSWF.",
    "Owner confirms literal GSWF in product identity matches filter slug gswf.",
    "Owner confirms Add to Cart path is single-pack GSWF, not GSWF2.",
    "Do not apply CSV/Supabase/Verified Link from this draft alone.",
  ];

  const evidence_summary =
    derived.browser_truth_status === "PASS"
      ? "PROVEN: GE Appliance Parts spec PDP for GSWF with visible exact token and Add to Cart on official manufacturer path."
      : derived.browser_truth_status === "FAIL"
        ? `FAIL: GE GSWF browser capture did not pass all gates (${derived.blockers.join("; ")}).`
        : "UNKNOWN: GE GSWF browser capture incomplete.";

  return {
    contract: FRIDGE_SAFE_LINK_GSWF_GE_OFFICIAL_OWNER_BROWSER_PROOF_CONTRACT_V1,
    read_only: true,
    data_mutation: false,
    mutation_authorized: false,
    verified_link_authorized: false,
    csv_apply_authorized: false,
    supabase_mutation_authorized: false,
    evidence_write_authorized: false,
    netlify_api_authorized: false,
    production_go_click_authorized: false,
    filter_slug: FILTER_SLUG,
    oem_part_token: OEM_TOKEN,
    target_url: FRIDGE_SAFE_LINK_GSWF_GE_OFFICIAL_TARGET_URL_V1,
    path_type: "official_manufacturer_spec_pdp",
    checked_at: now().toISOString(),
    capture_method: "playwright_headless",
    http_load_result: derived.http_load_result,
    browser_truth_status: derived.browser_truth_status,
    direct_pdp_status: derived.direct_pdp_status,
    exact_token_gswf_proven: derived.exact_token_gswf_proven,
    current_direct_buyability_proven: derived.current_direct_buyability_proven,
    official_manufacturer_path_proven: derived.official_manufacturer_path_proven,
    gswf2_conflation_blocked: derived.gswf2_conflation_blocked,
    gswf2_conflation_notes: derived.gswf2_conflation_notes,
    ge_pdp_proof_result: derived.ge_pdp_proof_result,
    evidence_summary,
    captured_signals: {
      final_url: finalUrl || null,
      page_title: title || null,
      h1_text: h1Text || null,
      purchase_actions_visible: purchaseActions,
      classification,
      classification_notes: notes,
      text_sample_excerpt: textSample.slice(0, 800) || null,
      screenshot_path: args.writeDrafts !== false ? screenshotRel : null,
      navigation_error: gotoErr || null,
    },
    blockers: derived.blockers,
    owner_browser_checklist: checklist,
    apply_plan_proposal_justified: false,
    recommended_next_action:
      derived.browser_truth_status === "PASS"
        ? "Owner review this draft proof packet. A separate read-only apply-plan proposal may be drafted next — still no CSV/Supabase/Verified Link apply without explicit owner authorization."
        : "Owner complete browser checklist or rerun capture; do not draft apply proposal until ge_pdp_proof_result=PROVEN.",
    proven_facts: [
      "PROVEN: draft proof packet is read_only=true; all mutation flags false.",
      "PROVEN: capture targeted https://www.geapplianceparts.com/store/parts/spec/GSWF only.",
      `PROVEN: playwright capture_method=${captureSucceeded ? "completed" : "incomplete"}.`,
      ...(derived.direct_pdp_status === "PROVEN"
        ? ["PROVEN: final URL is direct spec PDP path."]
        : []),
      ...(derived.exact_token_gswf_proven === true
        ? ["PROVEN: literal GSWF visible in page title or h1."]
        : []),
      ...(derived.current_direct_buyability_proven === true
        ? [`PROVEN: purchase actions visible: ${purchaseActions.slice(0, 3).join(" | ")}`]
        : []),
    ],
    unknown_facts:
      derived.browser_truth_status === "PASS"
        ? [
            "UNKNOWN: production /go first-hop without clicking /go.",
            "UNKNOWN: live Supabase retailer_links parity.",
          ]
        : [
            "UNKNOWN: current buyer path until capture passes or owner completes checklist.",
            "UNKNOWN: production /go first-hop without clicking /go.",
          ],
  };
}

export function buildGswfGeOfficialOwnerBrowserProofMarkdownV1(
  proof: FridgeSafeLinkGswfGeOfficialOwnerBrowserProofV1,
): string {
  return [
    "# GSWF GE official owner-browser proof (read-only draft)",
    "",
    `Checked: ${proof.checked_at}`,
    `Capture: ${proof.capture_method}`,
    "",
    `**ge_pdp_proof_result:** \`${proof.ge_pdp_proof_result}\``,
    `**browser_truth_status:** \`${proof.browser_truth_status}\``,
    "",
    proof.evidence_summary,
    "",
    "## Target",
    "",
    `- slug: **${proof.filter_slug}**`,
    `- token: **${proof.oem_part_token}**`,
    `- URL: ${proof.target_url}`,
    "",
    "## Signals",
    "",
    `- final_url: ${proof.captured_signals.final_url ?? "UNKNOWN"}`,
    `- page_title: ${proof.captured_signals.page_title ?? "UNKNOWN"}`,
    `- h1: ${proof.captured_signals.h1_text ?? "UNKNOWN"}`,
    `- exact_token_gswf_proven: **${proof.exact_token_gswf_proven}**`,
    `- current_direct_buyability_proven: **${proof.current_direct_buyability_proven}**`,
    `- gswf2_conflation_blocked: **${proof.gswf2_conflation_blocked}** (${proof.gswf2_conflation_notes})`,
    `- purchase_actions: ${proof.captured_signals.purchase_actions_visible.join(", ") || "none"}`,
    "",
    "## Authorization (all false)",
    "",
    "mutation, csv_apply, supabase, evidence_write, verified_link, production_go_click, netlify",
    "",
    "## Owner checklist",
    "",
    ...proof.owner_browser_checklist.map((c) => `- ${c}`),
    "",
    "## Blockers",
    "",
    ...proof.blockers.map((b) => `- ${b}`),
    "",
    proof.recommended_next_action,
    "",
  ].join("\n");
}

export function writeGswfGeOfficialOwnerBrowserProofDraftsV1(args: {
  rootDir: string;
  proof: FridgeSafeLinkGswfGeOfficialOwnerBrowserProofV1;
}): { json_rel_path: string; md_rel_path: string } {
  const jsonRel = FRIDGE_SAFE_LINK_GSWF_GE_OFFICIAL_PROOF_JSON_REL_V1;
  const mdRel = FRIDGE_SAFE_LINK_GSWF_GE_OFFICIAL_PROOF_MD_REL_V1;
  const jsonAbs = path.join(args.rootDir, jsonRel);
  const mdAbs = path.join(args.rootDir, mdRel);
  mkdirSync(path.dirname(jsonAbs), { recursive: true });
  mkdirSync(path.dirname(mdAbs), { recursive: true });
  writeFileSync(jsonAbs, `${JSON.stringify(args.proof, null, 2)}\n`, "utf8");
  writeFileSync(mdAbs, `${buildGswfGeOfficialOwnerBrowserProofMarkdownV1(args.proof)}\n`, "utf8");
  if (!existsSync(jsonAbs) || !existsSync(mdAbs)) {
    throw new Error("failed to write GSWF GE official proof drafts");
  }
  return { json_rel_path: jsonRel, md_rel_path: mdRel };
}
