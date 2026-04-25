import fs from "node:fs";
import { chromium } from "playwright";
import { canonicalAmazonDpUrl } from "./lib/discovery-candidate-enrichment";
import {
  diagnoseHqiiAmazonEnrichment,
  loadCatalogTokensBySlugForWholeHouseWater,
} from "./lib/hqii-discovery-candidate-generation";

type Canary = {
  slug: string;
  wedge: "whole_house_water" | "refrigerator_water";
  current_candidate_url: string;
  catalog_tokens: string[];
  search_query: string;
};

export type CanaryCandidateVerdict = {
  candidate_url: string;
  classification: "token_pass" | "fetch_interstitial" | "candidate_token_mismatch" | "no_candidate";
  note: string;
};

type CanaryResult = {
  canary: string;
  candidate_urls: string[];
  verdicts: CanaryCandidateVerdict[];
  canary_ready_for_write_lane: boolean;
  reason: string;
};

type CanaryInputOverride = {
  canary: string;
  candidate_urls: string[];
};

type CanaryInputFile = {
  canaries: CanaryInputOverride[];
};

type Args = {
  runId: string;
  inputPath: string | null;
};

type OutputRow = {
  run_id: string;
  canary: string;
  candidate_url: string;
  classification: CanaryCandidateVerdict["classification"];
  row_ready_for_write_lane: boolean;
  canary_ready_for_write_lane: boolean;
};

const CANARIES: Canary[] = [
  {
    slug: "pentek-wp25bb20p",
    wedge: "whole_house_water",
    current_candidate_url: "https://www.amazon.com/dp/B07Y2861LC",
    catalog_tokens: ["WP25BB20P"],
    search_query: "WP25BB20P",
  },
  {
    slug: "da97-17376a",
    wedge: "refrigerator_water",
    current_candidate_url: "https://www.amazon.com/dp/B071NFVVNG",
    catalog_tokens: ["DA97-17376A", "DA9717376A"],
    search_query: "DA97-17376A",
  },
];

const INTERSTITIAL_RE =
  /captcha|robot|automated access|verify you are human|sorry, we just need to make sure|click the button below to continue shopping/i;

export function uniqueCanonicalDpUrls(urls: string[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const url of urls) {
    const canonical = canonicalAmazonDpUrl(url);
    if (!canonical || seen.has(canonical)) continue;
    seen.add(canonical);
    out.push(canonical);
  }
  return out;
}

function extractAlternateDpUrls(searchHtml: string, maxUrls: number): string[] {
  const out: string[] = [];
  const seen = new Set<string>();
  const re = /\/dp\/([A-Z0-9]{10})/gi;
  let match: RegExpExecArray | null;
  while ((match = re.exec(searchHtml)) !== null) {
    const canonical = `https://www.amazon.com/dp/${match[1]!.toUpperCase()}`;
    if (seen.has(canonical)) continue;
    seen.add(canonical);
    out.push(canonical);
    if (out.length >= maxUrls) break;
  }
  return out;
}

async function fetchBodyWithFallback(browser: Awaited<ReturnType<typeof chromium.launch>>, url: string): Promise<string> {
  let html = "";
  try {
    const res = await fetch(url, { redirect: "follow" });
    html = await res.text();
  } catch {
    html = "";
  }
  if (html && !INTERSTITIAL_RE.test(html)) return html;

  const context = await browser.newContext({
    userAgent: "BuckPartsDiscoveryEnrichment/1.0 (+https://buckparts.com)",
    viewport: { width: 1280, height: 720 },
  });
  const page = await context.newPage();
  try {
    await page.goto(url, { waitUntil: "domcontentloaded", timeout: 45000 });
    const body = await page.evaluate(() => document.body?.innerText ?? "");
    return body || html;
  } catch {
    return html;
  } finally {
    await context.close();
  }
}

async function candidateUrlsForCanary(canary: Canary): Promise<string[]> {
  const seed = canonicalAmazonDpUrl(canary.current_candidate_url);
  const base = seed ? [seed] : [];
  let searchHtml = "";
  try {
    const res = await fetch(
      `https://www.amazon.com/s?k=${encodeURIComponent(canary.search_query)}`,
      { redirect: "follow", headers: { "user-agent": "Mozilla/5.0" } },
    );
    searchHtml = await res.text();
  } catch {
    searchHtml = "";
  }
  const alternates = extractAlternateDpUrls(searchHtml, 8);
  return uniqueCanonicalDpUrls([...base, ...alternates]).slice(0, 3);
}

function argValue(flag: string): string | null {
  const idx = process.argv.indexOf(flag);
  if (idx < 0) return null;
  const v = process.argv[idx + 1];
  return v && !v.startsWith("--") ? v : null;
}

function parseArgs(): Args {
  const runId = argValue("--run-id")?.trim() ?? `canary-${new Date().toISOString()}`;
  const inputPath = argValue("--input")?.trim() ?? null;
  return { runId, inputPath };
}

function loadInputOverrides(path: string | null): Map<string, string[]> {
  if (!path) return new Map<string, string[]>();
  const raw = fs.readFileSync(path, "utf8");
  const json = JSON.parse(raw) as CanaryInputFile;
  const out = new Map<string, string[]>();
  for (const canary of json.canaries ?? []) {
    const urls = uniqueCanonicalDpUrls(canary.candidate_urls ?? []);
    out.set(canary.canary, urls);
  }
  return out;
}

async function runCanary(
  browser: Awaited<ReturnType<typeof chromium.launch>>,
  canary: Canary,
  whwCatalogTokensBySlug: Map<string, string[]>,
  overrideCandidateUrls: string[] | null,
): Promise<CanaryResult> {
  const candidateUrls = overrideCandidateUrls && overrideCandidateUrls.length > 0
    ? uniqueCanonicalDpUrls(overrideCandidateUrls)
    : await candidateUrlsForCanary(canary);
  const verdicts: CanaryCandidateVerdict[] = [];

  const catalogMap = new Map<string, string[]>();
  if (canary.wedge === "whole_house_water") {
    const whw = whwCatalogTokensBySlug.get(canary.slug) ?? canary.catalog_tokens;
    catalogMap.set(canary.slug, whw);
  } else {
    catalogMap.set(canary.slug, canary.catalog_tokens);
  }

  if (candidateUrls.length === 0) {
    verdicts.push({
      candidate_url: "",
      classification: "no_candidate",
      note: "No canonical /dp/{ASIN} candidates found from current+alternates.",
    });
  } else {
    for (const candidateUrl of candidateUrls) {
      const diagnosis = await diagnoseHqiiAmazonEnrichment({
        filterSlug: canary.slug,
        wedge: canary.wedge,
        catalogTokensBySlug: catalogMap,
        searchHits: [{ url: candidateUrl, snippet: `${canary.slug} candidate` }],
        fetchBodyText: async (url) => fetchBodyWithFallback(browser, url),
      });
      verdicts.push({
        candidate_url: candidateUrl,
        classification: diagnosis.classification,
        note: diagnosis.notes,
      });
    }
  }

  const ready = verdicts.some((v) => v.classification === "token_pass");
  const reason = ready
    ? "At least one candidate passed strict exact-token evidence."
    : "No candidate passed strict exact-token evidence.";

  return {
    canary: `${canary.wedge}:${canary.slug}`,
    candidate_urls: candidateUrls,
    verdicts,
    canary_ready_for_write_lane: ready,
    reason,
  };
}

export function buildOutputRows(runId: string, results: CanaryResult[]): OutputRow[] {
  return results.flatMap((r) =>
    r.verdicts.map((v) => ({
      run_id: runId,
      canary: r.canary,
      candidate_url: v.candidate_url,
      classification: v.classification,
      row_ready_for_write_lane: v.classification === "token_pass",
      canary_ready_for_write_lane: r.canary_ready_for_write_lane,
    })),
  );
}

async function main() {
  const args = parseArgs();
  const overridesByCanary = loadInputOverrides(args.inputPath);
  const browser = await chromium.launch({ headless: true });
  try {
    const whwCatalogTokensBySlug = loadCatalogTokensBySlugForWholeHouseWater();
    const results: CanaryResult[] = [];
    for (const canary of CANARIES) {
      results.push(
        await runCanary(
          browser,
          canary,
          whwCatalogTokensBySlug,
          overridesByCanary.get(`${canary.wedge}:${canary.slug}`) ?? null,
        ),
      );
    }
    const readyForWriteLane = results.every((r) => r.canary_ready_for_write_lane);
    const rows = buildOutputRows(args.runId, results);
    console.log(
      JSON.stringify(
        {
          run_id: args.runId,
          checked_at: new Date().toISOString(),
          rows,
          ready_for_write_lane: readyForWriteLane,
          reason: readyForWriteLane
            ? "All canaries have token_pass evidence."
            : "One or more canaries lack token_pass evidence.",
        },
        null,
        2,
      ),
    );
  } finally {
    await browser.close();
  }
}

if (process.argv[1]?.endsWith("diagnose-amazon-evidence-canaries.ts")) {
  main().catch((err) => {
    const message = err instanceof Error ? `${err.message}\n${err.stack ?? ""}` : String(err);
    console.error(`[diagnose-amazon-evidence-canaries] FAILED: ${message}`);
    process.exitCode = 1;
  });
}
