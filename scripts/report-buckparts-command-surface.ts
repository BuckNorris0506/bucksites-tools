import { existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

type BoolMap = Record<string, boolean>;

export type CommandSurfaceReport = {
  report_name: string;
  generated_at: string;
  read_only: true;
  data_mutation: false;
  completed_cleanup_steps: 11;
  total_cleanup_steps: 20;
  source_files_checked: string[];
  contract_modules_present: {
    page_state: boolean;
    publishability_state: boolean;
    provenance_record: boolean;
    wrong_purchase_risk: boolean;
    replacement_chain: boolean;
    no_buy_reason: boolean;
    retailer_link_state: boolean;
  };
  docs_present: {
    operating_map: boolean;
    script_classification_manifest: boolean;
  };
  gsc_exports_present: {
    sitemap_xml: boolean;
    coverage_zip: boolean;
    performance_zip: boolean;
  };
  learning_outcomes_contract: {
    migration_present: boolean;
    table_runtime_status: "UNKNOWN_NOT_QUERIED";
  };
  known_unknowns: string[];
  recommended_next_step: "Step 13: Affiliate approval tracker";
};

type BuildOptions = {
  rootDir?: string;
  fileExists?: (absolutePath: string) => boolean;
  now?: () => Date;
};

function resolvePaths(rootDir: string) {
  const rel = {
    page_state: "src/lib/page-state/page-state.ts",
    publishability_state: "src/lib/page-state/publishability-state.ts",
    provenance_record: "src/lib/provenance/provenance-record.ts",
    wrong_purchase_risk: "src/lib/risk/wrong-purchase-risk.ts",
    replacement_chain: "src/lib/replacement/replacement-chain.ts",
    no_buy_reason: "src/lib/no-buy/no-buy-reason.ts",
    retailer_link_state: "src/lib/retailers/retailer-link-state.ts",
    operating_map: "docs/buckparts-operating-map.md",
    script_classification_manifest: "docs/buckparts-script-classification-manifest.md",
    sitemap_xml: "data/gsc/sitemap.xml",
    coverage_zip: "data/gsc/buckparts.com-Coverage-2026-04-28.zip",
    performance_zip: "data/gsc/buckparts.com-Performance-on-Search-2026-04-28.zip",
    learning_outcomes_migration:
      "supabase/migrations/20260428200500_learning_outcomes.sql",
  } as const;

  const abs = Object.fromEntries(
    Object.entries(rel).map(([k, v]) => [k, path.resolve(rootDir, v)]),
  ) as Record<keyof typeof rel, string>;

  return { rel, abs };
}

function pickMissing(obj: BoolMap, keys: string[]): string[] {
  return keys.filter((k) => !obj[k]);
}

export function buildBuckpartsCommandSurfaceReport(
  options: BuildOptions = {},
): CommandSurfaceReport {
  const rootDir = options.rootDir ?? process.cwd();
  const fileExists = options.fileExists ?? existsSync;
  const now = options.now ?? (() => new Date());
  const { rel, abs } = resolvePaths(rootDir);

  const checks: BoolMap = {};
  for (const key of Object.keys(abs)) {
    checks[key] = fileExists(abs[key as keyof typeof abs]);
  }

  const source_files_checked = Object.values(rel);
  const missingContracts = pickMissing(checks, [
    "page_state",
    "publishability_state",
    "provenance_record",
    "wrong_purchase_risk",
    "replacement_chain",
    "no_buy_reason",
    "retailer_link_state",
  ]);

  const known_unknowns = [
    "learning_outcomes runtime table status is UNKNOWN_NOT_QUERIED (DB intentionally not queried).",
    checks.coverage_zip
      ? null
      : "GSC coverage export zip missing locally; indexation breakdown remains unknown from this command.",
    checks.performance_zip
      ? null
      : "GSC performance export zip missing locally; traffic/index visibility trends remain unknown from this command.",
    checks.sitemap_xml
      ? null
      : "Local sitemap.xml export missing; sitemap parity cannot be verified in this command run.",
    missingContracts.length === 7
      ? "All contract modules are missing; policy-state health cannot be computed yet."
      : null,
  ].filter((v): v is string => typeof v === "string");

  return {
    report_name: "buckparts_command_surface_v1",
    generated_at: now().toISOString(),
    read_only: true,
    data_mutation: false,
    completed_cleanup_steps: 11,
    total_cleanup_steps: 20,
    source_files_checked,
    contract_modules_present: {
      page_state: checks.page_state,
      publishability_state: checks.publishability_state,
      provenance_record: checks.provenance_record,
      wrong_purchase_risk: checks.wrong_purchase_risk,
      replacement_chain: checks.replacement_chain,
      no_buy_reason: checks.no_buy_reason,
      retailer_link_state: checks.retailer_link_state,
    },
    docs_present: {
      operating_map: checks.operating_map,
      script_classification_manifest: checks.script_classification_manifest,
    },
    gsc_exports_present: {
      sitemap_xml: checks.sitemap_xml,
      coverage_zip: checks.coverage_zip,
      performance_zip: checks.performance_zip,
    },
    learning_outcomes_contract: {
      migration_present: checks.learning_outcomes_migration,
      table_runtime_status: "UNKNOWN_NOT_QUERIED",
    },
    known_unknowns,
    recommended_next_step: "Step 13: Affiliate approval tracker",
  };
}

export function main(): void {
  const report = buildBuckpartsCommandSurfaceReport();
  process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);
}

const THIS_FILE = fileURLToPath(import.meta.url);
if (process.argv[1] && path.resolve(process.argv[1]) === THIS_FILE) {
  main();
}
