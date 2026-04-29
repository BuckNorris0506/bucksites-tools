import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { parse } from "csv-parse/sync";

const TARGET_TOKENS = ["242017801", "242086201", "242294502", "EPTWFU01", "FPPWFU01"] as const;

type TargetToken = (typeof TARGET_TOKENS)[number];

type TargetResult = {
  token: TargetToken;
  current_search_url: string | "UNKNOWN";
  candidate_url: string | "UNKNOWN";
  proof_status: "PROVEN_FROM_REPO" | "UNKNOWN";
  reason: string;
};

export type FrigidaireOemDirectPdpCandidatesReport = {
  report_name: "buckparts_frigidaire_oem_direct_pdp_candidates_v1";
  generated_at: string;
  read_only: true;
  data_mutation: false;
  targets: TargetResult[];
  recommended_next_action: string;
};

type BuildOptions = {
  rootDir?: string;
  now?: () => Date;
  retailerLinksCsvText?: string;
};

type RetailerLinkCsvRow = {
  affiliate_url?: string;
};

function isFrigidaireUrl(url: string): boolean {
  try {
    return new URL(url).hostname.toLowerCase().includes("frigidaire.com");
  } catch {
    return false;
  }
}

function isSearchStyleFrigidaireUrl(url: string): boolean {
  try {
    const u = new URL(url);
    const pathLower = u.pathname.toLowerCase();
    return (
      pathLower.includes("/catalogsearch/") ||
      pathLower.includes("/search") ||
      (u.searchParams.get("q") ?? "").trim().length > 0
    );
  } catch {
    return false;
  }
}

function tokenize(url: string): string {
  return url.toUpperCase();
}

function findCurrentSearchUrl(urls: string[], token: TargetToken): string | "UNKNOWN" {
  const tokenUpper = token.toUpperCase();
  const hit = urls.find((url) => isSearchStyleFrigidaireUrl(url) && tokenize(url).includes(tokenUpper));
  return hit ?? "UNKNOWN";
}

function findProvenDirectCandidateUrl(urls: string[], token: TargetToken): string | "UNKNOWN" {
  const tokenUpper = token.toUpperCase();
  const hit = urls.find(
    (url) => !isSearchStyleFrigidaireUrl(url) && tokenize(url).includes(tokenUpper),
  );
  return hit ?? "UNKNOWN";
}

export function buildFrigidaireCandidateTargets(urls: string[]): TargetResult[] {
  return TARGET_TOKENS.map((token) => {
    const currentSearchUrl = findCurrentSearchUrl(urls, token);
    const candidateUrl = findProvenDirectCandidateUrl(urls, token);
    if (candidateUrl !== "UNKNOWN") {
      return {
        token,
        current_search_url: currentSearchUrl,
        candidate_url: candidateUrl,
        proof_status: "PROVEN_FROM_REPO",
        reason: "Direct Frigidaire URL containing target token exists in repo data.",
      };
    }
    return {
      token,
      current_search_url: currentSearchUrl,
      candidate_url: "UNKNOWN",
      proof_status: "UNKNOWN",
      reason:
        "No direct Frigidaire PDP URL pattern for this token is proven by current repo URL evidence.",
    };
  });
}

function parseRetailerLinkUrls(csvText: string): string[] {
  const rows = parse(csvText, { columns: true, skip_empty_lines: true }) as RetailerLinkCsvRow[];
  return rows
    .map((row) => row.affiliate_url)
    .filter((url): url is string => typeof url === "string" && url.trim().length > 0)
    .filter(isFrigidaireUrl);
}

export function buildFrigidaireOemDirectPdpCandidatesReport(
  options: BuildOptions = {},
): FrigidaireOemDirectPdpCandidatesReport {
  const rootDir = options.rootDir ?? process.cwd();
  const now = options.now ?? (() => new Date());
  const csvText =
    options.retailerLinksCsvText ??
    readFileSync(path.resolve(rootDir, "data/retailer_links.csv"), "utf8");
  const frigidaireUrls = parseRetailerLinkUrls(csvText);
  const targets = buildFrigidaireCandidateTargets(frigidaireUrls);
  const allUnknown = targets.every((target) => target.proof_status === "UNKNOWN");

  return {
    report_name: "buckparts_frigidaire_oem_direct_pdp_candidates_v1",
    generated_at: now().toISOString(),
    read_only: true,
    data_mutation: false,
    targets,
    recommended_next_action: allUnknown
      ? "All target tokens remain UNKNOWN from repo-only proof; capture at least one verified direct Frigidaire PDP URL shape before replacing search-style rows."
      : "Use PROVEN_FROM_REPO candidates for manual verification before queue promotion.",
  };
}

export function main(): void {
  const report = buildFrigidaireOemDirectPdpCandidatesReport();
  process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);
}

const THIS_FILE = fileURLToPath(import.meta.url);
if (process.argv[1] && path.resolve(process.argv[1]) === THIS_FILE) {
  main();
}

