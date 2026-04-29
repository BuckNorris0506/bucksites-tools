import path from "node:path";
import { fileURLToPath } from "node:url";

import { loadEnv } from "./lib/load-env";
import { getSupabaseAdmin } from "./lib/supabase-admin";

const TARGETS = [
  {
    token: "242017801",
    dead_search_url: "https://www.frigidaire.com/en/catalogsearch/result/?q=242017801",
  },
  {
    token: "242086201",
    dead_search_url: "https://www.frigidaire.com/en/catalogsearch/result/?q=242086201",
  },
  {
    token: "242294502",
    dead_search_url: "https://www.frigidaire.com/en/catalogsearch/result/?q=242294502",
  },
  {
    token: "EPTWFU01",
    dead_search_url: "https://www.frigidaire.com/en/catalogsearch/result/?q=EPTWFU01",
  },
  {
    token: "FPPWFU01",
    dead_search_url: "https://www.frigidaire.com/en/catalogsearch/result/?q=FPPWFU01",
  },
] as const;

type Target = (typeof TARGETS)[number];

type RetailerLinkRow = {
  id: string | null;
  affiliate_url: string | null;
  browser_truth_classification: string | null;
};

type ResolvedTarget = {
  token: Target["token"];
  dead_search_url: Target["dead_search_url"];
  link_id: string | "UNKNOWN";
  found: boolean;
  current_browser_truth_classification: string | null | "UNKNOWN";
};

export type FrigidaireDeadOemLinkIdsReport = {
  report_name: "buckparts_frigidaire_dead_oem_link_ids_v1";
  generated_at: string;
  read_only: true;
  data_mutation: false;
  targets: ResolvedTarget[];
  all_resolved: boolean;
  known_unknowns: string[];
  recommended_next_action: string;
};

type BuildOptions = {
  now?: () => Date;
  fetchRows?: () => Promise<RetailerLinkRow[]>;
};

async function fetchRowsViaSupabase(): Promise<RetailerLinkRow[]> {
  loadEnv();
  const supabase = getSupabaseAdmin();
  const urls = TARGETS.map((target) => target.dead_search_url);
  const { data, error } = await supabase
    .from("retailer_links")
    .select("id,affiliate_url,browser_truth_classification")
    .eq("retailer_key", "oem-parts-catalog")
    .in("affiliate_url", urls);
  if (error) throw error;
  return (data ?? []) as RetailerLinkRow[];
}

function resolveTargets(rows: RetailerLinkRow[]): ResolvedTarget[] {
  return TARGETS.map((target) => {
    const row = rows.find((candidate) => candidate.affiliate_url === target.dead_search_url);
    if (!row || typeof row.id !== "string" || row.id.trim().length === 0) {
      return {
        token: target.token,
        dead_search_url: target.dead_search_url,
        link_id: "UNKNOWN",
        found: false,
        current_browser_truth_classification: row?.browser_truth_classification ?? "UNKNOWN",
      };
    }
    return {
      token: target.token,
      dead_search_url: target.dead_search_url,
      link_id: row.id,
      found: true,
      current_browser_truth_classification: row.browser_truth_classification,
    };
  });
}

export async function buildFrigidaireDeadOemLinkIdsReport(
  options: BuildOptions = {},
): Promise<FrigidaireDeadOemLinkIdsReport> {
  const now = options.now ?? (() => new Date());
  const fetchRows = options.fetchRows ?? fetchRowsViaSupabase;

  try {
    const targets = resolveTargets(await fetchRows());
    const unresolved = targets.filter((target) => !target.found);
    const allResolved = unresolved.length === 0;
    return {
      report_name: "buckparts_frigidaire_dead_oem_link_ids_v1",
      generated_at: now().toISOString(),
      read_only: true,
      data_mutation: false,
      targets,
      all_resolved: allResolved,
      known_unknowns: unresolved.map(
        (target) => `Missing retailer_links id for token ${target.token} at dead Frigidaire OEM URL.`,
      ),
      recommended_next_action: allResolved
        ? "Use resolved link_ids as mutation preflight inputs; keep dead OEM URLs blocked and route only through full-gate-verified compatible-aftermarket paths."
        : "Resolve UNKNOWN link_ids in public.retailer_links before any mutation; do not mutate dead OEM rows until all target link_ids are known.",
    };
  } catch {
    return {
      report_name: "buckparts_frigidaire_dead_oem_link_ids_v1",
      generated_at: now().toISOString(),
      read_only: true,
      data_mutation: false,
      targets: TARGETS.map((target) => ({
        token: target.token,
        dead_search_url: target.dead_search_url,
        link_id: "UNKNOWN",
        found: false,
        current_browser_truth_classification: "UNKNOWN",
      })),
      all_resolved: false,
      known_unknowns: ["public.retailer_links query unavailable; all link_id values unresolved."],
      recommended_next_action:
        "Restore read access to public.retailer_links and rerun link-id resolution before any mutation.",
    };
  }
}

export async function main(): Promise<void> {
  const report = await buildFrigidaireDeadOemLinkIdsReport();
  process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);
}

const THIS_FILE = fileURLToPath(import.meta.url);
if (process.argv[1] && path.resolve(process.argv[1]) === THIS_FILE) {
  main().catch((error) => {
    console.error("[report-frigidaire-dead-oem-link-ids] failed", error);
    process.exit(1);
  });
}

