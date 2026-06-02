/**
 * Read-only browser evidence capture for RPWFE official GE Appliance Parts spec PDP.
 * Does not mutate CSV, Supabase, public UI, or authorize BuckParts Verified Links.
 */

import { createHash } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { setTimeout as delay } from "node:timers/promises";
import { chromium, type Browser } from "playwright";

export const RPWFE_OFFICIAL_GE_BROWSER_EVIDENCE_CONTRACT_V1 = "rpwfe_official_ge_browser_evidence_v1" as const;

export const RPWFE_OFFICIAL_GE_TARGET_URL_V1 =
  "https://www.geapplianceparts.com/store/parts/spec/RPWFE" as const;

export const RPWFE_OFFICIAL_GE_ARTIFACT_REL_V1 =
  "data/fridge/batch-production/rpwfe-rescue/rpwfe-official-ge-browser-evidence-v1.json" as const;

const FILTER_SLUG = "rpwfe" as const;
const GOTO_MS = 48_000;
const SETTLE_MS = 2_000;
const HARD_MS = 75_000;
const PURCHASE_RE =
  /add to cart|buy now|checkout|add to basket|add to bag|shop now|purchase|add to order/i;

export type OemBrowserClassification =
  | "direct_buyable"
  | "likely_valid"
  | "likely_not_found"
  | "likely_search_results"
  | "likely_blocked"
  | "timeout"
  | "browser_error";

export type RpwfeOfficialGeBrowserEvidenceArtifactV1 = {
  contract: typeof RPWFE_OFFICIAL_GE_BROWSER_EVIDENCE_CONTRACT_V1;
  read_only: true;
  data_mutation: false;
  filter_slug: typeof FILTER_SLUG;
  target_url: typeof RPWFE_OFFICIAL_GE_TARGET_URL_V1;
  checked_at: string;
  browser_truth_status: "PASS" | "FAIL" | "UNKNOWN";
  direct_pdp_status: "PROVEN" | "NOT_PROVEN" | "UNKNOWN";
  exact_token_visible: boolean | "UNKNOWN";
  official_manufacturer_path: boolean | "UNKNOWN";
  direct_purchase_control_visible: boolean | "UNKNOWN";
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

function isChromeErrorUrl(url: string): boolean {
  const u = url.trim().toLowerCase();
  return u.startsWith("chrome-error:") || u.includes("chromewebdata");
}

export function classifyOemPage(args: {
  finalUrl: string;
  title: string;
  textSample: string;
  purchaseActions: string[];
  hardTimeout: boolean;
  gotoFailed: boolean;
  errorNote: string;
}): { classification: OemBrowserClassification; notes: string } {
  const fu = args.finalUrl.trim();

  if (isChromeErrorUrl(fu)) {
    return { classification: "browser_error", notes: args.errorNote || "Chrome error URL" };
  }
  if (args.hardTimeout) {
    return { classification: "timeout", notes: args.errorNote || "hard timeout" };
  }
  if (args.gotoFailed) {
    return { classification: "browser_error", notes: args.errorNote || "navigation failed" };
  }

  const u = args.finalUrl.toLowerCase();
  const blob = `${args.title}\n${args.textSample}`.toLowerCase();

  const blocked = [
    "access denied",
    "unusual traffic",
    "verify you are human",
    "captcha",
    "robot check",
    "automated access",
  ];
  if (blocked.some((p) => blob.includes(p))) {
    return { classification: "likely_blocked", notes: "block/challenge heuristic" };
  }

  const notFound = ["page not found", "404", "not found", "no longer available", "discontinued"];
  if (notFound.some((p) => blob.includes(p))) {
    return { classification: "likely_not_found", notes: "not-found/discontinued heuristic" };
  }

  const searchUrl = /[?&]searchkeyword=|\/search\.jsp|catalog\/search|\/search\?/i.test(u);
  const searchText = ["search results", "results for", "your search"];
  if (searchUrl || searchText.some((p) => blob.includes(p))) {
    return { classification: "likely_search_results", notes: "search/catalog URL or text" };
  }

  if (args.purchaseActions.length > 0) {
    return {
      classification: "direct_buyable",
      notes: `purchase action: ${args.purchaseActions.slice(0, 3).join(" | ")}`,
    };
  }

  return { classification: "likely_valid", notes: "no purchase control proven" };
}

function deriveRpwfeSignals(args: {
  targetUrl: string;
  finalUrl: string;
  title: string;
  h1Text: string;
  textSample: string;
  purchaseActions: string[];
  classification: OemBrowserClassification;
}): Pick<
  RpwfeOfficialGeBrowserEvidenceArtifactV1,
  | "browser_truth_status"
  | "direct_pdp_status"
  | "exact_token_visible"
  | "official_manufacturer_path"
  | "direct_purchase_control_visible"
  | "blockers"
> {
  const u = args.finalUrl.toLowerCase();
  const blob = `${args.title}\n${args.h1Text}\n${args.textSample}`.toUpperCase();

  const directPdp =
    /\/parts\/spec\/rpwfe/i.test(u) ||
    (/\/parts\/spec\//i.test(u) && u.includes("rpwfe"));
  const exactToken =
    /\bRPWFE\b/.test(blob) &&
    (args.title.toUpperCase().includes("RPWFE") || args.h1Text.toUpperCase().includes("RPWFE"));
  const officialPath =
    u.includes("geapplianceparts.com") &&
    (blob.includes("GE") || blob.includes("GE APPLIANCE"));
  const purchaseVisible = args.purchaseActions.length > 0;
  const notSearch = args.classification !== "likely_search_results";
  const notBlocked = args.classification !== "likely_blocked" && args.classification !== "browser_error";
  const not404 = args.classification !== "likely_not_found";

  const blockers: string[] = [];
  if (!directPdp) blockers.push("final_url_not_direct_spec_pdp");
  if (!exactToken) blockers.push("exact_token_RPWFE_not_visible_in_title_or_h1");
  if (!officialPath) blockers.push("official_ge_manufacturer_path_not_proven");
  if (!purchaseVisible) blockers.push("direct_purchase_control_not_visible");
  if (!notSearch) blockers.push("page_classified_as_search_or_catalog");
  if (!notBlocked) blockers.push(`browser_classification_${args.classification}`);
  if (!not404) blockers.push("page_not_found_or_unavailable");

  const pass =
    directPdp &&
    exactToken &&
    officialPath &&
    purchaseVisible &&
    notSearch &&
    notBlocked &&
    not404 &&
    args.classification === "direct_buyable";

  return {
    browser_truth_status: pass ? "PASS" : blockers.length > 0 ? "FAIL" : "UNKNOWN",
    direct_pdp_status: directPdp ? "PROVEN" : u.includes("rpwfe") ? "NOT_PROVEN" : "UNKNOWN",
    exact_token_visible: exactToken,
    official_manufacturer_path: officialPath,
    direct_purchase_control_visible: purchaseVisible,
    blockers,
  };
}

export type CaptureRpwfeOfficialGeBrowserEvidenceResultV1 = {
  artifact: RpwfeOfficialGeBrowserEvidenceArtifactV1;
  wrote_artifact: boolean;
  artifact_path: string;
};

export async function captureRpwfeOfficialGeBrowserEvidenceV1(args: {
  rootDir: string;
  targetUrl?: string;
  writeArtifact?: boolean;
  screenshotRelDir?: string;
}): Promise<CaptureRpwfeOfficialGeBrowserEvidenceResultV1> {
  const rootDir = args.rootDir;
  const targetUrl = args.targetUrl ?? RPWFE_OFFICIAL_GE_TARGET_URL_V1;
  const checkedAt = new Date().toISOString();
  const screenshotRel =
    args.screenshotRelDir ??
    "data/fridge/batch-production/rpwfe-rescue/screenshots/rpwfe-official-ge-spec-v1.png";

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
        "BuckPartsOEMBrowserTruth/1.0 (+https://buckparts.com; read-only RPWFE official GE capture)",
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
    h1Text =
      (await page.locator("h1").first().textContent().catch(() => ""))?.trim() ?? "";
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

    const screenshotAbs = path.join(rootDir, screenshotRel);
    mkdirSync(path.dirname(screenshotAbs), { recursive: true });
    await page.screenshot({ path: screenshotAbs, fullPage: false }).catch(() => {});
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

  const derived = deriveRpwfeSignals({
    targetUrl,
    finalUrl,
    title,
    h1Text,
    textSample,
    purchaseActions,
    classification,
  });

  const skuLineMatch = textSample.match(/SKU[^\n]{0,80}RPWFE[^\n]{0,40}/i);
  const evidence_summary = derived.browser_truth_status === "PASS"
    ? "PROVEN: GE Appliance Parts spec PDP for RPWFE with visible exact token and Add to Cart (or equivalent) on official manufacturer path."
    : `FAIL: official GE RPWFE browser capture did not pass all gates (${derived.blockers.join("; ") || classification}).`;

  const artifact: RpwfeOfficialGeBrowserEvidenceArtifactV1 = {
    contract: RPWFE_OFFICIAL_GE_BROWSER_EVIDENCE_CONTRACT_V1,
    read_only: true,
    data_mutation: false,
    filter_slug: FILTER_SLUG,
    target_url: RPWFE_OFFICIAL_GE_TARGET_URL_V1,
    checked_at: checkedAt,
    browser_truth_status: derived.browser_truth_status,
    direct_pdp_status: derived.direct_pdp_status,
    exact_token_visible: derived.exact_token_visible,
    official_manufacturer_path: derived.official_manufacturer_path,
    direct_purchase_control_visible: derived.direct_purchase_control_visible,
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
    },
    blockers: derived.blockers,
    prohibited_actions: [
      "csv_apply",
      "supabase_mutation",
      "public_ui_mutation",
      "netlify_deploy",
      "buckparts_verified_link_apply",
      "waterdrop_wd_f19c_capture",
      "learning_outcomes_write",
    ],
    buckparts_verified_link_authorized: false,
    csv_apply_authorized: false,
    supabase_mutation_authorized: false,
    public_ui_mutation_authorized: false,
    netlify_api_authorized: false,
    waterdrop_in_scope: false,
    owner_review_ready: derived.browser_truth_status === "PASS",
    apply_plan_proposal_ready: derived.browser_truth_status === "PASS",
  };

  const artifactPath = path.join(rootDir, RPWFE_OFFICIAL_GE_ARTIFACT_REL_V1);
  let wrote = false;
  if (args.writeArtifact !== false) {
    mkdirSync(path.dirname(artifactPath), { recursive: true });
    writeFileSync(artifactPath, `${JSON.stringify(artifact, null, 2)}\n`, "utf8");
    wrote = true;
  }

  return { artifact, wrote_artifact: wrote, artifact_path: artifactPath };
}

export function loadRpwfeOfficialGeBrowserEvidenceArtifactV1(args: {
  rootDir: string;
  fileExists?: (abs: string) => boolean;
  readTextFile?: (abs: string) => string;
}): RpwfeOfficialGeBrowserEvidenceArtifactV1 | null {
  const fileExists = args.fileExists ?? existsSync;
  const readTextFile = args.readTextFile ?? ((abs: string) => readFileSync(abs, "utf8"));
  const abs = path.join(args.rootDir, RPWFE_OFFICIAL_GE_ARTIFACT_REL_V1);
  if (!fileExists(abs)) return null;
  try {
    const parsed = JSON.parse(readTextFile(abs)) as RpwfeOfficialGeBrowserEvidenceArtifactV1;
    if (parsed.contract !== RPWFE_OFFICIAL_GE_BROWSER_EVIDENCE_CONTRACT_V1) return null;
    return parsed;
  } catch {
    return null;
  }
}

export function artifactContentSha256(artifact: RpwfeOfficialGeBrowserEvidenceArtifactV1): string {
  return createHash("sha256").update(JSON.stringify(artifact)).digest("hex");
}
