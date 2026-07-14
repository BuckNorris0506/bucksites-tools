/**
 * Guarded CSV↔Supabase retailer_links parity for edr4rxd1 only.
 * Closes buyer-path gaps for whirlpool-wrf540cwhz + whirlpool-wrx735sdhz using existing CSV evidence.
 * Dry-run default. Write requires MUTATION + NEW Supabase-parity founder approval (CSV-only approval blocked).
 */

import { existsSync, readFileSync } from "node:fs";
import path from "node:path";

import {
  applyScopedFridgeRetailerLinksWriteV1,
  assertOnlyAllowedSlugsV1,
  buildScopedFridgeRetailerLinksParityReportV1,
  buildScopedFieldParityV1,
  fridgeRetailerLinksScopedFieldValuesMatchV1,
  loadScopedSupabasePrimariesV1,
  normalizeUtcInstantForParityV1,
  parseScopedFridgeRetailerLinksCliArgsV1,
  planScopedWriteOpsV1,
  selectScopedCsvPrimaryRowsV1,
  writeScopedParityReportArtifactV1,
  type FridgeRetailerLinksScopedLaneConfigV1,
  type FridgeRetailerLinksScopedParityReportV1,
  type FridgeRetailerLinksScopedWriteOpV1,
} from "./fridge-retailer-links-scoped-supabase-parity-core-v1";
import {
  loadFounderDecisionRowsWithSlugCorrelationV1,
} from "./founder-decision-slug-correlation-v1";
import { founderRegistryRowPassesMutationApprovalGateV1 } from "./founder-mutation-approval-gate-v1";
import { resolveIoCapabilityFromEnvV1 } from "./buckparts-supabase-mutation-gate-core-v1";

export const BUCKPARTS_FRIDGE_MODEL_PDP_EDR4_BUYER_PATH_CLOSABLE_PARITY_CONTRACT_V1 =
  "buckparts_fridge_model_pdp_edr4_buyer_path_closable_parity_v1" as const;

export const BUCKPARTS_FRIDGE_MODEL_PDP_EDR4_BUYER_PATH_CLOSABLE_PARITY_CLOSEOUT_CONTRACT_V1 =
  "buckparts_fridge_model_pdp_edr4_buyer_path_closable_parity_closeout_v1" as const;

export const BUCKPARTS_FRIDGE_MODEL_PDP_EDR4_BUYER_PATH_CLOSABLE_PARITY_ALLOWED_FILTER_SLUGS_V1 = [
  "edr4rxd1",
] as const;

export type BuckpartsEdr4BuyerPathClosableParityFilterSlugV1 =
  (typeof BUCKPARTS_FRIDGE_MODEL_PDP_EDR4_BUYER_PATH_CLOSABLE_PARITY_ALLOWED_FILTER_SLUGS_V1)[number];

export const BUCKPARTS_FRIDGE_MODEL_PDP_EDR4_BUYER_PATH_CLOSABLE_PARITY_CONTEXT_MODEL_SLUGS_V1 = [
  "whirlpool-wrf540cwhz",
  "whirlpool-wrx735sdhz",
] as const;

export const BUCKPARTS_FRIDGE_MODEL_PDP_EDR4_BUYER_PATH_CLOSABLE_PARITY_EVIDENCE_RELS_V1 = [
  "data/fridge/batch-production/drafts/fridge-safe-link-owner-browser-proof-result-edr4rxd1-v1.json",
  "data/fridge/batch-production/drafts/manufacturer-safe-link-rescue-apply-plan-edr4rxd1-v1.json",
  "data/fridge/batch-production/drafts/buckparts-fridge-model-pdp-buyer-path-gap-plan-v1.json",
] as const;

/** Existing approval authorizes CSV manufacturer-rescue only — never this Supabase parity write. */
export const BUCKPARTS_FRIDGE_MODEL_PDP_EDR4_BUYER_PATH_CLOSABLE_PARITY_CSV_ONLY_APPROVAL_DECISION_ID_V1 =
  "decision-2026-06-10-edr4rxd1-approve_csv_manufacturer_rescue_apply" as const;

export const BUCKPARTS_FRIDGE_MODEL_PDP_EDR4_BUYER_PATH_CLOSABLE_PARITY_REQUIRED_SUPABASE_APPROVAL_PACKET_ID_V1 =
  "buckparts_fridge_model_pdp_edr4_buyer_path_closable_parity_owner_review_v1" as const;

export const BUCKPARTS_FRIDGE_MODEL_PDP_EDR4_BUYER_PATH_CLOSABLE_PARITY_DRY_RUN_COMMAND_V1 =
  "npm run buckparts:fridge-model-pdp-edr4-buyer-path-closable-parity -- --write-artifacts" as const;

export const BUCKPARTS_FRIDGE_MODEL_PDP_EDR4_BUYER_PATH_CLOSABLE_PARITY_WRITE_COMMAND_V1 =
  "BUCKPARTS_IO_CAPABILITY=MUTATION npm run buckparts:fridge-model-pdp-edr4-buyer-path-closable-parity -- --write" as const;

export const BUCKPARTS_FRIDGE_MODEL_PDP_EDR4_BUYER_PATH_CLOSABLE_PARITY_LANE_V1: FridgeRetailerLinksScopedLaneConfigV1<BuckpartsEdr4BuyerPathClosableParityFilterSlugV1> =
  {
    contract: BUCKPARTS_FRIDGE_MODEL_PDP_EDR4_BUYER_PATH_CLOSABLE_PARITY_CONTRACT_V1,
    closeout_contract:
      BUCKPARTS_FRIDGE_MODEL_PDP_EDR4_BUYER_PATH_CLOSABLE_PARITY_CLOSEOUT_CONTRACT_V1,
    allowed_slugs: BUCKPARTS_FRIDGE_MODEL_PDP_EDR4_BUYER_PATH_CLOSABLE_PARITY_ALLOWED_FILTER_SLUGS_V1,
    report_artifact_rel:
      "data/fridge/batch-production/drafts/buckparts-fridge-model-pdp-edr4-buyer-path-closable-parity-v1.json",
    closeout_artifact_rel:
      "data/fridge/batch-production/closeout/buckparts-fridge-model-pdp-edr4-buyer-path-closable-parity-closeout-v1.json",
    dry_run_command: BUCKPARTS_FRIDGE_MODEL_PDP_EDR4_BUYER_PATH_CLOSABLE_PARITY_DRY_RUN_COMMAND_V1,
    write_command: BUCKPARTS_FRIDGE_MODEL_PDP_EDR4_BUYER_PATH_CLOSABLE_PARITY_WRITE_COMMAND_V1,
    allowlist_proven_fact:
      "PROVEN: lane allowlist is exactly edr4rxd1 (closes whirlpool-wrf540cwhz + whirlpool-wrx735sdhz).",
    max_planned_rows: 1,
  };

export type BuckpartsEdr4BuyerPathClosableParityReportV1 =
  FridgeRetailerLinksScopedParityReportV1<BuckpartsEdr4BuyerPathClosableParityFilterSlugV1> & {
    context_model_slugs: typeof BUCKPARTS_FRIDGE_MODEL_PDP_EDR4_BUYER_PATH_CLOSABLE_PARITY_CONTEXT_MODEL_SLUGS_V1;
    invent_link_authorized: false;
    csv_only_approval_blocked: boolean;
    supabase_parity_founder_approval_present: boolean;
  };

export {
  normalizeUtcInstantForParityV1,
  fridgeRetailerLinksScopedFieldValuesMatchV1 as edr4BuyerPathClosableParityFieldValuesMatchV1,
};

export function assertOnlyEdr4BuyerPathClosableParitySlugV1(slugs: readonly string[]): {
  ok: boolean;
  blockers: string[];
} {
  return assertOnlyAllowedSlugsV1(BUCKPARTS_FRIDGE_MODEL_PDP_EDR4_BUYER_PATH_CLOSABLE_PARITY_LANE_V1, slugs);
}

export function selectEdr4BuyerPathClosableParityCsvPrimaryRowsV1(args: {
  rootDir: string;
  readText?: (abs: string) => string;
}) {
  return selectScopedCsvPrimaryRowsV1({
    lane: BUCKPARTS_FRIDGE_MODEL_PDP_EDR4_BUYER_PATH_CLOSABLE_PARITY_LANE_V1,
    ...args,
  });
}

function evaluateSupabaseParityFounderApprovalV1(args: {
  rootDir: string;
  nowIso: string;
  readText?: (abs: string) => string;
}): {
  supabase_parity_founder_approval_present: boolean;
  csv_only_approval_seen: boolean;
  blockers: string[];
  decision_ids: string[];
} {
  const loaded = loadFounderDecisionRowsWithSlugCorrelationV1(args.rootDir);
  const blockers: string[] = [];
  const decision_ids: string[] = [];
  let csv_only_approval_seen = false;
  let supabase_parity_founder_approval_present = false;

  const csvOnlyApprovalRel =
    "data/owner-decisions/fridge-safe-link-edr4rxd1-owner-approval-v1.json";
  if (existsSync(path.join(args.rootDir, csvOnlyApprovalRel))) {
    try {
      const raw = JSON.parse(
        (args.readText ?? ((abs: string) => readFileSync(abs, "utf8")))(
          path.join(args.rootDir, csvOnlyApprovalRel),
        ),
      ) as { rows?: Array<{ decision_id?: string }> };
      if (
        (raw.rows ?? []).some(
          (r) =>
            r.decision_id ===
            BUCKPARTS_FRIDGE_MODEL_PDP_EDR4_BUYER_PATH_CLOSABLE_PARITY_CSV_ONLY_APPROVAL_DECISION_ID_V1,
        )
      ) {
        csv_only_approval_seen = true;
      }
    } catch {
      // Prefer UNKNOWN over inventing approval presence.
    }
  }

  for (const entry of loaded) {
    if (
      entry.row.decision_id ===
      BUCKPARTS_FRIDGE_MODEL_PDP_EDR4_BUYER_PATH_CLOSABLE_PARITY_CSV_ONLY_APPROVAL_DECISION_ID_V1
    ) {
      csv_only_approval_seen = true;
      continue;
    }
    if (entry.row.decision_status !== "approved") continue;
    if (entry.row.allowed_next_scope !== "owner_mutation_approved") continue;
    const gate = founderRegistryRowPassesMutationApprovalGateV1({
      row: entry.row,
      referenceTimeIso: args.nowIso,
      rootDir: args.rootDir,
      readText: args.readText,
    });
    if (!gate.ok) continue;
    const packetId = String(entry.row.source_decision_packet_id ?? "");
    if (
      packetId ===
      BUCKPARTS_FRIDGE_MODEL_PDP_EDR4_BUYER_PATH_CLOSABLE_PARITY_REQUIRED_SUPABASE_APPROVAL_PACKET_ID_V1
    ) {
      supabase_parity_founder_approval_present = true;
      decision_ids.push(entry.row.decision_id);
    }
  }

  // Always document CSV-only approval as non-authorizing for this lane (exists in repo as standing policy).
  blockers.push(
    `csv_only_founder_approval_does_not_authorize_supabase_parity:${BUCKPARTS_FRIDGE_MODEL_PDP_EDR4_BUYER_PATH_CLOSABLE_PARITY_CSV_ONLY_APPROVAL_DECISION_ID_V1}`,
  );
  if (!supabase_parity_founder_approval_present) {
    blockers.push(
      `founder_supabase_parity_approval_missing_for_lane:${BUCKPARTS_FRIDGE_MODEL_PDP_EDR4_BUYER_PATH_CLOSABLE_PARITY_REQUIRED_SUPABASE_APPROVAL_PACKET_ID_V1}`,
    );
  }
  return {
    supabase_parity_founder_approval_present,
    csv_only_approval_seen,
    blockers,
    decision_ids,
  };
}

export function assertEdr4BuyerPathClosableParityEvidencePresentV1(rootDir: string): {
  ok: boolean;
  blockers: string[];
} {
  const blockers: string[] = [];
  for (const rel of BUCKPARTS_FRIDGE_MODEL_PDP_EDR4_BUYER_PATH_CLOSABLE_PARITY_EVIDENCE_RELS_V1) {
    if (!existsSync(path.join(rootDir, rel))) {
      blockers.push(`missing_evidence:${rel}`);
    }
  }
  return { ok: blockers.length === 0, blockers };
}

export async function buildEdr4BuyerPathClosableParityReportV1(args: {
  rootDir: string;
  mode?: "dry_run" | "write";
  now?: () => Date;
  readText?: (abs: string) => string;
  loadSupabase?: typeof loadScopedSupabasePrimariesV1<BuckpartsEdr4BuyerPathClosableParityFilterSlugV1>;
}): Promise<BuckpartsEdr4BuyerPathClosableParityReportV1> {
  const now = args.now ?? (() => new Date());
  const mode = args.mode ?? "dry_run";
  const base = await buildScopedFridgeRetailerLinksParityReportV1({
    lane: BUCKPARTS_FRIDGE_MODEL_PDP_EDR4_BUYER_PATH_CLOSABLE_PARITY_LANE_V1,
    rootDir: args.rootDir,
    mode,
    now,
    readText: args.readText,
    loadSupabase: args.loadSupabase,
  });

  const evidence = assertEdr4BuyerPathClosableParityEvidencePresentV1(args.rootDir);
  const founder = evaluateSupabaseParityFounderApprovalV1({
    rootDir: args.rootDir,
    nowIso: now().toISOString(),
    readText: args.readText,
  });
  const io = resolveIoCapabilityFromEnvV1();

  const blockers = [...base.blockers, ...evidence.blockers];

  // Reinforced lane gate: soft core acceptance of CSV-only approval is never enough for Supabase write.
  if (mode === "write") {
    blockers.push(...founder.blockers);
    if (io !== "MUTATION") {
      blockers.push("io_capability_read_index_cannot_mutate_supabase");
    }
    if (base.row_count_planned === 0) {
      blockers.push("no_parity_gap_to_apply");
    }
    if (
      base.rows.some(
        (r) => r.status === "SUPABASE_FILTER_MISSING" || r.status === "CSV_PRIMARY_MISSING",
      )
    ) {
      blockers.push("cannot_write_with_missing_filter_or_csv_primary");
    }
  }

  const uniqueBlockers = Array.from(new Set(blockers));

  // Fail closed: write requires MUTATION + NEW supabase-parity packet approval + structural readiness.
  // CSV-only manufacturer-rescue approval never counts (see evaluateSupabaseParityFounderApprovalV1).
  const mutation_authorized =
    mode === "write" &&
    io === "MUTATION" &&
    evidence.ok &&
    founder.supabase_parity_founder_approval_present &&
    base.supabase_truth_status === "CHECKED" &&
    base.row_count_planned > 0 &&
    !base.rows.some(
      (r) => r.status === "SUPABASE_FILTER_MISSING" || r.status === "CSV_PRIMARY_MISSING",
    );

  // When write is authorized, do not keep policy/soft blocker strings that contradict authorization.
  // CSV-only non-authority remains proven via csv_only_approval_blocked + proven_facts.
  const reportBlockers = mutation_authorized ? [] : uniqueBlockers;

  return {
    ...base,
    mutation_authorized,
    blockers: reportBlockers,
    context_model_slugs: BUCKPARTS_FRIDGE_MODEL_PDP_EDR4_BUYER_PATH_CLOSABLE_PARITY_CONTEXT_MODEL_SLUGS_V1,
    invent_link_authorized: false,
    csv_only_approval_blocked: founder.csv_only_approval_seen,
    supabase_parity_founder_approval_present: founder.supabase_parity_founder_approval_present,
    proven_facts: [
      ...base.proven_facts,
      "PROVEN: invent_link_authorized=false; existing CSV evidence only.",
      "PROVEN: context models exactly whirlpool-wrf540cwhz + whirlpool-wrx735sdhz.",
      "PROVEN: CSV-only manufacturer-rescue approval does not authorize this Supabase parity write.",
      ...(mutation_authorized
        ? [
            "PROVEN: write-mode mutation_authorized=true; blockers cleared (policy notes retained outside blockers).",
          ]
        : []),
    ],
    recommended_next_action:
      mode === "dry_run"
        ? base.recommended_next_action
        : mutation_authorized
          ? "Lane write authorized — executor may apply planned edr4rxd1 retailer_links primary only."
          : "WRITE BLOCKED: need MUTATION env + new Supabase-parity founder approval for this lane (CSV-only approval insufficient).",
  };
}

export function planEdr4BuyerPathClosableParityWriteOpsV1(
  report: FridgeRetailerLinksScopedParityReportV1<BuckpartsEdr4BuyerPathClosableParityFilterSlugV1>,
): FridgeRetailerLinksScopedWriteOpV1<BuckpartsEdr4BuyerPathClosableParityFilterSlugV1>[] {
  const ops = planScopedWriteOpsV1(BUCKPARTS_FRIDGE_MODEL_PDP_EDR4_BUYER_PATH_CLOSABLE_PARITY_LANE_V1, report);
  if (ops.some((o) => o.filter_slug !== "edr4rxd1")) {
    throw new Error("EDR4 closable parity write ops leaked non-edr4rxd1 slugs");
  }
  if (ops.length > 1) {
    throw new Error(`EDR4 closable parity expects at most 1 write op, got ${String(ops.length)}`);
  }
  return ops;
}

export async function applyEdr4BuyerPathClosableParityWriteV1(args: {
  rootDir: string;
  report: BuckpartsEdr4BuyerPathClosableParityReportV1;
  now?: () => Date;
}) {
  if (!args.report.mutation_authorized) {
    throw new Error("EDR4_BUYER_PATH_CLOSABLE_PARITY_MUTATION_NOT_AUTHORIZED");
  }
  if (args.report.invent_link_authorized !== false) {
    throw new Error("EDR4_BUYER_PATH_CLOSABLE_PARITY_INVENT_LINK_MUST_BE_FALSE");
  }
  return applyScopedFridgeRetailerLinksWriteV1({
    lane: BUCKPARTS_FRIDGE_MODEL_PDP_EDR4_BUYER_PATH_CLOSABLE_PARITY_LANE_V1,
    rootDir: args.rootDir,
    report: args.report,
    now: args.now,
  });
}

export function parseEdr4BuyerPathClosableParityCliArgsV1(argv: readonly string[]): {
  write: boolean;
  writeArtifacts: boolean;
} {
  const base = parseScopedFridgeRetailerLinksCliArgsV1(argv);
  return {
    write: base.write,
    writeArtifacts: argv.includes("--write-artifacts") || !base.write,
  };
}

export function writeEdr4BuyerPathClosableParityReportArtifactV1(args: {
  rootDir: string;
  report: BuckpartsEdr4BuyerPathClosableParityReportV1;
}): string {
  return writeScopedParityReportArtifactV1({
    lane: BUCKPARTS_FRIDGE_MODEL_PDP_EDR4_BUYER_PATH_CLOSABLE_PARITY_LANE_V1,
    rootDir: args.rootDir,
    report: args.report,
  });
}

export function readEdr4CsvPrimaryUrlFromRepoV1(rootDir: string): string | null {
  const abs = path.join(rootDir, "data/retailer_links.csv");
  if (!existsSync(abs)) return null;
  const rows = selectEdr4BuyerPathClosableParityCsvPrimaryRowsV1({
    rootDir,
    readText: (p) => readFileSync(p, "utf8"),
  });
  return rows[0]?.affiliate_url ?? null;
}

export { buildScopedFieldParityV1, loadScopedSupabasePrimariesV1 };
