import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { parse } from "csv-parse/sync";

const TARGET_TOKENS = ["242017801", "242086201", "242294502", "EPTWFU01", "FPPWFU01"] as const;

type TargetToken = (typeof TARGET_TOKENS)[number];

type ReplacementOption = {
  path_type:
    | "APPLIANCEPARTSPROS_STYLE_PDP"
    | "AMAZON_EXACT_TOKEN_PDP"
    | "COMPATIBLE_AFTERMARKET_PARTS";
  candidate_url: string | "UNKNOWN";
  proof_status: "PROVEN_FROM_REPO" | "UNKNOWN";
  reason: string;
};

type TokenStrategy = {
  token: TargetToken;
  oem_status: "DEAD";
  replacement_options: ReplacementOption[];
  recommended_path: ReplacementOption["path_type"] | "UNKNOWN";
};

type Report = {
  report_name: "buckparts_frigidaire_replacement_strategy_v1";
  generated_at: string;
  read_only: true;
  data_mutation: false;
  targets: TokenStrategy[];
};

type RetailerRow = {
  affiliate_url?: string;
  retailer_key?: string;
};

type FilterRow = {
  slug?: string;
  oem_part_number?: string;
  brand_slug?: string;
};

function includesToken(url: string, token: string): boolean {
  return url.toUpperCase().includes(token.toUpperCase());
}

function isFrigidaireSearchUrl(url: string): boolean {
  try {
    const u = new URL(url);
    return (
      u.hostname.toLowerCase().includes("frigidaire.com") &&
      u.pathname.toLowerCase().includes("/catalogsearch/")
    );
  } catch {
    return false;
  }
}

function parseCsv<T>(csvText: string): T[] {
  return parse(csvText, { columns: true, skip_empty_lines: true }) as T[];
}

function buildTargetStrategy(
  token: TargetToken,
  retailerRows: RetailerRow[],
  filtersRows: FilterRow[],
): TokenStrategy {
  const allUrls = retailerRows
    .map((row) => row.affiliate_url)
    .filter((url): url is string => typeof url === "string" && url.length > 0);

  const apppUrl = allUrls.find(
    (url) =>
      url.includes("appliancepartspros.com") &&
      includesToken(url, token),
  );
  const amazonExactTokenUrl = allUrls.find(
    (url) => url.includes("amazon.com/dp/") && includesToken(url, token),
  );

  const filterSlug = filtersRows.find(
    (row) =>
      typeof row.oem_part_number === "string" &&
      row.oem_part_number.toUpperCase() === token.toUpperCase() &&
      row.brand_slug === "frigidaire",
  )?.slug;

  const replacementOptions: ReplacementOption[] = [
    apppUrl
      ? {
          path_type: "APPLIANCEPARTSPROS_STYLE_PDP",
          candidate_url: apppUrl,
          proof_status: "PROVEN_FROM_REPO",
          reason: "Exact-token AppliancePartsPros-style URL exists in repo retailer-link evidence.",
        }
      : {
          path_type: "APPLIANCEPARTSPROS_STYLE_PDP",
          candidate_url: "UNKNOWN",
          proof_status: "UNKNOWN",
          reason: "No exact-token AppliancePartsPros URL is proven in current repo retailer-link data.",
        },
    amazonExactTokenUrl
      ? {
          path_type: "AMAZON_EXACT_TOKEN_PDP",
          candidate_url: amazonExactTokenUrl,
          proof_status: "PROVEN_FROM_REPO",
          reason: "Exact-token Amazon /dp URL exists in repo retailer-link evidence.",
        }
      : {
          path_type: "AMAZON_EXACT_TOKEN_PDP",
          candidate_url: "UNKNOWN",
          proof_status: "UNKNOWN",
          reason: "No exact-token Amazon /dp URL is proven in current repo retailer-link data.",
        },
    filterSlug
      ? {
          path_type: "COMPATIBLE_AFTERMARKET_PARTS",
          candidate_url: `https://buckparts.com/filter/${filterSlug}`,
          proof_status: "PROVEN_FROM_REPO",
          reason: "Frigidaire token maps to an existing BuckParts filter slug in repo catalog data.",
        }
      : {
          path_type: "COMPATIBLE_AFTERMARKET_PARTS",
          candidate_url: "UNKNOWN",
          proof_status: "UNKNOWN",
          reason: "No compatible-aftermarket path is proven for this token in current repo catalog data.",
        },
  ];

  const recommended = replacementOptions.find((opt) => opt.proof_status === "PROVEN_FROM_REPO");
  return {
    token,
    oem_status: "DEAD",
    replacement_options: replacementOptions,
    recommended_path: recommended?.path_type ?? "UNKNOWN",
  };
}

export function buildFrigidaireReplacementStrategyReport(rootDir: string = process.cwd()): Report {
  const retailerCsv = readFileSync(path.resolve(rootDir, "data/retailer_links.csv"), "utf8");
  const filtersCsv = readFileSync(path.resolve(rootDir, "data/filters.csv"), "utf8");
  const retailerRows = parseCsv<RetailerRow>(retailerCsv).filter((row) => {
    return (
      typeof row.affiliate_url === "string" &&
      isFrigidaireSearchUrl(row.affiliate_url) &&
      row.retailer_key === "oem-parts-catalog"
    );
  });
  const filterRows = parseCsv<FilterRow>(filtersCsv);

  return {
    report_name: "buckparts_frigidaire_replacement_strategy_v1",
    generated_at: new Date().toISOString(),
    read_only: true,
    data_mutation: false,
    targets: TARGET_TOKENS.map((token) => buildTargetStrategy(token, retailerRows, filterRows)),
  };
}

export function main(): void {
  const report = buildFrigidaireReplacementStrategyReport();
  process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);
}

const THIS_FILE = fileURLToPath(import.meta.url);
if (process.argv[1] && path.resolve(process.argv[1]) === THIS_FILE) {
  main();
}

