/**
 * Manufacturer Safe Link Rescue Framework v1 — shared read-only rescue primitives.
 * BuckParts Truth Contract: repo truth, UNKNOWN over guessing, fail closed, no mutation.
 */

import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { setTimeout as delay } from "node:timers/promises";
import { chromium } from "playwright";

import type { OemBrowserClassification } from "./rpwfe-official-ge-browser-capture-v1";
import { classifyOemPage } from "./rpwfe-official-ge-browser-capture-v1";

export const MANUFACTURER_SAFE_LINK_RESCUE_FRAMEWORK_CONTRACT_V1 =
  "manufacturer_safe_link_rescue_framework_v1" as const;

export type ManufacturerRescueGateStatusV1 = "PASS" | "FAIL" | "UNKNOWN" | "WAIVED";

export type ManufacturerRescueValidationGateV1 = {
  gate_id: string;
  status: ManufacturerRescueGateStatusV1;
  notes: string;
};

export type WrongFamilyAssessmentV1 = {
  blocked: boolean;
  forbidden_tokens_checked: string[];
  detected_forbidden_tokens: string[];
  notes: string;
};

export type PdpDiscoveryV1 = {
  filter_slug: string;
  oem_part_token: string;
  discovered_url: string;
  discovery_provenance: string;
  path_type: string;
  known_broken_destination: boolean;
};

export type BrowserPageCaptureResultV1 = {
  finalUrl: string;
  title: string;
  h1Text: string;
  textSample: string;
  purchaseActions: string[];
  classification: OemBrowserClassification;
  classificationNotes: string | null;
  captureSucceeded: boolean;
  gotoError: string;
  hardTimedOut: boolean;
  gotoFailed: boolean;
  screenshotRel: string | null;
};

export type ReadOnlyMutationFlagsV1 = {
  read_only: true;
  data_mutation: false;
  mutation_authorized: false;
  verified_link_authorized: false;
  csv_apply_authorized: false;
  supabase_mutation_authorized: false;
  evidence_write_authorized: false;
  netlify_api_authorized: false;
  production_go_click_authorized: false;
  coverage_unlocked: false;
};

export const READ_ONLY_MUTATION_FLAGS_V1: ReadOnlyMutationFlagsV1 = {
  read_only: true,
  data_mutation: false,
  mutation_authorized: false,
  verified_link_authorized: false,
  csv_apply_authorized: false,
  supabase_mutation_authorized: false,
  evidence_write_authorized: false,
  netlify_api_authorized: false,
  production_go_click_authorized: false,
  coverage_unlocked: false,
};

export type OwnerProofUrlRowV1 = {
  retailer?: string;
  url?: string;
  path_type?: string;
  browser_proof_status?: string;
};

export type OwnerProofResultFileV1 = {
  slug?: string;
  oem_part_token?: string;
  verdict?: string;
  owner_proof_urls?: OwnerProofUrlRowV1[];
};

export interface SearchPlaceholderStrategy {
  isSearchPlaceholderUrl(retailerKey: string | null | undefined, url: string): boolean;
}

export interface PdpDiscoveryStrategy {
  discoverPdpUrl(args: { filterSlug: string; oemPartToken: string }): PdpDiscoveryV1 | null;
  isOfficialPdpUrl(url: string): boolean;
  isDirectPdpFinalUrl(args: {
    filterSlug: string;
    oemPartToken: string;
    finalUrl: string;
    targetUrl?: string | null;
  }): boolean;
  isOfficialManufacturerPath(args: {
    finalUrl: string;
    title: string;
    h1Text: string;
    textSample: string;
  }): boolean;
}

export interface WrongFamilyStrategy {
  forbiddenTokensForSlug(filterSlug: string): readonly string[];
  assess(args: {
    filterSlug: string;
    oemPartToken: string;
    finalUrl?: string;
    title?: string;
    h1Text?: string;
    textSample?: string;
    candidateToken?: string | null;
  }): WrongFamilyAssessmentV1;
}

export type ValidationGateDerivationInputV1 = {
  filterSlug: string;
  oemPartToken: string;
  csvPrimaryIsSearchPlaceholder: boolean;
  discoveredPdpUrl: string | null;
  discoveredPdpKnownBroken?: boolean;
  finalUrl: string;
  title: string;
  h1Text: string;
  textSample: string;
  purchaseActions: string[];
  classification: OemBrowserClassification;
  wrongFamily: WrongFamilyAssessmentV1;
  captureCompleted?: boolean;
  targetUrl?: string | null;
};

export interface ValidationGateStrategy {
  deriveGates(input: ValidationGateDerivationInputV1): ManufacturerRescueValidationGateV1[];
  allGatesPass(gates: ManufacturerRescueValidationGateV1[]): boolean;
}

export type SupersessionAssessmentV1 = {
  required: boolean;
  notes: string | null;
};

export interface SupersessionPolicy {
  requiresReview(filterSlug: string): boolean;
  assess(args: {
    filterSlug: string;
    oemPartToken: string;
    title: string;
    h1Text: string;
    textSample: string;
  }): SupersessionAssessmentV1;
}

export type ExactTokenAssessmentModeV1 = "title_h1_word_boundary" | "identity_blob_includes";

export type OfficialProofSignalsInputV1 = {
  filterSlug: string;
  oemPartToken: string;
  targetUrl: string | null;
  finalUrl: string;
  title: string;
  h1Text: string;
  textSample: string;
  purchaseActions: string[];
  classification: OemBrowserClassification;
  captureSucceeded: boolean;
  wrongFamily: WrongFamilyAssessmentV1;
  supersession: SupersessionAssessmentV1;
  pdpDiscovery: PdpDiscoveryStrategy;
  exactTokenMode: ExactTokenAssessmentModeV1;
};

export type OfficialProofSignalsV1 = {
  browser_truth_status: "PASS" | "FAIL" | "UNKNOWN";
  direct_pdp_status: "PROVEN" | "NOT_PROVEN" | "UNKNOWN";
  exact_token_proven: boolean | "UNKNOWN";
  current_direct_buyability_proven: boolean | "UNKNOWN";
  official_manufacturer_path_proven: boolean | "UNKNOWN";
  official_pdp_proof_result: "PROVEN" | "INFERRED" | "UNKNOWN";
  blockers: string[];
  supersession_review_required: boolean;
  supersession_notes: string | null;
};

export interface BrowserCaptureStrategy {
  captureOemPage(args: {
    rootDir: string;
    targetUrl: string;
    screenshotRel?: string | null;
    writeScreenshot?: boolean;
    userAgent: string;
  }): Promise<BrowserPageCaptureResultV1>;
}

export interface DraftWriter<TReport> {
  allowedWriteRelPaths: readonly string[];
  jsonRelPath: string;
  mdRelPath: string;
  buildMarkdown(report: TReport): string;
  writeDrafts(args: { rootDir: string; report: TReport }): { json_rel_path: string; md_rel_path: string };
}

export interface OwnerApprovalPacketBuilder<TAdapterReport, TPacket> {
  buildPacket(args: { rootDir: string; adapterReport: TAdapterReport }): TPacket;
}

export interface ManufacturerRescueAdapter<TReport> {
  manufacturerKey: string;
  contract: string;
  buildReport(args: { rootDir: string; now?: () => Date }): TReport | Promise<TReport>;
}

export type ManufacturerRescueManufacturerConfigV1 = {
  manufacturer_key: string;
  search_placeholder: SearchPlaceholderStrategy;
  pdp_discovery: PdpDiscoveryStrategy;
  wrong_family: WrongFamilyStrategy;
  validation_gates: ValidationGateStrategy;
  supersession: SupersessionPolicy;
  exact_token_mode: ExactTokenAssessmentModeV1;
  browser_capture_user_agent: string;
};

export const DEFAULT_PLAYWRIGHT_CAPTURE_MS_V1 = {
  gotoMs: 48_000,
  settleMs: 2_000,
  hardMs: 75_000,
} as const;

export const PURCHASE_ACTION_RE_V1 =
  /add to cart|buy now|checkout|add to basket|add to bag|shop now|purchase|add to order/i;

export function normManufacturerToken(v: string | null | undefined): string {
  return (v ?? "").trim().toUpperCase();
}

export function isUrlOnHost(url: string, hostFragment: string): boolean {
  try {
    return new URL(url).hostname.toLowerCase().includes(hostFragment.toLowerCase());
  } catch {
    return url.toLowerCase().includes(hostFragment.toLowerCase());
  }
}

export function makeManufacturerGate(
  gate_id: string,
  pass: boolean,
  notes: string,
  captureCompleted: boolean | undefined,
  waived = false,
): ManufacturerRescueValidationGateV1 {
  return {
    gate_id,
    status: waived ? "WAIVED" : pass ? "PASS" : captureCompleted === false ? "UNKNOWN" : "FAIL",
    notes,
  };
}

export function allManufacturerGatesPass(gates: ManufacturerRescueValidationGateV1[]): boolean {
  return gates.every((g) => g.status === "PASS" || g.status === "WAIVED");
}

export function assessExactTokenInTitleOrH1WordBoundary(args: {
  oemPartToken: string;
  title: string;
  h1Text: string;
}): boolean {
  const token = normManufacturerToken(args.oemPartToken);
  if (!token) return false;
  const title = args.title.toUpperCase();
  const h1 = args.h1Text.toUpperCase();
  const re = new RegExp(`\\b${token.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\b`);
  return re.test(title) || re.test(h1);
}

export function assessExactTokenInIdentityBlobIncludes(args: {
  oemPartToken: string;
  title: string;
  h1Text: string;
  textSample: string;
}): boolean {
  const token = normManufacturerToken(args.oemPartToken);
  if (!token) return false;
  const blob = `${args.title}\n${args.h1Text}\n${args.textSample}`.toUpperCase();
  return blob.includes(token);
}

export function assessExactToken(args: {
  mode: ExactTokenAssessmentModeV1;
  oemPartToken: string;
  title: string;
  h1Text: string;
  textSample: string;
}): boolean {
  if (args.mode === "title_h1_word_boundary") {
    return assessExactTokenInTitleOrH1WordBoundary(args);
  }
  return assessExactTokenInIdentityBlobIncludes(args);
}

export function assessForbiddenTokensWrongFamily(args: {
  filterSlug: string;
  oemPartToken: string;
  forbiddenBySlug: Readonly<Record<string, readonly string[]>>;
  finalUrl?: string;
  title?: string;
  h1Text?: string;
  textSample?: string;
  candidateToken?: string | null;
  slugHook?: (input: {
    filterSlug: string;
    oemPartToken: string;
    finalUrl: string;
    title: string;
    h1Text: string;
    textSample: string;
  }) => WrongFamilyAssessmentV1 | null;
}): WrongFamilyAssessmentV1 {
  const slug = args.filterSlug.trim().toLowerCase();
  const slugToken = normManufacturerToken(args.oemPartToken);
  const forbidden = [...(args.forbiddenBySlug[slug] ?? [])];
  const blob = `${args.title ?? ""}\n${args.h1Text ?? ""}\n${args.textSample ?? ""}`.toUpperCase();
  const url = (args.finalUrl ?? "").toUpperCase();
  const candidateToken = normManufacturerToken(args.candidateToken);

  if (args.slugHook) {
    const hook = args.slugHook({
      filterSlug: slug,
      oemPartToken: slugToken,
      finalUrl: args.finalUrl ?? "",
      title: args.title ?? "",
      h1Text: args.h1Text ?? "",
      textSample: args.textSample ?? "",
    });
    if (hook) return hook;
  }

  const detected: string[] = [];
  for (const tok of forbidden) {
    if (candidateToken === tok) detected.push(tok);
    if (url.includes(`/SPEC/${tok}`) || url.includes(`/SPEC/${tok}/`)) detected.push(tok);
    const inIdentity = new RegExp(`\\b${tok}\\b`).test(blob);
    const slugInIdentity = slugToken ? new RegExp(`\\b${slugToken}\\b`).test(blob) : false;
    if (inIdentity && !slugInIdentity && !detected.includes(tok)) detected.push(tok);
  }

  const unique = [...new Set(detected)];
  return {
    blocked: unique.length > 0,
    forbidden_tokens_checked: forbidden,
    detected_forbidden_tokens: unique,
    notes:
      unique.length > 0
        ? `wrong-family token(s) detected for slug ${slug}: ${unique.join(", ")}`
        : "no forbidden wrong-family tokens detected",
  };
}

export function deriveEverydropStyleOfficialProofSignals(
  input: OfficialProofSignalsInputV1,
): OfficialProofSignalsV1 {
  const token = normManufacturerToken(input.oemPartToken);
  const identityBlob = `${input.title}\n${input.h1Text}\n${input.textSample}`.toUpperCase();
  const tokenInIdentity = identityBlob.includes(token);
  const directPdp =
    Boolean(input.targetUrl && input.pdpDiscovery.isOfficialPdpUrl(input.finalUrl)) &&
    input.pdpDiscovery.isDirectPdpFinalUrl({
      filterSlug: input.filterSlug,
      oemPartToken: token,
      finalUrl: input.finalUrl,
      targetUrl: input.targetUrl,
    });
  const officialPath = input.pdpDiscovery.isOfficialManufacturerPath({
    finalUrl: input.finalUrl,
    title: input.title,
    h1Text: input.h1Text,
    textSample: input.textSample,
  });
  const purchaseVisible = input.purchaseActions.length > 0;
  const notSearch = input.classification !== "likely_search_results";
  const notBlocked =
    input.classification !== "likely_blocked" && input.classification !== "browser_error";
  const not404 = input.classification !== "likely_not_found";

  const blockers: string[] = [];
  if (!input.captureSucceeded) blockers.push("browser_capture_not_completed");
  if (!input.targetUrl) blockers.push("repo_proven_official_target_url_missing");
  if (!directPdp) blockers.push("final_url_not_official_whirlpool_accessory_pdp");
  if (!tokenInIdentity) blockers.push(`exact_token_${token}_not_proven_in_primary_slice`);
  if (!officialPath) blockers.push("official_whirlpool_manufacturer_path_not_proven");
  if (!purchaseVisible) blockers.push("direct_purchase_control_not_visible");
  if (!notSearch) blockers.push("page_classified_as_search_or_catalog");
  if (!notBlocked) blockers.push(`browser_classification_${input.classification}`);
  if (!not404) blockers.push("page_not_found_or_unavailable");
  if (input.supersession.required && input.filterSlug === "w10413645a") {
    blockers.push(`supersession_review:${input.supersession.notes ?? "required"}`);
  }

  const pass =
    input.captureSucceeded &&
    Boolean(input.targetUrl) &&
    directPdp &&
    tokenInIdentity &&
    officialPath &&
    purchaseVisible &&
    notSearch &&
    notBlocked &&
    not404 &&
    input.classification === "direct_buyable" &&
    !(input.supersession.required && input.filterSlug === "w10413645a" && !tokenInIdentity);

  let officialProof: "PROVEN" | "INFERRED" | "UNKNOWN" = "UNKNOWN";
  if (pass) officialProof = "PROVEN";
  else if (input.captureSucceeded && directPdp && tokenInIdentity) officialProof = "INFERRED";

  return {
    browser_truth_status: pass ? "PASS" : input.captureSucceeded ? "FAIL" : "UNKNOWN",
    direct_pdp_status: directPdp ? "PROVEN" : input.captureSucceeded ? "NOT_PROVEN" : "UNKNOWN",
    exact_token_proven: input.captureSucceeded ? tokenInIdentity : "UNKNOWN",
    current_direct_buyability_proven:
      input.captureSucceeded && purchaseVisible && input.classification === "direct_buyable"
        ? true
        : input.captureSucceeded
          ? false
          : "UNKNOWN",
    official_manufacturer_path_proven: input.captureSucceeded ? officialPath : "UNKNOWN",
    official_pdp_proof_result: officialProof,
    blockers,
    supersession_review_required: input.supersession.required,
    supersession_notes: input.supersession.notes,
  };
}

export function loadRepoProvenOfficialTargetFromOwnerProof(args: {
  rootDir: string;
  slug: string;
  ownerProofRelBySlug: Partial<Record<string, string>>;
  isOfficialPdpUrl: (url: string) => boolean;
  requiredPathType?: string;
  requiredProofStatus?: string;
}): {
  url: string | null;
  source: "owner_browser_proof_result" | "committed_browser_evidence" | null;
} {
  const rel = args.ownerProofRelBySlug[args.slug.trim().toLowerCase()];
  if (!rel) return { url: null, source: null };
  const abs = path.join(args.rootDir, rel);
  if (!existsSync(abs)) return { url: null, source: null };
  try {
    const parsed = JSON.parse(readFileSync(abs, "utf8")) as OwnerProofResultFileV1;
    if (parsed.verdict !== "PASS_BROWSER_PROOF") return { url: null, source: null };
    for (const row of parsed.owner_proof_urls ?? []) {
      const url = (row.url ?? "").trim();
      if (!url || !args.isOfficialPdpUrl(url)) continue;
      if (args.requiredPathType && row.path_type !== args.requiredPathType) continue;
      if (args.requiredProofStatus && (row.browser_proof_status ?? "").trim() !== args.requiredProofStatus) {
        continue;
      }
      return { url, source: "owner_browser_proof_result" };
    }
  } catch {
    return { url: null, source: null };
  }
  return { url: null, source: null };
}

export const defaultBrowserCaptureStrategyV1: BrowserCaptureStrategy = {
  async captureOemPage(args) {
    const screenshotRel = args.screenshotRel ?? null;
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
          userAgent: args.userAgent,
          viewport: { width: 1280, height: 720 },
        });
        const page = await context.newPage();

        const navigate = async () => {
          try {
            await page.goto(args.targetUrl, {
              waitUntil: "domcontentloaded",
              timeout: DEFAULT_PLAYWRIGHT_CAPTURE_MS_V1.gotoMs,
            });
            await delay(DEFAULT_PLAYWRIGHT_CAPTURE_MS_V1.settleMs);
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
            }, DEFAULT_PLAYWRIGHT_CAPTURE_MS_V1.hardMs);
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
          if (!text || !PURCHASE_ACTION_RE_V1.test(text) || seen.has(text)) continue;
          seen.add(text);
          purchaseActions.push(text);
          if (purchaseActions.length >= 6) break;
        }

        if (args.writeScreenshot !== false && screenshotRel) {
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
      captureSucceeded = false;
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

    return {
      finalUrl,
      title,
      h1Text,
      textSample,
      purchaseActions,
      classification,
      classificationNotes: notes,
      captureSucceeded,
      gotoError: gotoErr,
      hardTimedOut,
      gotoFailed,
      screenshotRel: args.writeScreenshot !== false ? screenshotRel : null,
    };
  },
};

export function createJsonMdDraftWriter<TReport>(args: {
  jsonRelPath: string;
  mdRelPath: string;
  buildMarkdown: (report: TReport) => string;
  extraAllowedPaths?: readonly string[];
}): DraftWriter<TReport> {
  const allowed = [
    args.jsonRelPath,
    args.mdRelPath,
    ...(args.extraAllowedPaths ?? []),
  ] as readonly string[];
  return {
    allowedWriteRelPaths: allowed,
    jsonRelPath: args.jsonRelPath,
    mdRelPath: args.mdRelPath,
    buildMarkdown: args.buildMarkdown,
    writeDrafts({ rootDir, report }) {
      const jsonAbs = path.join(rootDir, args.jsonRelPath);
      const mdAbs = path.join(rootDir, args.mdRelPath);
      mkdirSync(path.dirname(jsonAbs), { recursive: true });
      mkdirSync(path.dirname(mdAbs), { recursive: true });
      writeFileSync(jsonAbs, `${JSON.stringify(report, null, 2)}\n`, "utf8");
      writeFileSync(mdAbs, args.buildMarkdown(report), "utf8");
      return { json_rel_path: args.jsonRelPath, md_rel_path: args.mdRelPath };
    },
  };
}

export function gatesToBlockerIds(gates: ManufacturerRescueValidationGateV1[]): string[] {
  return gates.filter((g) => g.status === "FAIL").map((g) => g.gate_id);
}
