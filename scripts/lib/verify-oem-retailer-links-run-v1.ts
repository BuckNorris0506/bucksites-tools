/**
 * Browser-truth OEM retailer link verifier — run orchestration with truth-ledger on --write-db.
 */
import fs from "node:fs";
import path from "node:path";
import { setTimeout as delay } from "node:timers/promises";
import { chromium, type Browser } from "playwright";

import type { BuckpartsIoCapabilityV1 } from "./buckparts-io-capabilities-v1";
import { readCsvFile } from "./csv";
import { getSupabaseAdmin } from "./supabase-admin";
import { loadEnv } from "./load-env";
import type { FounderDecisionRowWithSlugCorrelationV1 } from "./founder-decision-slug-correlation-v1";
import { oemVerifyCsvRelPathsV1 } from "./oem-verify-csv-paths-v1";
import {
  buildVerifyOemRetailerLinksMutationPreflightV1,
  VERIFY_OEM_RETAILER_LINKS_MUTATION_GATE_REF_V1,
  VERIFY_OEM_RETAILER_LINKS_MUTATION_LANE_V1,
  verifyOemRetailerLinksMutationAuthorizedV1,
  type VerifyOemRetailerLinksMutationPreflightV1,
} from "./verify-oem-retailer-links-mutation-gate-v1";
import {
  recordTruthLedgerMutationOutcomeV1,
  type TruthLedgerMutationApplyOutcomeV1,
} from "./truth-ledger-v1";

/** Inventory/static-audit marker — run module satisfies mutationGateRef checks. */
const mutationGateRef = VERIFY_OEM_RETAILER_LINKS_MUTATION_GATE_REF_V1;
void mutationGateRef;

const TRUTH_LEDGER_IO_ON_WRITE_INTENT_V1 = "MUTATION" as const;

export type VerifyOemRetailerLinksApplyStatusV1 = "BLOCKED" | "APPLIED";

export type VerifyOemRetailerLinksRunReportV1 = {
  jobs_count: number;
  write_db_requested: boolean;
  out_csv_path: string;
  apply_status?: VerifyOemRetailerLinksApplyStatusV1;
  mutation_authorized?: boolean;
  mutation_preflight_blockers?: string[];
  founder_decision_id?: string | null;
  persist_counts?: { updated: number; missing: number };
};

export type VerifyOemRetailerLinksRunResultV1 = {
  report: VerifyOemRetailerLinksRunReportV1;
  exit_code: 0 | 1;
};

function dataCsvAbs(rootDir: string, rel: string): string {
  return path.join(rootDir, rel);
}

const FRIDGE_CSV_REL = "data/retailer_links.csv";
const AIR_CSV_REL = "data/air-purifier/retailer_links.csv";
const VACUUM_CSV_REL = "data/vacuum/retailer_links.csv";
const HUMIDIFIER_CSV_REL = "data/humidifier/retailer_links.csv";
const APPLIANCE_AIR_CSV_REL = "data/appliance-air/retailer_links.csv";
const WHOLE_HOUSE_WATER_CSV_REL = "data/whole-house-water/retailer_links.csv";

type Classification =
  | "direct_buyable"
  | "likely_valid"
  | "likely_not_found"
  | "likely_search_results"
  | "likely_blocked"
  | "timeout"
  | "browser_error";

type Job = {
  source_file: string;
  filter_slug: string;
  retailer_key: string;
  retailer_name: string;
  original_url: string;
};

type PersistTarget =
  | { table: "retailer_links"; id: string }
  | { table: "air_purifier_retailer_links"; id: string }
  | { table: "vacuum_retailer_links"; id: string }
  | { table: "humidifier_retailer_links"; id: string }
  | { table: "appliance_air_retailer_links"; id: string }
  | { table: "whole_house_water_retailer_links"; id: string };

type PersistResult = "updated" | "missing";

const GOTO_MS = 48_000;
const SETTLE_MS = 2_000;
const PER_ROW_HARD_MS = 75_000;

export function parseVerifyOemRetailerLinksArgsV1(argv: string[]) {
  let limit: number | null = null;
  let fridgeOnly = false;
  let airOnly = false;
  let vacuumOnly = false;
  let humidifierOnly = false;
  let applianceAirOnly = false;
  let wholeHouseWaterOnly = false;
  let startIndex = 0;
  let resumeFromSlug: string | null = null;
  let csvPath: string | null = null;
  let outCsvPath: string | null = null;
  let writeDb = false;
  let screenshotDir: string | null = null;
  let debugBuySignals = false;
  const slugFilter = new Set<string>();

  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === "--limit" && argv[i + 1]) {
      limit = Math.max(1, parseInt(argv[i + 1], 10));
      i++;
    } else if (argv[i] === "--fridge-only") fridgeOnly = true;
    else if (argv[i] === "--air-only") airOnly = true;
    else if (argv[i] === "--vacuum-only") vacuumOnly = true;
    else if (argv[i] === "--humidifier-only") humidifierOnly = true;
    else if (argv[i] === "--appliance-air-only") applianceAirOnly = true;
    else if (argv[i] === "--whole-house-water-only") wholeHouseWaterOnly = true;
    else if (argv[i] === "--slug" && argv[i + 1]) {
      for (const s of argv[i + 1].split(",")) {
        const t = s.trim().toLowerCase();
        if (t) slugFilter.add(t);
      }
      i++;
    } else if (argv[i] === "--start-index" && argv[i + 1]) {
      startIndex = Math.max(0, parseInt(argv[i + 1], 10));
      i++;
    } else if (argv[i] === "--resume-from" && argv[i + 1]) {
      resumeFromSlug = argv[i + 1].trim().toLowerCase();
      i++;
    } else if (argv[i] === "--csv" && argv[i + 1]) {
      csvPath = argv[i + 1].trim();
      i++;
    } else if (argv[i] === "--out-csv" && argv[i + 1]) {
      outCsvPath = argv[i + 1].trim();
      i++;
    } else if (argv[i] === "--screenshot-dir" && argv[i + 1]) {
      screenshotDir = argv[i + 1].trim();
      i++;
    } else if (argv[i] === "--write-db") {
      writeDb = true;
    } else if (argv[i] === "--debug-buy-signals") {
      debugBuySignals = true;
    }
  }

  const wedgeOnlyFlags = [
    fridgeOnly,
    airOnly,
    vacuumOnly,
    humidifierOnly,
    applianceAirOnly,
    wholeHouseWaterOnly,
  ].filter(Boolean).length;

  if (wedgeOnlyFlags > 1) {
    throw new Error("Use only one --*-only wedge flag at a time");
  }
  if (
    csvPath &&
    (fridgeOnly ||
      airOnly ||
      vacuumOnly ||
      humidifierOnly ||
      applianceAirOnly ||
      wholeHouseWaterOnly)
  ) {
    throw new Error("With --csv, do not combine wedge-only flags");
  }

  return {
    limit,
    fridgeOnly,
    airOnly,
    vacuumOnly,
    humidifierOnly,
    applianceAirOnly,
    wholeHouseWaterOnly,
    slugFilter,
    startIndex,
    resumeFromSlug,
    csvPath,
    outCsvPath,
    writeDb,
    screenshotDir,
    debugBuySignals,
  };
}

function isOemRetailerKey(key: string): boolean {
  return key.trim().toLowerCase().startsWith("oem");
}

function pickUrl(row: Record<string, string>): string {
  const d = (row.destination_url ?? "").trim();
  const a = (row.affiliate_url ?? "").trim();
  return d || a;
}

function pushJobsFromCsv(
  jobs: Job[],
  csvAbs: string,
  sourceLabel: string,
  slugFilter: Set<string>,
  useDestinationFallback: boolean,
): void {
  const requiredColumns = [
    "filter_slug",
    "retailer_name",
    "affiliate_url",
    "retailer_key",
  ];
  if (useDestinationFallback) requiredColumns.push("destination_url");
  const rows = readCsvFile(csvAbs, requiredColumns);
  const slugOk = (slug: string) =>
    slugFilter.size === 0 || slugFilter.has(slug.trim().toLowerCase());

  for (const row of rows) {
    const retailer_key = (row.retailer_key ?? "").trim();
    if (!isOemRetailerKey(retailer_key)) continue;
    const url = useDestinationFallback ? pickUrl(row) : (row.affiliate_url ?? "").trim();
    if (!url.startsWith("http")) continue;
    const fs = (row.filter_slug ?? "").trim();
    if (!slugOk(fs)) continue;
    jobs.push({
      source_file: sourceLabel,
      filter_slug: fs,
      retailer_key,
      retailer_name: (row.retailer_name ?? "").trim(),
      original_url: url,
    });
  }
}

function loadJobs(
  rootDir: string,
  flags: ReturnType<typeof parseVerifyOemRetailerLinksArgsV1>,
): Job[] {
  const jobs: Job[] = [];

  if (
    !flags.airOnly &&
    !flags.vacuumOnly &&
    !flags.humidifierOnly &&
    !flags.applianceAirOnly &&
    !flags.wholeHouseWaterOnly
  ) {
    pushJobsFromCsv(
      jobs,
      dataCsvAbs(rootDir, FRIDGE_CSV_REL),
      FRIDGE_CSV_REL,
      flags.slugFilter,
      false,
    );
  }

  if (
    !flags.fridgeOnly &&
    !flags.vacuumOnly &&
    !flags.humidifierOnly &&
    !flags.applianceAirOnly &&
    !flags.wholeHouseWaterOnly
  ) {
    pushJobsFromCsv(
      jobs,
      dataCsvAbs(rootDir, AIR_CSV_REL),
      AIR_CSV_REL,
      flags.slugFilter,
      true,
    );
  }

  if (
    !flags.fridgeOnly &&
    !flags.airOnly &&
    !flags.humidifierOnly &&
    !flags.applianceAirOnly &&
    !flags.wholeHouseWaterOnly
  ) {
    pushJobsFromCsv(
      jobs,
      dataCsvAbs(rootDir, VACUUM_CSV_REL),
      VACUUM_CSV_REL,
      flags.slugFilter,
      true,
    );
  }

  if (
    !flags.fridgeOnly &&
    !flags.airOnly &&
    !flags.vacuumOnly &&
    !flags.applianceAirOnly &&
    !flags.wholeHouseWaterOnly
  ) {
    pushJobsFromCsv(
      jobs,
      dataCsvAbs(rootDir, HUMIDIFIER_CSV_REL),
      HUMIDIFIER_CSV_REL,
      flags.slugFilter,
      true,
    );
  }

  if (
    !flags.fridgeOnly &&
    !flags.airOnly &&
    !flags.vacuumOnly &&
    !flags.humidifierOnly &&
    !flags.wholeHouseWaterOnly
  ) {
    pushJobsFromCsv(
      jobs,
      dataCsvAbs(rootDir, APPLIANCE_AIR_CSV_REL),
      APPLIANCE_AIR_CSV_REL,
      flags.slugFilter,
      true,
    );
  }

  if (
    !flags.fridgeOnly &&
    !flags.airOnly &&
    !flags.vacuumOnly &&
    !flags.humidifierOnly &&
    !flags.applianceAirOnly
  ) {
    pushJobsFromCsv(
      jobs,
      dataCsvAbs(rootDir, WHOLE_HOUSE_WATER_CSV_REL),
      WHOLE_HOUSE_WATER_CSV_REL,
      flags.slugFilter,
      true,
    );
  }

  return jobs;
}

function loadJobsFromSuppliedCsv(
  csvAbs: string,
  slugFilter: Set<string>,
): Job[] {
  const rows = readCsvFile(csvAbs, [
    "filter_slug",
    "retailer_name",
    "affiliate_url",
    "retailer_key",
  ]);
  const jobs: Job[] = [];
  const slugOk = (slug: string) =>
    slugFilter.size === 0 || slugFilter.has(slug.trim().toLowerCase());
  const sourceLabel = path.basename(csvAbs);

  for (const row of rows) {
    const retailer_key = (row.retailer_key ?? "").trim();
    const url = (row.affiliate_url ?? "").trim();
    if (!url.startsWith("http")) continue;
    const fs = (row.filter_slug ?? "").trim();
    if (!slugOk(fs)) continue;
    jobs.push({
      source_file: sourceLabel,
      filter_slug: fs,
      retailer_key,
      retailer_name: (row.retailer_name ?? "").trim(),
      original_url: url,
    });
  }
  return jobs;
}

function applyResumeAndStart(
  jobs: Job[],
  resumeFromSlug: string | null,
  startIndex: number,
): Job[] {
  let out = jobs;
  if (resumeFromSlug) {
    const idx = out.findIndex((j) => j.filter_slug.trim().toLowerCase() === resumeFromSlug);
    if (idx === -1) {
      console.warn(`--resume-from "${resumeFromSlug}": no matching row; nothing to run.`);
      return [];
    }
    out = out.slice(idx);
  }
  if (startIndex > 0) out = out.slice(startIndex);
  return out;
}

function escapeCsvCell(s: string): string {
  if (/[",\r\n]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

function isChromeErrorUrl(url: string): boolean {
  const u = url.trim().toLowerCase();
  return u.startsWith("chrome-error:") || u.includes("chromewebdata");
}

function classify(args: {
  finalUrl: string;
  title: string;
  textSample: string;
  purchaseActions: string[];
  hardTimeout: boolean;
  gotoFailed: boolean;
  errorNote: string;
}): { classification: Classification; notes: string } {
  const fu = args.finalUrl.trim();

  if (isChromeErrorUrl(fu)) {
    return {
      classification: "browser_error",
      notes: args.errorNote || "Chrome error / interstitial URL",
    };
  }

  if (args.hardTimeout) {
    return {
      classification: "timeout",
      notes: args.errorNote || `per-row hard timeout (${PER_ROW_HARD_MS}ms)`,
    };
  }

  if (args.gotoFailed) {
    const looksHttp = /^https?:\/\//i.test(fu);
    if (!looksHttp || fu === "about:blank") {
      return {
        classification: "browser_error",
        notes: args.errorNote || "navigation failed; no http(s) document URL",
      };
    }
    return {
      classification: "timeout",
      notes: args.errorNote || "navigation error (partial URL may be misleading)",
    };
  }

  const u = args.finalUrl.toLowerCase();
  const blob = `${args.title}\n${args.textSample}`.toLowerCase();

  const blocked = [
    "access denied",
    "forbidden",
    "403 forbidden",
    "unusual traffic",
    "verify you are human",
    "attention required",
    "just a moment",
    "cloudflare",
    "captcha",
    "robot check",
    "automated access",
    "request blocked",
  ];
  if (blocked.some((p) => blob.includes(p))) {
    return { classification: "likely_blocked", notes: "matched block/challenge heuristic" };
  }

  const notFound = [
    "page not found",
    "404 error",
    " 404 ",
    "not found",
    "no results found",
    "couldn't find",
    "could not find",
    "we couldn't locate",
    "we could not locate",
    "product you are looking for",
    "does not exist",
    "doesn't exist",
    "no longer available",
    "sorry, we couldn't",
    "item not found",
    "zero results",
    "nothing matches",
    "no match",
    "unable to find",
    "can't find that",
  ];
  if (notFound.some((p) => blob.includes(p))) {
    return { classification: "likely_not_found", notes: "matched not-found phrase heuristic" };
  }

  const searchUrl =
    /[?&]q=|[?&]searchterm=|\/search\?|catalogsearch\/result|\/Search\?/i.test(u);
  const searchText = [
    "search results",
    "results for",
    "your search",
    "refine your search",
    "products found",
    "narrow your search",
  ];
  if (searchUrl || searchText.some((p) => blob.includes(p))) {
    return {
      classification: "likely_search_results",
      notes: searchUrl ? "URL pattern suggests search/catalog listing" : "text suggests search results",
    };
  }

  if (args.purchaseActions.length > 0) {
    return {
      classification: "direct_buyable",
      notes: `visible purchase action: ${args.purchaseActions.slice(0, 3).join(" | ")}`,
    };
  }

  return {
    classification: "likely_valid",
    notes: "no strong negative/search/block signals, but no visible purchase action proven",
  };
}

function appendCsvRow(outPath: string, line: string) {
  fs.appendFileSync(outPath, line + "\n", "utf8");
}

async function resolvePersistTarget(job: Job): Promise<PersistTarget | null> {
  const supabase = getSupabaseAdmin();
  const verticalConfigs = [
    {
      source: "data/retailer_links.csv",
      table: "retailer_links" as const,
      join: "filters!inner ( slug )",
      slugPath: "filters",
      usesDestinationFallback: false,
    },
    {
      source: "data/air-purifier/retailer_links.csv",
      table: "air_purifier_retailer_links" as const,
      join: "air_purifier_filters!inner ( slug )",
      slugPath: "air_purifier_filters",
      usesDestinationFallback: true,
    },
    {
      source: "data/vacuum/retailer_links.csv",
      table: "vacuum_retailer_links" as const,
      join: "vacuum_filters!inner ( slug )",
      slugPath: "vacuum_filters",
      usesDestinationFallback: true,
    },
    {
      source: "data/humidifier/retailer_links.csv",
      table: "humidifier_retailer_links" as const,
      join: "humidifier_filters!inner ( slug )",
      slugPath: "humidifier_filters",
      usesDestinationFallback: true,
    },
    {
      source: "data/appliance-air/retailer_links.csv",
      table: "appliance_air_retailer_links" as const,
      join: "appliance_air_parts!inner ( slug )",
      slugPath: "appliance_air_parts",
      usesDestinationFallback: true,
    },
    {
      source: "data/whole-house-water/retailer_links.csv",
      table: "whole_house_water_retailer_links" as const,
      join: "whole_house_water_parts!inner ( slug )",
      slugPath: "whole_house_water_parts",
      usesDestinationFallback: true,
    },
  ] as const;

  const candidateConfigs = verticalConfigs.filter(
    (cfg) => cfg.source === job.source_file,
  );
  const configsToCheck =
    candidateConfigs.length > 0 ? candidateConfigs : verticalConfigs;

  for (const cfg of configsToCheck) {
    const { data, error } = await supabase
      .from(cfg.table)
      .select(`id, affiliate_url, destination_url, retailer_key, ${cfg.join}`)
      .eq("retailer_key", job.retailer_key);
    if (error) throw error;

    const matches = ((data ?? []) as Array<any>).filter((r) => {
      const slug = (r[cfg.slugPath]?.slug ?? "").trim();
      const aff = (r.affiliate_url ?? "").trim();
      const dest = (r.destination_url ?? "").trim();
      const urlMatches = cfg.usesDestinationFallback
        ? aff === job.original_url || dest === job.original_url
        : aff === job.original_url;
      return slug === job.filter_slug && urlMatches;
    });

    if (matches.length === 1) {
      return { table: cfg.table, id: matches[0].id };
    }
  }

  return null;
}

async function persistBrowserTruth(
  job: Job,
  classification: Classification,
  notes: string,
  auditedAt: string,
): Promise<PersistResult> {
  const target = await resolvePersistTarget(job);
  if (!target) return "missing";

  const supabase = getSupabaseAdmin();
  const { error } = await supabase
    .from(target.table)
    .update({
      browser_truth_classification: classification,
      browser_truth_notes: notes,
      browser_truth_checked_at: auditedAt,
    })
    .eq("id", target.id);

  if (error) throw error;
  return "updated";
}

async function verifyOneJob(
  browser: Browser,
  job: Job,
  auditedAt: string,
  options: { screenshotDir: string | null; debugBuySignals: boolean },
): Promise<{ classification: Classification; notes: string; line: string }> {
  let finalUrl = "";
  let title = "";
  let textSample = "";
  let purchaseActions: string[] = [];
  let visibleControlTexts: string[] = [];
  let gotoErr = "";
  let hardTimedOut = false;
  let gotoFailed = false;

  const context = await browser.newContext({
    userAgent: "BuckPartsOEMBrowserTruth/1.0 (+https://buckparts.com; read-only verification)",
    viewport: { width: 1280, height: 720 },
  });

  const page = await context.newPage();
  const PURCHASE_RE =
    /add to cart|buy now|checkout|add to basket|add to bag|shop now|purchase/i;

  const navigate = async () => {
    try {
      await page.goto(job.original_url, {
        waitUntil: "domcontentloaded",
        timeout: GOTO_MS,
      });
      await delay(SETTLE_MS);
    } catch (e) {
      gotoFailed = true;
      gotoErr = e instanceof Error ? e.message : String(e);
    }
  };

  let hardTimerId: ReturnType<typeof setTimeout> | undefined;
  const hardRace = new Promise<void>((resolve) => {
    hardTimerId = setTimeout(() => {
      hardTimedOut = true;
      resolve();
    }, PER_ROW_HARD_MS);
  });

  try {
    await Promise.race([
      navigate().finally(() => {
        if (hardTimerId !== undefined) clearTimeout(hardTimerId);
      }),
      hardRace,
    ]);
  } finally {
    if (hardTimerId !== undefined) clearTimeout(hardTimerId);
    try {
      finalUrl = page.url();
      title = (await page.title().catch(() => "")) ?? "";
      const bodyText = await page.evaluate(() => document.body?.innerText ?? "").catch(() => "");
      textSample = (bodyText ?? "").slice(0, 14_000);
      const controlProbe = await (async () => {
        const seen = new Set<string>();
        const out: string[] = [];
        const debugOut: string[] = [];
        const candidates = page.locator(
          'button, [role="button"], a, input[type="submit"], input[type="button"]',
        );
        const count = Math.min(await candidates.count().catch(() => 0), 250);

        for (let i = 0; i < count; i++) {
          const candidate = candidates.nth(i);
          if (!(await candidate.isVisible().catch(() => false))) continue;
          const text = (
            [
              await candidate.textContent().catch(() => ""),
              await candidate.getAttribute("aria-label").catch(() => ""),
              await candidate.getAttribute("title").catch(() => ""),
              await candidate.inputValue().catch(() => ""),
            ]
              .filter(Boolean)
              .join(" ")
              .replace(/\s+/g, " ")
              .trim()
          );
          if (!text) continue;
          if (debugOut.length < 20 && !seen.has(`debug:${text}`)) {
            seen.add(`debug:${text}`);
            debugOut.push(text);
          }
          if (!PURCHASE_RE.test(text)) continue;
          if (seen.has(`buy:${text}`)) continue;
          seen.add(`buy:${text}`);
          out.push(text);
          if (out.length >= 5 && debugOut.length >= 20) break;
        }

        return { purchaseActions: out, visibleControlTexts: debugOut };
      })().catch(() => ({ purchaseActions: [], visibleControlTexts: [] }));
      purchaseActions = controlProbe.purchaseActions;
      visibleControlTexts = controlProbe.visibleControlTexts;
      if (options.screenshotDir) {
        const screenshotAbs = path.isAbsolute(options.screenshotDir)
          ? options.screenshotDir
          : path.join(process.cwd(), options.screenshotDir);
        fs.mkdirSync(screenshotAbs, { recursive: true });
        await page
          .screenshot({
            path: path.join(screenshotAbs, `${job.filter_slug}.png`),
            fullPage: true,
          })
          .catch(() => {});
      }
    } catch {}
    await context.close().catch(() => {});
  }

  const errOneLine = gotoErr.replace(/\s+/g, " ").trim().slice(0, 500);
  const errForClassify = hardTimedOut
    ? (gotoErr || `per-row hard timeout ${PER_ROW_HARD_MS}ms`).replace(/\s+/g, " ").trim().slice(0, 500)
    : errOneLine;

  const { classification, notes } = classify({
    finalUrl,
    title,
    textSample,
    purchaseActions,
    hardTimeout: hardTimedOut,
    gotoFailed,
    errorNote: errForClassify,
  });

  const line = [
    escapeCsvCell(auditedAt),
    escapeCsvCell(job.source_file),
    escapeCsvCell(job.filter_slug),
    escapeCsvCell(job.retailer_key),
    escapeCsvCell(job.retailer_name),
    escapeCsvCell(job.original_url),
    escapeCsvCell(finalUrl),
    escapeCsvCell(title),
    escapeCsvCell(classification),
    escapeCsvCell(notes),
  ].join(",");

  if (options.debugBuySignals) {
    const preview = visibleControlTexts.slice(0, 12).join(" | ") || "(none)";
    console.log(
      `[buy-debug] slug=${job.filter_slug} classification=${classification} finalUrl=${finalUrl || "(none)"}`,
    );
    console.log(`[buy-debug] slug=${job.filter_slug} visibleControls=${preview}`);
  }

  return { classification, notes, line };
}

export async function runVerifyOemRetailerLinksV1(args: {
  rootDir: string;
  argv?: string[];
  io_capability?: BuckpartsIoCapabilityV1;
  now?: () => Date;
  readText?: (abs: string) => string;
  founderRows?: readonly FounderDecisionRowWithSlugCorrelationV1[];
  fileExists?: (abs: string) => boolean;
  recordTruthLedger?: typeof recordTruthLedgerMutationOutcomeV1;
  launchBrowser?: typeof chromium.launch;
}): Promise<VerifyOemRetailerLinksRunResultV1> {
  loadEnv();
  const rootDir = args.rootDir;
  const parsed = parseVerifyOemRetailerLinksArgsV1(args.argv ?? []);

  let jobs: Job[];
  if (parsed.csvPath) {
    const csvAbs = path.isAbsolute(parsed.csvPath)
      ? parsed.csvPath
      : path.join(rootDir, parsed.csvPath);
    if (!fs.existsSync(csvAbs)) {
      throw new Error(`--csv file not found: ${csvAbs}`);
    }
    jobs = loadJobsFromSuppliedCsv(csvAbs, parsed.slugFilter);
  } else {
    jobs = loadJobs(rootDir, parsed);
  }

  jobs = applyResumeAndStart(jobs, parsed.resumeFromSlug, parsed.startIndex);
  if (parsed.limit != null) jobs = jobs.slice(0, parsed.limit);

  if (jobs.length === 0) {
    throw new Error("No rows to verify (check filters, --resume-from, --start-index).");
  }

  const csvRelPaths = oemVerifyCsvRelPathsV1({
    rootDir,
    flags: {
      fridgeOnly: parsed.fridgeOnly,
      airOnly: parsed.airOnly,
      vacuumOnly: parsed.vacuumOnly,
      humidifierOnly: parsed.humidifierOnly,
      applianceAirOnly: parsed.applianceAirOnly,
      wholeHouseWaterOnly: parsed.wholeHouseWaterOnly,
      csvPath: parsed.csvPath,
    },
    fileExists: args.fileExists,
  });

  let performDbWrites = false;
  let preflight: VerifyOemRetailerLinksMutationPreflightV1 | null = null;
  let blockers: string[] = [];

  if (parsed.writeDb) {
    preflight = buildVerifyOemRetailerLinksMutationPreflightV1({
      rootDir,
      mode: "write",
      csvRelPaths,
      io_capability: args.io_capability,
      now: args.now,
      readText: args.readText,
      founderRows: args.founderRows,
    });
    performDbWrites = verifyOemRetailerLinksMutationAuthorizedV1(preflight);
    blockers = [...preflight.blockers];
    if (!performDbWrites) {
      console.error(
        `write-db blocked (${blockers.join(", ") || "unauthorized"}); no DB UPDATE will be performed.`,
      );
    }
  }

  const stamp = (args.now ?? (() => new Date()))().toISOString().replace(/[:.]/g, "-").slice(0, 19);
  const outPath = parsed.outCsvPath
    ? path.isAbsolute(parsed.outCsvPath)
      ? parsed.outCsvPath
      : path.join(rootDir, parsed.outCsvPath)
    : path.join(rootDir, "reports", `oem-browser-truth-${stamp}.csv`);

  fs.mkdirSync(path.dirname(outPath), { recursive: true });
  fs.writeFileSync(
    outPath,
    [
      "audited_at",
      "source_file",
      "filter_slug",
      "retailer_key",
      "retailer_name",
      "original_url",
      "final_url",
      "page_title",
      "classification",
      "notes",
    ].join(",") + "\n",
    "utf8",
  );

  const counts: Record<Classification, number> = {
    direct_buyable: 0,
    likely_valid: 0,
    likely_not_found: 0,
    likely_search_results: 0,
    likely_blocked: 0,
    timeout: 0,
    browser_error: 0,
  };

  const persistCounts = {
    updated: 0,
    missing: 0,
  };

  const launchBrowser = args.launchBrowser ?? chromium.launch;
  const browser = await launchBrowser({ headless: true });
  const auditedAt = (args.now ?? (() => new Date()))().toISOString();
  const total = jobs.length;

  try {
    for (let i = 0; i < jobs.length; i++) {
      const job = jobs[i];
      const rowNum = i + 1;
      const { classification, notes, line } = await verifyOneJob(browser, job, auditedAt, {
        screenshotDir: parsed.screenshotDir,
        debugBuySignals: parsed.debugBuySignals,
      });
      counts[classification]++;
      appendCsvRow(outPath, line);

      if (parsed.writeDb && performDbWrites) {
        const persisted = await persistBrowserTruth(job, classification, notes, auditedAt);
        if (persisted === "updated") persistCounts.updated++;
        if (persisted === "missing") persistCounts.missing++;
      }

      console.log(
        `[${rowNum}/${total}] slug=${job.filter_slug} classification=${classification} (key=${job.retailer_key})`,
      );
    }
  } finally {
    await browser.close();
  }

  console.log("\n--- Summary (classification) ---");
  for (const k of Object.keys(counts) as Classification[]) {
    console.log(`${k}: ${counts[k]}`);
  }

  if (parsed.writeDb) {
    console.log("\n--- Summary (db persist) ---");
    console.log(`updated: ${persistCounts.updated}`);
    console.log(`missing: ${persistCounts.missing}`);
  }

  console.log(`\nWrote (incremental): ${outPath}`);

  let apply_status: VerifyOemRetailerLinksApplyStatusV1 | undefined;
  let exit_code: 0 | 1 = 0;

  if (parsed.writeDb && preflight) {
    apply_status = blockers.length > 0 ? "BLOCKED" : "APPLIED";
    const recordTruthLedger = args.recordTruthLedger ?? recordTruthLedgerMutationOutcomeV1;
    const applyOutcome: TruthLedgerMutationApplyOutcomeV1 =
      apply_status === "BLOCKED" ? "blocked" : "applied";
    const record = recordTruthLedger({
      rootDir,
      io_capability: TRUTH_LEDGER_IO_ON_WRITE_INTENT_V1,
      mutation_lane: VERIFY_OEM_RETAILER_LINKS_MUTATION_LANE_V1,
      founder_decision_id: preflight.founder_decision_id,
      apply_outcome: applyOutcome,
      blockers,
      now: args.now,
    });
    if (!record.ok) {
      blockers.push(...record.blockers);
      apply_status = "BLOCKED";
    }
    exit_code = apply_status === "BLOCKED" ? 1 : 0;
  }

  return {
    report: {
      jobs_count: jobs.length,
      write_db_requested: parsed.writeDb,
      out_csv_path: outPath,
      ...(parsed.writeDb
        ? {
            apply_status,
            mutation_authorized: performDbWrites && apply_status === "APPLIED",
            mutation_preflight_blockers: blockers,
            founder_decision_id: preflight?.founder_decision_id ?? null,
            persist_counts: persistCounts,
          }
        : {}),
    },
    exit_code,
  };
}
