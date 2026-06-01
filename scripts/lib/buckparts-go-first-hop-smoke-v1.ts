import { readFileSync } from "node:fs";
import path from "node:path";
import { parse } from "csv-parse/sync";

export const BUCKPARTS_GO_FIRST_HOP_SMOKE_CONTRACT_V1 =
  "buckparts_go_first_hop_smoke_v1" as const;

export const BUCKPARTS_GO_FIRST_HOP_SMOKE_SOURCE_COMMAND_V1 =
  "node --import tsx scripts/report-buckparts-go-first-hop-smoke-v1.ts --base-url http://127.0.0.1:3012" as const;

export const BUCKPARTS_GO_FIRST_HOP_RETAILER_REDIRECT_LEARNING_NOTE_V1 =
  "Retailer redirect smoke must validate BuckParts first-hop redirect only. Do not follow Amazon with curl -L; Amazon may return bot-dependent 500s unrelated to BuckParts." as const;

export type BuckPartsGoFirstHopTargetV1 = {
  slug: string;
  link_id: string;
  expected_asin: string;
  expected_tag: "buckparts20-20";
  expected_location_substring: string;
  go_path: string;
};

export type BuckPartsGoFirstHopObservedResponseV1 = {
  status: number;
  location: string | null;
};

export type BuckPartsGoFirstHopTargetResultV1 = BuckPartsGoFirstHopTargetV1 & {
  url: string;
  status: number | null;
  location: string | null;
  validation_status: "PASS" | "FAIL";
  blockers: string[];
};

export type BuckPartsGoFirstHopSmokeReportV1 = {
  contract: typeof BUCKPARTS_GO_FIRST_HOP_SMOKE_CONTRACT_V1;
  read_only: true;
  data_mutation: false;
  supabase_write_authorized: false;
  evidence_write_authorized: false;
  netlify_api_authorized: false;
  deploy_authorized: false;
  generated_at: string;
  source_command: typeof BUCKPARTS_GO_FIRST_HOP_SMOKE_SOURCE_COMMAND_V1;
  base_url: string;
  target_count: number;
  pass_count: number;
  fail_count: number;
  smoke_status: "PASS" | "FAIL";
  learning_note: typeof BUCKPARTS_GO_FIRST_HOP_RETAILER_REDIRECT_LEARNING_NOTE_V1;
  targets: BuckPartsGoFirstHopTargetResultV1[];
  proven_facts: string[];
  unknown_facts: string[];
};

type RetailerLinksCsvRow = {
  filter_slug: string;
  affiliate_url: string;
  is_primary: string;
  retailer_key: string;
  browser_truth_classification: string;
};

const GUARDED_BATCH_LINK_IDS_BY_SLUG_V1: Record<string, string> = {
  "4396710": "b2241855-b588-4884-9dfa-b0f5969becbf",
  "4396841": "0ec8d954-9596-472f-8c74-815870226bce",
  "46-9002": "17510d54-85a3-4e43-a671-272a9df274b6",
  "8171413": "a891c852-2bd3-4b0c-9948-7226469c638a",
  "da29-00019a": "72029713-27b2-4598-bd4f-33ba5a0e22cc",
  "da97-15217d": "3ae440ae-2324-4580-802b-5f50116f4da2",
  edr1rxd1: "32288a9b-4ff3-4424-86fa-99f716308ef5",
  edr2rxd1: "6f81b4ce-a3b0-4c09-b0d9-965aca5bfc17",
  lt1000p: "c5303885-6ea2-43da-87bb-846a311edba1",
  lt1000pc: "0a1e3c22-518d-476e-ba95-91955984e2ec",
  lt600p: "4b240a57-970a-42f5-a23d-ca99fbc40ad2",
  lt700p: "a468799b-64c4-44e9-a16f-c87be931345a",
  lt800p: "6bbf8586-a87e-46de-932c-2bc341587619",
  mdj64844601: "b289be90-b9c3-44c3-9c26-3a554c545a47",
};

function normalizeSlug(slug: string): string {
  return slug.trim().toLowerCase();
}

function expectedAsinFromAmazonUrl(url: string): string | null {
  const match = /\/dp\/([A-Z0-9]{10})/i.exec(url);
  return match?.[1]?.toUpperCase() ?? null;
}

export function validateBuckPartsGoFirstHopResponseV1(args: {
  target: BuckPartsGoFirstHopTargetV1;
  url: string;
  response: BuckPartsGoFirstHopObservedResponseV1;
}): BuckPartsGoFirstHopTargetResultV1 {
  const blockers: string[] = [];
  const allowedRedirectStatuses = new Set([302, 307, 308]);
  if (!allowedRedirectStatuses.has(args.response.status)) {
    blockers.push(`first_hop_status_not_redirect: status=${String(args.response.status)}`);
  }

  const location = args.response.location;
  if (!location) {
    blockers.push("first_hop_location_missing");
  } else {
    if (!location.includes(args.target.expected_location_substring)) {
      blockers.push(
        `first_hop_location_missing_expected_asin: expected=${args.target.expected_location_substring}`,
      );
    }
    let parsed: URL | null = null;
    try {
      parsed = new URL(location);
    } catch {
      blockers.push("first_hop_location_invalid_url");
    }
    if (parsed?.searchParams.get("tag") !== args.target.expected_tag) {
      blockers.push(`first_hop_location_missing_expected_tag: expected=${args.target.expected_tag}`);
    }
  }

  return {
    ...args.target,
    url: args.url,
    status: args.response.status,
    location,
    validation_status: blockers.length === 0 ? "PASS" : "FAIL",
    blockers,
  };
}

export function buildBuckPartsGoFirstHopTargetsFromCsvV1(args: {
  rootDir: string;
  readText?: (absPath: string) => string;
}): BuckPartsGoFirstHopTargetV1[] {
  const readText = args.readText ?? ((absPath: string) => readFileSync(absPath, "utf8"));
  const csvText = readText(path.join(args.rootDir, "data/retailer_links.csv"));
  const rows = parse(csvText, { columns: true, skip_empty_lines: true }) as RetailerLinksCsvRow[];
  const rowsBySlug = new Map(rows.map((row) => [normalizeSlug(row.filter_slug), row]));

  return Object.entries(GUARDED_BATCH_LINK_IDS_BY_SLUG_V1)
    .map(([slug, linkId]) => {
      const row = rowsBySlug.get(normalizeSlug(slug));
      if (!row) throw new Error(`guarded_batch_row_missing: slug=${slug}`);
      if ((row.is_primary ?? "").trim().toLowerCase() !== "true") {
        throw new Error(`guarded_batch_row_not_primary: slug=${slug}`);
      }
      if ((row.retailer_key ?? "").trim().toLowerCase() !== "amazon") {
        throw new Error(`guarded_batch_row_not_amazon: slug=${slug}`);
      }
      if ((row.browser_truth_classification ?? "").trim() !== "direct_buyable") {
        throw new Error(`guarded_batch_row_not_direct_buyable: slug=${slug}`);
      }
      const asin = expectedAsinFromAmazonUrl(row.affiliate_url);
      if (!asin) throw new Error(`guarded_batch_row_asin_missing: slug=${slug}`);
      return {
        slug,
        link_id: linkId,
        expected_asin: asin,
        expected_tag: "buckparts20-20" as const,
        expected_location_substring: `/dp/${asin}`,
        go_path: `/go/${linkId}`,
      };
    })
    .sort((a, b) => a.slug.localeCompare(b.slug));
}

export async function buildBuckPartsGoFirstHopSmokeReportV1(args: {
  rootDir: string;
  baseUrl: string;
  now?: () => Date;
  allowProductionGoClickLogging?: boolean;
  fetchFirstHop?: (url: string) => Promise<BuckPartsGoFirstHopObservedResponseV1>;
  readText?: (absPath: string) => string;
}): Promise<BuckPartsGoFirstHopSmokeReportV1> {
  const now = args.now ?? (() => new Date());
  const base = new URL(args.baseUrl);
  if (
    !args.allowProductionGoClickLogging &&
    (base.hostname === "buckparts.com" || base.hostname.endsWith(".buckparts.com"))
  ) {
    throw new Error(
      "refusing_production_go_smoke_without_explicit_allow: live /go GET logs click_events; use a local target or pass --allow-production-go-click-logging intentionally",
    );
  }

  const fetchFirstHop =
    args.fetchFirstHop ??
    (async (url: string) => {
      const response = await fetch(url, {
        method: "GET",
        redirect: "manual",
        headers: {
          "user-agent": "BuckPartsFirstHopSmoke/1.0 first-hop-only",
        },
      });
      return { status: response.status, location: response.headers.get("location") };
    });

  const targets = buildBuckPartsGoFirstHopTargetsFromCsvV1({
    rootDir: args.rootDir,
    readText: args.readText,
  });
  const results: BuckPartsGoFirstHopTargetResultV1[] = [];
  for (const target of targets) {
    const url = new URL(target.go_path, base).toString();
    try {
      const response = await fetchFirstHop(url);
      results.push(validateBuckPartsGoFirstHopResponseV1({ target, url, response }));
    } catch (error) {
      results.push({
        ...target,
        url,
        status: null,
        location: null,
        validation_status: "FAIL",
        blockers: [`first_hop_fetch_failed: ${error instanceof Error ? error.message : String(error)}`],
      });
    }
  }

  const passCount = results.filter((row) => row.validation_status === "PASS").length;
  const failCount = results.length - passCount;
  return {
    contract: BUCKPARTS_GO_FIRST_HOP_SMOKE_CONTRACT_V1,
    read_only: true,
    data_mutation: false,
    supabase_write_authorized: false,
    evidence_write_authorized: false,
    netlify_api_authorized: false,
    deploy_authorized: false,
    generated_at: now().toISOString(),
    source_command: BUCKPARTS_GO_FIRST_HOP_SMOKE_SOURCE_COMMAND_V1,
    base_url: base.toString().replace(/\/$/, ""),
    target_count: results.length,
    pass_count: passCount,
    fail_count: failCount,
    smoke_status: failCount === 0 ? "PASS" : "FAIL",
    learning_note: BUCKPARTS_GO_FIRST_HOP_RETAILER_REDIRECT_LEARNING_NOTE_V1,
    targets: results,
    proven_facts: [
      "PROVEN: smoke validates BuckParts first-hop redirect response only with fetch redirect=manual.",
      "PROVEN: final Amazon HTTP status is not fetched and is not a pass/fail criterion.",
      "PROVEN: script has no Supabase, evidence, Netlify, or deploy write authority.",
    ],
    unknown_facts: [
      "UNKNOWN: final retailer/Amazon bot-dependent status is intentionally out of scope.",
    ],
  };
}
