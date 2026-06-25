/**
 * Read-only Playwright browser evidence capture for GE refrigerator rescue cohort.
 * Generalizes RPWFE official GE capture — one artifact per slug under ge-rescue/.
 */

import { createHash } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { setTimeout as delay } from "node:timers/promises";
import { chromium } from "playwright";

import {
  allGeRescueBrowserGatesPass,
  assessExactTokenInPrimarySlice,
  assessWrongFamilyTokens,
  deriveGeRescueValidationGates,
  discoverGeSpecPdpUrl,
  geRescueBrowserEvidenceArtifactRelPathV1,
  geRescueBrowserEvidenceScreenshotRelPathV1,
  GE_REFRIGERATOR_RESCUE_ADAPTER_CONTRACT_V1,
  normGeToken,
  type GeRefrigeratorRescueValidationGateV1,
  type GeWrongFamilyAssessmentV1,
} from "./ge-refrigerator-rescue-adapter-v1";
import {
  classifyOemPage,
  type OemBrowserClassification,
} from "./rpwfe-official-ge-browser-capture-v1";

export const GE_REFRIGERATOR_RESCUE_BROWSER_EVIDENCE_CONTRACT_V1 =
  "ge_refrigerator_rescue_browser_evidence_v1" as const;

const GOTO_MS = 48_000;
const SETTLE_MS = 2_000;
const HARD_MS = 75_000;
const PURCHASE_RE =
  /add to cart|buy now|checkout|add to basket|add to bag|shop now|purchase|add to order/i;

export type GeRefrigeratorRescueBrowserEvidenceArtifactV1 = {
  contract: typeof GE_REFRIGERATOR_RESCUE_BROWSER_EVIDENCE_CONTRACT_V1;
  adapter_contract: typeof GE_REFRIGERATOR_RESCUE_ADAPTER_CONTRACT_V1;
  read_only: true;
  data_mutation: false;
  filter_slug: string;
  oem_part_token: string;
  target_url: string;
  checked_at: string;
  browser_truth_status: "PASS" | "FAIL" | "UNKNOWN";
  direct_pdp_status: "PROVEN" | "NOT_PROVEN" | "UNKNOWN";
  exact_token_in_primary_slice: boolean | "UNKNOWN";
  official_manufacturer_path: boolean | "UNKNOWN";
  direct_purchase_control_visible: boolean | "UNKNOWN";
  wrong_family_assessment: GeWrongFamilyAssessmentV1;
  validation_gates: GeRefrigeratorRescueValidationGateV1[];
  evidence_summary: string;
  captured_signals: {
    final_url: string | null;
    page_title: string | null;
    h1_text: string | null;
    sku_line_sample: string | null;
    purchase_actions_visible: string[];
    classification: OemBrowserClassification | "UNKNOWN";
    classification_notes: string | null;
    text_sample_excerpt: string | null;
    screenshot_path: string | null;
    navigation_error: string | null;
  };
  blockers: string[];
  prohibited_actions: string[];
  buckparts_verified_link_authorized: false;
  csv_apply_authorized: false;
  supabase_mutation_authorized: false;
  public_ui_mutation_authorized: false;
  netlify_api_authorized: false;
  waterdrop_in_scope: false;
  owner_review_ready: boolean;
  apply_plan_proposal_ready: boolean;
};

const PROHIBITED_ACTIONS = [
  "csv_apply",
  "supabase_mutation",
  "public_ui_mutation",
  "netlify_deploy",
  "buckparts_verified_link_apply",
  "waterdrop_capture",
  "learning_outcomes_write",
] as const;

export function deriveGeRescueBrowserSignals(args: {
  filterSlug: string;
  oemPartToken: string;
  targetUrl: string;
  csvPrimaryIsSearchPlaceholder: boolean;
  finalUrl: string;
  title: string;
  h1Text: string;
  textSample: string;
  purchaseActions: string[];
  classification: OemBrowserClassification;
  captureCompleted: boolean;
}): {
  validation_gates: GeRefrigeratorRescueValidationGateV1[];
  wrong_family_assessment: GeWrongFamilyAssessmentV1;
  browser_truth_status: "PASS" | "FAIL" | "UNKNOWN";
  direct_pdp_status: "PROVEN" | "NOT_PROVEN" | "UNKNOWN";
  exact_token_in_primary_slice: boolean | "UNKNOWN";
  official_manufacturer_path: boolean | "UNKNOWN";
  direct_purchase_control_visible: boolean | "UNKNOWN";
  blockers: string[];
  owner_review_ready: boolean;
  apply_plan_proposal_ready: boolean;
} {
  const token = normGeToken(args.oemPartToken);
  const discovery = discoverGeSpecPdpUrl({
    filterSlug: args.filterSlug,
    oemPartToken: token,
  });
  const wrongFamily = assessWrongFamilyTokens({
    filterSlug: args.filterSlug,
    oemPartToken: token,
    finalUrl: args.finalUrl,
    title: args.title,
    h1Text: args.h1Text,
    textSample: args.textSample,
  });
  const gates = deriveGeRescueValidationGates({
    filterSlug: args.filterSlug,
    oemPartToken: token,
    csvPrimaryIsSearchPlaceholder: args.csvPrimaryIsSearchPlaceholder,
    discoveredSpecUrl: discovery?.inferred_spec_url ?? null,
    discoveredSpecKnownBroken: discovery?.known_broken_destination ?? false,
    finalUrl: args.finalUrl,
    title: args.title,
    h1Text: args.h1Text,
    textSample: args.textSample,
    purchaseActions: args.purchaseActions,
    classification: args.classification,
    wrongFamily,
    captureCompleted: args.captureCompleted,
  });

  const blockers = gates.filter((g) => g.status === "FAIL").map((g) => g.gate_id);
  const pass = args.captureCompleted && allGeRescueBrowserGatesPass(gates);
  const u = args.finalUrl.toLowerCase();
  const tokenLower = token.toLowerCase();
  const directPdp =
    /\/parts\/spec\//i.test(u) &&
    (u.includes(`/spec/${tokenLower}`) ||
      (u.includes(tokenLower) && !u.includes(`${tokenLower}2`)));

  return {
    validation_gates: gates,
    wrong_family_assessment: wrongFamily,
    browser_truth_status: pass ? "PASS" : blockers.length > 0 ? "FAIL" : "UNKNOWN",
    direct_pdp_status: directPdp ? "PROVEN" : u.includes(tokenLower) ? "NOT_PROVEN" : "UNKNOWN",
    exact_token_in_primary_slice: assessExactTokenInPrimarySlice({
      oemPartToken: token,
      title: args.title,
      h1Text: args.h1Text,
      textSample: args.textSample,
    }),
    official_manufacturer_path:
      u.includes("geapplianceparts.com") &&
      (`${args.title}\n${args.h1Text}`.toUpperCase().includes("GE") ||
        u.includes("geapplianceparts.com")),
    direct_purchase_control_visible: args.purchaseActions.length > 0,
    blockers,
    owner_review_ready: pass,
    apply_plan_proposal_ready: pass,
  };
}

export type CaptureGeRefrigeratorRescueBrowserEvidenceResultV1 = {
  artifact: GeRefrigeratorRescueBrowserEvidenceArtifactV1;
  wrote_artifact: boolean;
  artifact_path: string;
};

export async function captureGeRefrigeratorRescueBrowserEvidenceV1(args: {
  rootDir: string;
  filterSlug: string;
  oemPartToken: string;
  targetUrl?: string;
  csvPrimaryIsSearchPlaceholder?: boolean;
  writeArtifact?: boolean;
}): Promise<CaptureGeRefrigeratorRescueBrowserEvidenceResultV1> {
  const slug = args.filterSlug.trim().toLowerCase();
  const token = normGeToken(args.oemPartToken);
  const discovery = discoverGeSpecPdpUrl({ filterSlug: slug, oemPartToken: token });
  if (discovery?.known_broken_destination) {
    throw new Error(
      `GE spec PDP for ${slug} is known_broken_destination in repo — browser capture blocked until alternate path proven`,
    );
  }
  const targetUrl = args.targetUrl ?? discovery?.inferred_spec_url;
  if (!targetUrl) {
    throw new Error(`No GE spec PDP URL discovered for slug ${slug} token ${token}`);
  }

  const checkedAt = new Date().toISOString();
  const screenshotRel = geRescueBrowserEvidenceScreenshotRelPathV1(slug);

  let finalUrl = "";
  let title = "";
  let h1Text = "";
  let textSample = "";
  let purchaseActions: string[] = [];
  let gotoErr = "";
  let hardTimedOut = false;
  let gotoFailed = false;

  const browser = await chromium.launch({ headless: true });
  try {
    const context = await browser.newContext({
      userAgent:
        "BuckPartsOEMBrowserTruth/1.0 (+https://buckparts.com; read-only GE refrigerator rescue capture)",
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

    if (args.writeArtifact !== false) {
      const screenshotAbs = path.join(args.rootDir, screenshotRel);
      mkdirSync(path.dirname(screenshotAbs), { recursive: true });
      await page.screenshot({ path: screenshotAbs, fullPage: false }).catch(() => {});
    }
    await context.close().catch(() => {});
  } finally {
    await browser.close().catch(() => {});
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

  const derived = deriveGeRescueBrowserSignals({
    filterSlug: slug,
    oemPartToken: token,
    targetUrl,
    csvPrimaryIsSearchPlaceholder: args.csvPrimaryIsSearchPlaceholder ?? true,
    finalUrl,
    title,
    h1Text,
    textSample,
    purchaseActions,
    classification,
    captureCompleted: true,
  });

  const skuRe = new RegExp(`SKU[^\\n]{0,80}${token}[^\\n]{0,40}`, "i");
  const skuLineMatch = textSample.match(skuRe);

  const evidence_summary =
    derived.browser_truth_status === "PASS"
      ? `PROVEN: GE Appliance Parts spec PDP for ${token} with exact token in primary slice and direct purchase control.`
      : `FAIL: GE ${token} browser capture did not pass all gates (${derived.blockers.join("; ") || classification}).`;

  const artifact: GeRefrigeratorRescueBrowserEvidenceArtifactV1 = {
    contract: GE_REFRIGERATOR_RESCUE_BROWSER_EVIDENCE_CONTRACT_V1,
    adapter_contract: GE_REFRIGERATOR_RESCUE_ADAPTER_CONTRACT_V1,
    read_only: true,
    data_mutation: false,
    filter_slug: slug,
    oem_part_token: token,
    target_url: targetUrl,
    checked_at: checkedAt,
    browser_truth_status: derived.browser_truth_status,
    direct_pdp_status: derived.direct_pdp_status,
    exact_token_in_primary_slice: derived.exact_token_in_primary_slice,
    official_manufacturer_path: derived.official_manufacturer_path,
    direct_purchase_control_visible: derived.direct_purchase_control_visible,
    wrong_family_assessment: derived.wrong_family_assessment,
    validation_gates: derived.validation_gates,
    evidence_summary,
    captured_signals: {
      final_url: finalUrl || null,
      page_title: title || null,
      h1_text: h1Text || null,
      sku_line_sample: skuLineMatch ? skuLineMatch[0].trim() : null,
      purchase_actions_visible: purchaseActions,
      classification,
      classification_notes: notes,
      text_sample_excerpt: textSample.slice(0, 800) || null,
      screenshot_path: args.writeArtifact !== false ? screenshotRel : null,
      navigation_error: gotoErr || null,
    },
    blockers: derived.blockers,
    prohibited_actions: [...PROHIBITED_ACTIONS],
    buckparts_verified_link_authorized: false,
    csv_apply_authorized: false,
    supabase_mutation_authorized: false,
    public_ui_mutation_authorized: false,
    netlify_api_authorized: false,
    waterdrop_in_scope: false,
    owner_review_ready: derived.owner_review_ready,
    apply_plan_proposal_ready: derived.apply_plan_proposal_ready,
  };

  const artifactRel = geRescueBrowserEvidenceArtifactRelPathV1(slug);
  const artifactPath = path.join(args.rootDir, artifactRel);
  let wrote = false;
  if (args.writeArtifact !== false) {
    mkdirSync(path.dirname(artifactPath), { recursive: true });
    writeFileSync(artifactPath, `${JSON.stringify(artifact, null, 2)}\n`, "utf8");
    wrote = true;
  }

  return { artifact, wrote_artifact: wrote, artifact_path: artifactPath };
}

export function loadGeRefrigeratorRescueBrowserEvidenceArtifactV1(args: {
  rootDir: string;
  filterSlug: string;
  fileExists?: (abs: string) => boolean;
  readTextFile?: (abs: string) => string;
}): GeRefrigeratorRescueBrowserEvidenceArtifactV1 | null {
  const fileExists = args.fileExists ?? existsSync;
  const readTextFile = args.readTextFile ?? ((abs: string) => readFileSync(abs, "utf8"));
  const abs = path.join(args.rootDir, geRescueBrowserEvidenceArtifactRelPathV1(args.filterSlug));
  if (!fileExists(abs)) return null;
  try {
    const parsed = JSON.parse(readTextFile(abs)) as GeRefrigeratorRescueBrowserEvidenceArtifactV1;
    if (parsed.contract !== GE_REFRIGERATOR_RESCUE_BROWSER_EVIDENCE_CONTRACT_V1) return null;
    return parsed;
  } catch {
    return null;
  }
}

export function geRescueBrowserEvidenceContentSha256(
  artifact: GeRefrigeratorRescueBrowserEvidenceArtifactV1,
): string {
  return createHash("sha256").update(JSON.stringify(artifact)).digest("hex");
}
