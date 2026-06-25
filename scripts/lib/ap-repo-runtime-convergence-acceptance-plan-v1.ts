/**
 * Read-only plan for unblocking repo_runtime_convergence_gate_v1 (AP v1).
 * Identifies aggregate safe CTA gap rows and recommends CLOSE_PARITY vs ACCEPT_TEMPORARY_DIVERGENCE.
 * Does not write acceptance artifacts or mutate Supabase.
 */

import { readFileSync } from "node:fs";
import path from "node:path";
import { parse } from "csv-parse/sync";

import { isDirectBuyableSafeCtaRow } from "@/lib/retailers/launch-buy-links";

import {
  AP_REPO_RUNTIME_CONVERGENCE_ACCEPTANCE_CONTRACT_V1,
  AP_REPO_RUNTIME_CONVERGENCE_ACCEPTANCE_REL_V1,
  type ApRepoRuntimeConvergenceAcceptanceV1,
} from "./ap-repo-runtime-convergence-acceptance-v1";
import {
  buildAirPurifierSupabaseVsCsvDiffV1Report,
  tryLoadApSupabaseSnapshotV1,
  type ApSeedImportBlockerV1,
  type ApSupabaseVsCsvDiffReportV1,
} from "./air-purifier-supabase-vs-csv-diff-v1";
import { buildRepoRuntimeConvergenceGateReportV1 } from "./repo-runtime-convergence-gate-v1";

export const AP_REPO_RUNTIME_CONVERGENCE_ACCEPTANCE_PLAN_CONTRACT_V1 =
  "ap_repo_runtime_convergence_acceptance_plan_v1" as const;

export const AP_RUNTIME_SAFE_CTA_PARITY_PACKET_REL_V1 =
  "data/air-purifier/batch-production/audits/ap-runtime-safe-cta-parity-packet-v1.json" as const;

export type ApSafeCtaGapRowClassificationV1 =
  | "safe_to_seed_apply_now"
  | "requires_owner_review"
  | "unsafe_blocked"
  | "unknown";

export type ApSafeCtaGapInventoryRowV1 = {
  filter_slug: string;
  csv_primary_retailer_key: string | null;
  csv_browser_truth_classification: string | null;
  csv_primary_affiliate_url: string | null;
  supabase_retailer_link_count: number;
  supabase_primary_retailer_key: string | null;
  supabase_browser_truth_classification: string | null;
  supabase_primary_affiliate_url: string | null;
  classification: ApSafeCtaGapRowClassificationV1;
  classification_rationale: string[];
  related_seed_import_blockers: ApSeedImportBlockerV1[];
};

export type ApRepoRuntimeConvergenceAcceptancePlanPathV1 =
  | "CLOSE_PARITY"
  | "ACCEPT_TEMPORARY_DIVERGENCE";

export type ApRepoRuntimeConvergenceAcceptancePlanV1 = {
  contract: typeof AP_REPO_RUNTIME_CONVERGENCE_ACCEPTANCE_PLAN_CONTRACT_V1;
  read_only: true;
  data_mutation: false;
  mutation_authorized: false;
  supabase_writes: false;
  generated_at: string;
  gate_contract: "repo_runtime_convergence_gate_v1";
  gate_state: "CONVERGED" | "EXPLICITLY_DIVERGED" | "BLOCKED";
  live_measurement: {
    csv_safe_direct_buyable_count: number | null;
    supabase_safe_direct_buyable_count: number | null;
    gap_size: number | null;
    supabase_truth_status: string;
    measured_at: string | null;
  };
  gap_inventory: ApSafeCtaGapInventoryRowV1[];
  diff_authorization: ApSupabaseVsCsvDiffReportV1["authorization_recommendations"] | null;
  parity_packet_overlap_note: string;
  parity_closeable_safely_today: boolean;
  parity_close_blockers: string[];
  recommended_path: ApRepoRuntimeConvergenceAcceptancePlanPathV1;
  recommended_path_rationale: string[];
  proposed_acceptance_artifact: ApRepoRuntimeConvergenceAcceptanceV1 | null;
  acceptance_artifact_write_path: typeof AP_REPO_RUNTIME_CONVERGENCE_ACCEPTANCE_REL_V1;
  acceptance_artifact_committed: boolean;
  validation_commands: string[];
  proven_facts: string[];
  unknown_facts: string[];
};

type RetailerLinkCsvRowV1 = {
  filter_slug: string;
  affiliate_url: string;
  destination_url: string;
  is_primary: string | boolean;
  retailer_key: string | null;
  browser_truth_classification: string | null;
};

type SupabaseRetailerLinkRowV1 = {
  filter_slug: string;
  affiliate_url: string;
  destination_url: string;
  is_primary: boolean;
  retailer_key: string | null;
  browser_truth_classification: string | null;
};

export type BuildApRepoRuntimeConvergenceAcceptancePlanDepsV1 = {
  now?: () => Date;
  buildDiffReport?: (rootDir: string) => Promise<ApSupabaseVsCsvDiffReportV1>;
  loadSupabaseSnapshot?: typeof tryLoadApSupabaseSnapshotV1;
  readRetailerLinksCsv?: (rootDir: string) => RetailerLinkCsvRowV1[];
};

function isPrimaryCsv(row: RetailerLinkCsvRowV1): boolean {
  return row.is_primary === true || row.is_primary === "true";
}

function primarySafeCsv(rows: RetailerLinkCsvRowV1[]): {
  safe: boolean;
  primary: RetailerLinkCsvRowV1 | null;
} {
  const primary = rows.find(isPrimaryCsv) ?? rows[0] ?? null;
  if (!primary) return { safe: false, primary: null };
  const safe = isDirectBuyableSafeCtaRow({
    destination_url: primary.destination_url ?? "",
    browser_truth_classification: primary.browser_truth_classification ?? "",
    retailer_key: primary.retailer_key ?? null,
    affiliate_url: primary.affiliate_url ?? "",
  });
  return { safe, primary };
}

function primarySafeSupabase(rows: SupabaseRetailerLinkRowV1[]): {
  safe: boolean;
  primary: SupabaseRetailerLinkRowV1 | null;
} {
  const primary = rows.find((row) => row.is_primary) ?? rows[0] ?? null;
  if (!primary) return { safe: false, primary: null };
  const safe = isDirectBuyableSafeCtaRow({
    destination_url: primary.destination_url ?? "",
    browser_truth_classification: primary.browser_truth_classification ?? "",
    retailer_key: primary.retailer_key ?? null,
    affiliate_url: primary.affiliate_url ?? "",
  });
  return { safe, primary };
}

function defaultReadRetailerLinksCsv(rootDir: string): RetailerLinkCsvRowV1[] {
  const text = readFileSync(path.join(rootDir, "data/air-purifier/retailer_links.csv"), "utf8");
  return parse(text, {
    columns: true,
    skip_empty_lines: true,
    trim: true,
    relax_column_count: true,
  }) as RetailerLinkCsvRowV1[];
}

export function classifyApSafeCtaGapRowV1(args: {
  row: Omit<
    ApSafeCtaGapInventoryRowV1,
    "classification" | "classification_rationale" | "related_seed_import_blockers"
  >;
  seed_import_blockers: ApSeedImportBlockerV1[];
}): {
  classification: ApSafeCtaGapRowClassificationV1;
  rationale: string[];
} {
  const rationale: string[] = [];
  const slug = args.row.filter_slug;
  const blockers = args.seed_import_blockers.filter(
    (blocker) => blocker.key === slug || blocker.key.startsWith(`${slug}/`),
  );

  const oemCollision = blockers.some((b) => b.blocker_kind === "filter_slug_oem_collision");
  const missingFilter = args.row.supabase_retailer_link_count === 0;
  const primaryMismatch =
    args.row.csv_primary_retailer_key === "oem-catalog" &&
    args.row.supabase_primary_retailer_key !== null &&
    args.row.supabase_primary_retailer_key !== "oem-catalog";
  const staleSupabasePrimary =
    args.row.supabase_browser_truth_classification === "likely_search_results" ||
    args.row.supabase_browser_truth_classification === "likely_not_found" ||
    args.row.supabase_browser_truth_classification === "timeout";

  if (oemCollision) {
    rationale.push(
      "PROVEN: filter_slug_oem_collision — vertical-seed import HOLD until OEM pre-alignment SQL.",
    );
    return { classification: "unsafe_blocked", rationale };
  }

  if (missingFilter) {
    rationale.push(
      "PROVEN: filter_slug absent from Supabase retailer_links — requires filter seed + link import before runtime safe CTA parity.",
    );
    return { classification: "requires_owner_review", rationale };
  }

  if (primaryMismatch || staleSupabasePrimary) {
    if (primaryMismatch) {
      rationale.push(
        `PROVEN: CSV primary=${args.row.csv_primary_retailer_key} but Supabase primary=${args.row.supabase_primary_retailer_key}.`,
      );
    }
    if (staleSupabasePrimary) {
      rationale.push(
        `PROVEN: Supabase primary browser_truth_classification=${String(args.row.supabase_browser_truth_classification)} blocks safe CTA.`,
      );
    }
    rationale.push(
      "INFERRED: guarded retailer_links SQL / primary promotion + browser_truth parity apply required — owner review before mutation.",
    );
    return { classification: "requires_owner_review", rationale };
  }

  rationale.push("UNKNOWN: gap row does not match known blocker patterns.");
  return { classification: "unknown", rationale };
}

export function buildApSafeCtaGapInventoryV1(args: {
  rootDir: string;
  diff: ApSupabaseVsCsvDiffReportV1;
  supabaseLinks: SupabaseRetailerLinkRowV1[];
  readRetailerLinksCsv: (rootDir: string) => RetailerLinkCsvRowV1[];
}): ApSafeCtaGapInventoryRowV1[] {
  const csvLinks = args.readRetailerLinksCsv(args.rootDir);
  const csvBy = new Map<string, RetailerLinkCsvRowV1[]>();
  for (const row of csvLinks) {
    const slug = row.filter_slug.trim().toLowerCase();
    if (!slug) continue;
    const list = csvBy.get(slug) ?? [];
    list.push(row);
    csvBy.set(slug, list);
  }

  const dbBy = new Map<string, SupabaseRetailerLinkRowV1[]>();
  for (const row of args.supabaseLinks) {
    const slug = row.filter_slug.trim().toLowerCase();
    const list = dbBy.get(slug) ?? [];
    list.push(row);
    dbBy.set(slug, list);
  }

  const inventory: ApSafeCtaGapInventoryRowV1[] = [];
  for (const slug of [...csvBy.keys()].sort()) {
    const csv = primarySafeCsv(csvBy.get(slug) ?? []);
    const dbRows = dbBy.get(slug) ?? [];
    const db = primarySafeSupabase(dbRows);
    if (!csv.safe || db.safe) continue;

    const base = {
      filter_slug: slug,
      csv_primary_retailer_key: csv.primary?.retailer_key ?? null,
      csv_browser_truth_classification: csv.primary?.browser_truth_classification ?? null,
      csv_primary_affiliate_url: csv.primary?.affiliate_url ?? null,
      supabase_retailer_link_count: dbRows.length,
      supabase_primary_retailer_key: db.primary?.retailer_key ?? null,
      supabase_browser_truth_classification: db.primary?.browser_truth_classification ?? null,
      supabase_primary_affiliate_url: db.primary?.affiliate_url ?? null,
    };
    const classified = classifyApSafeCtaGapRowV1({
      row: base,
      seed_import_blockers: args.diff.seed_import_blockers,
    });
    const related_seed_import_blockers = args.diff.seed_import_blockers.filter(
      (blocker) => blocker.key === slug || blocker.key.startsWith(`${slug}/`),
    );
    inventory.push({
      ...base,
      classification: classified.classification,
      classification_rationale: classified.rationale,
      related_seed_import_blockers,
    });
  }

  return inventory;
}

function addDaysIso(iso: string, days: number): string {
  const date = new Date(iso);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString();
}

export function buildProposedApRepoRuntimeConvergenceAcceptanceV1(args: {
  live: {
    csv_safe_direct_buyable_count: number;
    supabase_safe_direct_buyable_count: number;
    gap_size: number;
    measured_at: string;
    supabase_truth_status: "CHECKED";
  };
  accepted_by: string;
  reason: string;
  re_review_by: string;
  accepted_at: string;
}): ApRepoRuntimeConvergenceAcceptanceV1 {
  return {
    contract: AP_REPO_RUNTIME_CONVERGENCE_ACCEPTANCE_CONTRACT_V1,
    read_only: true,
    data_mutation: false,
    wedge: "air_purifier",
    accepted_at: args.accepted_at,
    accepted_by: args.accepted_by,
    reason: args.reason,
    re_review_by: args.re_review_by,
    measured_gap: {
      csv_safe_direct_buyable_count: args.live.csv_safe_direct_buyable_count,
      supabase_safe_direct_buyable_count: args.live.supabase_safe_direct_buyable_count,
      gap_size: args.live.gap_size,
      measured_at: args.live.measured_at,
      supabase_truth_status: "CHECKED",
    },
  };
}

export function resolveApRepoRuntimeConvergenceAcceptancePlanPathV1(args: {
  gap_inventory: readonly ApSafeCtaGapInventoryRowV1[];
  diff: ApSupabaseVsCsvDiffReportV1 | null;
  gate_gap_size: number | null;
}): {
  recommended_path: ApRepoRuntimeConvergenceAcceptancePlanPathV1;
  parity_closeable_safely_today: boolean;
  parity_close_blockers: string[];
  rationale: string[];
} {
  const rationale: string[] = [];
  const parity_close_blockers: string[] = [];

  if (args.gate_gap_size === null || args.gate_gap_size === 0) {
    return {
      recommended_path: "CLOSE_PARITY",
      parity_closeable_safely_today: true,
      parity_close_blockers,
      rationale: ["PROVEN: aggregate safe CTA gap is zero — gate already CONVERGED."],
    };
  }

  if (!args.diff) {
    parity_close_blockers.push("diff report unavailable");
    rationale.push("UNKNOWN: cannot assess seed_import authorization without diff report.");
    return {
      recommended_path: "ACCEPT_TEMPORARY_DIVERGENCE",
      parity_closeable_safely_today: false,
      parity_close_blockers,
      rationale,
    };
  }

  if (args.diff.authorization_recommendations.seed_import === "HOLD") {
    parity_close_blockers.push(
      `seed_import=${args.diff.authorization_recommendations.seed_import}`,
    );
    rationale.push(
      "PROVEN: committed diff authorization_recommendations.seed_import=HOLD — bulk seed import not authorized.",
    );
  }

  const unsafe = args.gap_inventory.filter((row) => row.classification === "unsafe_blocked");
  if (unsafe.length > 0) {
    parity_close_blockers.push(`unsafe_blocked_gap_rows=${unsafe.map((r) => r.filter_slug).join(",")}`);
    rationale.push(
      `PROVEN: ${String(unsafe.length)} gap row(s) blocked on OEM collision until pre-alignment SQL.`,
    );
  }

  const ownerReview = args.gap_inventory.filter(
    (row) => row.classification === "requires_owner_review",
  );
  if (ownerReview.length > 0) {
    parity_close_blockers.push(
      `requires_owner_review_gap_rows=${ownerReview.map((r) => r.filter_slug).join(",")}`,
    );
    rationale.push(
      `PROVEN: ${String(ownerReview.length)} gap row(s) need guarded Supabase apply / net-new filter seed before aggregate parity closes.`,
    );
  }

  const allSafeToApply = args.gap_inventory.every(
    (row) => row.classification === "safe_to_seed_apply_now",
  );
  const seedReady = args.diff.authorization_recommendations.seed_import !== "HOLD";

  if (allSafeToApply && seedReady && args.gap_inventory.length === args.gate_gap_size) {
    rationale.push("INFERRED: all gap rows safe_to_seed_apply_now and seed_import not HOLD.");
    return {
      recommended_path: "CLOSE_PARITY",
      parity_closeable_safely_today: true,
      parity_close_blockers,
      rationale,
    };
  }

  rationale.push(
    "INFERRED: closing parity today requires owner-authorized Supabase mutations not proven safe for unattended apply.",
  );
  return {
    recommended_path: "ACCEPT_TEMPORARY_DIVERGENCE",
    parity_closeable_safely_today: false,
    parity_close_blockers,
    rationale,
  };
}

export async function buildApRepoRuntimeConvergenceAcceptancePlanV1(args: {
  rootDir: string;
  deps?: BuildApRepoRuntimeConvergenceAcceptancePlanDepsV1;
}): Promise<ApRepoRuntimeConvergenceAcceptancePlanV1> {
  const now = args.deps?.now ?? (() => new Date());
  const readCsv = args.deps?.readRetailerLinksCsv ?? defaultReadRetailerLinksCsv;
  const buildDiff =
    args.deps?.buildDiffReport ??
    ((rootDir: string) => buildAirPurifierSupabaseVsCsvDiffV1Report({ rootDir, deps: { now } }));
  const loadSupabase = args.deps?.loadSupabaseSnapshot ?? tryLoadApSupabaseSnapshotV1;

  const gate = await buildRepoRuntimeConvergenceGateReportV1({
    rootDir: args.rootDir,
    enforce: false,
    deps: { now, buildDiffReport: buildDiff },
  });

  let diff: ApSupabaseVsCsvDiffReportV1 | null = null;
  let gap_inventory: ApSafeCtaGapInventoryRowV1[] = [];
  let parity_packet_overlap_note =
    "UNKNOWN: ap-runtime-safe-cta-parity-packet-v1 not compared — gap inventory derived from live primary safe CTA measurement.";

  try {
    diff = await buildDiff(args.rootDir);
    const snap = await loadSupabase();
    if (snap.status !== "CHECKED") {
      throw new Error(snap.reason);
    }
    gap_inventory = buildApSafeCtaGapInventoryV1({
      rootDir: args.rootDir,
      diff,
      supabaseLinks: snap.data.retailerLinks,
      readRetailerLinksCsv: readCsv,
    });

    const paritySlugs = [
      "blueair-f2-211",
      "blueair-particle-411",
      "coway-airmega250-rf",
      "coway-airmega400-rf",
      "gg-flt4100",
      "gg-flt4825",
      "hb-trueair-04384",
      "rabbit-carbon-minusa2",
      "vornado-carbon-pad",
    ];
    const gapSlugs = new Set(gap_inventory.map((row) => row.filter_slug));
    const overlap = paritySlugs.filter((slug) => gapSlugs.has(slug));
    parity_packet_overlap_note =
      overlap.length === 0
        ? `PROVEN: current ${String(gap_inventory.length)}-slug gap inventory does not overlap ap-runtime-safe-cta-parity-packet-v1 delta slugs (blueair-f2-211, blueair-particle-411, coway-airmega250-rf, hb-trueair-04384, rabbit-carbon-minusa2, vornado-carbon-pad). Parity packet SQL alone would not close today's aggregate gate gap.`
        : `PROVEN: overlap slugs=${overlap.join(",")} between parity packet and current gap inventory.`;
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    parity_packet_overlap_note = `UNKNOWN: gap inventory build failed — ${message}`;
  }

  const pathResolution = resolveApRepoRuntimeConvergenceAcceptancePlanPathV1({
    gap_inventory,
    diff,
    gate_gap_size: gate.measurement.gap_size,
  });

  const measured_at = gate.measurement.measured_at ?? now().toISOString();
  const liveCounts =
    gate.measurement.gap_size !== null &&
    gate.measurement.csv_safe_direct_buyable_count !== null &&
    gate.measurement.supabase_safe_direct_buyable_count !== null &&
    gate.measurement.supabase_truth_status === "CHECKED"
      ? {
          csv_safe_direct_buyable_count: gate.measurement.csv_safe_direct_buyable_count,
          supabase_safe_direct_buyable_count: gate.measurement.supabase_safe_direct_buyable_count,
          gap_size: gate.measurement.gap_size,
          measured_at,
          supabase_truth_status: "CHECKED" as const,
        }
      : null;

  const gapSlugList = gap_inventory.map((row) => row.filter_slug).join(", ");
  const proposed_acceptance_artifact =
    pathResolution.recommended_path === "ACCEPT_TEMPORARY_DIVERGENCE" && liveCounts
      ? buildProposedApRepoRuntimeConvergenceAcceptanceV1({
          live: liveCounts,
          accepted_by: "jared",
          accepted_at: now().toISOString(),
          re_review_by: addDaysIso(now().toISOString(), 14),
          reason:
            `Temporary deploy acceptance for repo_runtime_convergence_gate_v1 aggregate AP safe CTA gap (${String(liveCounts.csv_safe_direct_buyable_count)} CSV vs ${String(liveCounts.supabase_safe_direct_buyable_count)} Supabase). ` +
            `Gap slugs: ${gapSlugList}. ` +
            "Close path requires owner-authorized batch work: net-new Blueair Max/Mini filter seed, Honeywell OEM primary promotion, Levoit/Winix OEM pre-alignment + retailer_links parity apply. " +
            "seed_import remains HOLD per ap-supabase-vs-csv-diff-v1.",
        })
      : null;

  return {
    contract: AP_REPO_RUNTIME_CONVERGENCE_ACCEPTANCE_PLAN_CONTRACT_V1,
    read_only: true,
    data_mutation: false,
    mutation_authorized: false,
    supabase_writes: false,
    generated_at: now().toISOString(),
    gate_contract: "repo_runtime_convergence_gate_v1",
    gate_state: gate.state,
    live_measurement: {
      csv_safe_direct_buyable_count: gate.measurement.csv_safe_direct_buyable_count,
      supabase_safe_direct_buyable_count: gate.measurement.supabase_safe_direct_buyable_count,
      gap_size: gate.measurement.gap_size,
      supabase_truth_status: gate.measurement.supabase_truth_status,
      measured_at: gate.measurement.measured_at,
    },
    gap_inventory,
    diff_authorization: diff?.authorization_recommendations ?? null,
    parity_packet_overlap_note,
    parity_closeable_safely_today: pathResolution.parity_closeable_safely_today,
    parity_close_blockers: pathResolution.parity_close_blockers,
    recommended_path: pathResolution.recommended_path,
    recommended_path_rationale: pathResolution.rationale,
    proposed_acceptance_artifact,
    acceptance_artifact_write_path: AP_REPO_RUNTIME_CONVERGENCE_ACCEPTANCE_REL_V1,
    acceptance_artifact_committed: false,
    validation_commands: [
      "npm run buckparts:repo-runtime-convergence:check",
      "npm run buckparts:repo-runtime-convergence:check -- --enforce",
      "npx tsx scripts/report-air-purifier-supabase-vs-csv-diff-v1.ts",
      "npx tsx -e \"import { buildApRepoRuntimeConvergenceAcceptancePlanV1 } from './scripts/lib/ap-repo-runtime-convergence-acceptance-plan-v1.ts'; buildApRepoRuntimeConvergenceAcceptancePlanV1({ rootDir: process.cwd() }).then(p => console.log(JSON.stringify({ recommended_path: p.recommended_path, gap_inventory: p.gap_inventory.map(r=>r.filter_slug) }, null, 2)));\"",
    ],
    proven_facts: [
      `PROVEN: ${AP_REPO_RUNTIME_CONVERGENCE_ACCEPTANCE_PLAN_CONTRACT_V1} is read-only — no acceptance artifact write.`,
      `PROVEN: gate_state=${gate.state}; gap_size=${String(gate.measurement.gap_size)}.`,
      `PROVEN: gap_inventory_count=${String(gap_inventory.length)}.`,
      `PROVEN: recommended_path=${pathResolution.recommended_path}.`,
      parity_packet_overlap_note.startsWith("PROVEN:")
        ? parity_packet_overlap_note
        : `NOTE: ${parity_packet_overlap_note}`,
    ],
    unknown_facts: [
      "UNKNOWN: Whether owner already COMMITted any parity SQL packet since last diff generation.",
      "UNKNOWN: Live customer-visible CTA state per slug without production-truth golden case run.",
    ],
  };
}
