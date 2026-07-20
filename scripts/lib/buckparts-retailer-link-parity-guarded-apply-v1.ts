/**
 * Phase 3 — Guarded UPDATE-only apply for retailer-link parity correction plans.
 * Clone of GE gate sequence, generalized through approved plan. Dry-run default.
 * Not dispatch-allowlisted. No insert/delete/upsert/CSV/public guidance writes.
 */

import { createHash } from "node:crypto";
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";

import {
  assertSupabaseMutationAuthorizedV1,
  buildSupabaseMutationGatePreflightV1,
  resolveIoCapabilityFromEnvV1,
} from "./buckparts-supabase-mutation-gate-core-v1";
import type { BuckpartsIoCapabilityV1 } from "./buckparts-io-capabilities-v1";
import {
  BUCKPARTS_RETAILER_LINK_PARITY_CORRECTION_PLAN_CONTRACT_V1,
  BUCKPARTS_RETAILER_LINK_PARITY_TABLE_V1,
  BUCKPARTS_RETAILER_LINK_PARITY_WEDGE_V1,
  BUCKPARTS_RETAILER_LINK_PARITY_APPLY_MAX_ROWS_V1,
  hashRetailerLinkParityCorrectionPlanV1,
  validateRetailerLinkParityCorrectionPlanSemanticsV1,
  type BuckpartsRetailerLinkParityCorrectionPlanV1,
  type BuckpartsRetailerLinkParityPlanRowSnapshotV1,
} from "./buckparts-retailer-link-parity-correction-plan-v1";

export const BUCKPARTS_RETAILER_LINK_PARITY_GUARDED_APPLY_CONTRACT_V1 =
  "buckparts_retailer_link_parity_guarded_apply_v1" as const;

export const BUCKPARTS_RETAILER_LINK_PARITY_OWNER_APPROVAL_JSON_REL_V1 =
  "data/owner-decisions/buckparts-retailer-link-parity-correction-owner-approval-v1.json" as const;

export const BUCKPARTS_RETAILER_LINK_PARITY_GUARDED_APPLY_WRITE_COMMAND_V1 =
  "BUCKPARTS_IO_CAPABILITY=MUTATION npx tsx scripts/lib/buckparts-retailer-link-parity-guarded-apply-v1.ts --write --plan-file <plan.json>" as const;

type ApprovalRowV1 = {
  decision_id?: string;
  decision_status?: string;
  allowed_next_scope?: string;
  expires_at?: string;
  review_after?: string | null;
  issued_at?: string;
  approved_at?: string;
  bound_artifacts_v1?: Array<{
    artifact_rel_path?: string;
    sha256_at_binding?: string;
    entry_type?: string;
  }>;
  buckparts_retailer_link_parity_correction_owner_approval_context_v1?: {
    plan_sha256?: string;
    approved_table?: string;
    approved_wedge?: string;
    approved_updates?: number;
    approved_inserts?: number;
    approved_deletes?: number;
    operation?: string;
  };
};

export type BuckpartsRetailerLinkParityGuardedApplyReportV1 = {
  contract: typeof BUCKPARTS_RETAILER_LINK_PARITY_GUARDED_APPLY_CONTRACT_V1;
  read_only: boolean;
  data_mutation: false;
  mode: "dry_run" | "write";
  mutation_authorized: boolean;
  supabase_mutation_authorized: boolean;
  csv_mutation_authorized: false;
  plan_sha256: string;
  founder_approval_present: boolean;
  founder_decision_id: string | null;
  row_count_planned: number;
  planned_updates: number;
  planned_inserts: 0;
  planned_deletes: 0;
  blockers: string[];
  recommended_next_action: string;
  proven_facts: string[];
  unknown_facts: string[];
};

export type BuckpartsRetailerLinkParityLiveRowV1 = BuckpartsRetailerLinkParityPlanRowSnapshotV1;

function sha256Text(text: string): string {
  return createHash("sha256").update(text).digest("hex");
}

function isValidIsoTimestampV1(value: string): boolean {
  return /^\d{4}-\d{2}-\d{2}T/.test(value) && !Number.isNaN(Date.parse(value));
}

function loadApprovalDocV1(
  rootDir: string,
  readText: (abs: string) => string,
): { ok: boolean; row: ApprovalRowV1 | null; blockers: string[] } {
  const rel = BUCKPARTS_RETAILER_LINK_PARITY_OWNER_APPROVAL_JSON_REL_V1;
  const abs = path.join(rootDir, rel);
  if (!existsSync(abs)) {
    return { ok: false, row: null, blockers: [`founder_approval_missing:${rel}`] };
  }
  try {
    const doc = JSON.parse(readText(abs)) as { rows?: ApprovalRowV1[] };
    const row = doc.rows?.[0] ?? null;
    if (!row) {
      return { ok: false, row: null, blockers: ["founder_approval_decision_id_missing"] };
    }
    return { ok: true, row, blockers: [] };
  } catch (err) {
    return {
      ok: false,
      row: null,
      blockers: [`founder_approval_unreadable:${err instanceof Error ? err.message : String(err)}`],
    };
  }
}

export function verifyApprovalV1(args: {
  row: ApprovalRowV1;
  plan: BuckpartsRetailerLinkParityCorrectionPlanV1;
  rootDir: string;
  nowIso: string;
  readText: (abs: string) => string;
}): { ok: boolean; blockers: string[] } {
  const blockers: string[] = [];
  if (!String(args.row.decision_id ?? "").trim()) {
    blockers.push("founder_approval_decision_id_missing");
  }
  if (args.row.decision_status !== "approved") {
    blockers.push(`founder_approval_not_approved:${String(args.row.decision_status)}`);
  }
  if (args.row.allowed_next_scope !== "owner_mutation_approved") {
    blockers.push(`founder_approval_scope_mismatch:${String(args.row.allowed_next_scope)}`);
  }
  const now = Date.parse(args.nowIso);
  const expiresText = String(args.row.expires_at ?? "");
  const exp = Date.parse(expiresText);
  if (!expiresText.trim() || !isValidIsoTimestampV1(expiresText)) {
    blockers.push("founder_approval_expires_at_malformed");
  } else if (Number.isNaN(now) || now >= exp) {
    blockers.push("founder_approval_expired_or_unbounded");
  }
  if (args.row.review_after != null && String(args.row.review_after).trim()) {
    const rev = Date.parse(String(args.row.review_after));
    if (!isValidIsoTimestampV1(String(args.row.review_after))) blockers.push("founder_approval_review_after_malformed");
    else if (now >= rev) blockers.push("founder_approval_past_review_after");
  }
  for (const field of ["issued_at", "approved_at"] as const) {
    const value = args.row[field];
    if (value != null && (!String(value).trim() || !isValidIsoTimestampV1(String(value)))) {
      blockers.push(`founder_approval_${field}_malformed`);
    }
  }

  const ctx = args.row.buckparts_retailer_link_parity_correction_owner_approval_context_v1;
  if (!ctx) {
    blockers.push("founder_approval_context_missing");
  } else {
    if (ctx.plan_sha256 !== args.plan.plan_sha256) {
      blockers.push("founder_approval_plan_sha256_mismatch");
    }
    if (ctx.approved_table !== BUCKPARTS_RETAILER_LINK_PARITY_TABLE_V1) {
      blockers.push(`founder_approval_table_mismatch:${String(ctx.approved_table)}`);
    }
    if (ctx.approved_wedge !== BUCKPARTS_RETAILER_LINK_PARITY_WEDGE_V1) {
      blockers.push(`founder_approval_wedge_mismatch:${String(ctx.approved_wedge)}`);
    }
    if (ctx.operation !== "UPDATE") {
      blockers.push(`founder_approval_operation_mismatch:${String(ctx.operation)}`);
    }
    if (ctx.approved_updates !== args.plan.row_count) {
      blockers.push(
        `founder_approval_row_count_mismatch:approved=${String(ctx.approved_updates)} plan=${String(args.plan.row_count)}`,
      );
    }
    if ((ctx.approved_inserts ?? 0) !== 0 || (ctx.approved_deletes ?? 0) !== 0) {
      blockers.push("founder_approval_insert_or_delete_not_zero");
    }
  }

  const bound = args.row.bound_artifacts_v1 ?? [];
  if (bound.length < 1) blockers.push("founder_approval_unbound_artifacts_v1");
  for (const [i, b] of bound.entries()) {
    const rel = String(b.artifact_rel_path ?? "").trim();
    const sha = String(b.sha256_at_binding ?? "").trim().toLowerCase();
    if (!rel || !/^[a-f0-9]{64}$/.test(sha)) {
      blockers.push(`founder_approval_binding_malformed:${String(i)}`);
      continue;
    }
    const abs = path.join(args.rootDir, rel);
    if (!existsSync(abs)) {
      blockers.push(`founder_approval_bound_missing:${rel}`);
      continue;
    }
    const live = sha256Text(args.readText(abs));
    if (live !== sha) blockers.push(`founder_approval_bound_sha256_mismatch:${rel}`);
  }

  return { ok: blockers.length === 0, blockers };
}

function liveEqualsExpected(
  live: BuckpartsRetailerLinkParityLiveRowV1,
  expected: BuckpartsRetailerLinkParityPlanRowSnapshotV1,
): string[] {
  const blockers: string[] = [];
  if (live.supabase_link_id !== expected.supabase_link_id) {
    blockers.push(`live_current_value_drift:${expected.filter_slug}:supabase_link_id`);
  }
  if (live.filter_slug !== expected.filter_slug) {
    blockers.push(`live_filter_slug_drift:${expected.filter_slug}`);
  }
  if (live.filter_id !== expected.filter_id) {
    blockers.push(`live_filter_id_drift:${expected.filter_slug}`);
  }
  if (live.affiliate_url !== expected.affiliate_url) {
    blockers.push(`live_current_value_drift:${expected.filter_slug}:affiliate_url`);
  }
  for (const field of [
    "retailer_key",
    "retailer_name",
    "browser_truth_classification",
    "is_primary",
  ] as const) {
    if (live[field] !== expected[field]) {
      blockers.push(`live_current_value_drift:${expected.filter_slug}:${field}`);
    }
  }
  return blockers;
}

export async function buildRetailerLinkParityGuardedApplyReportV1(args: {
  rootDir: string;
  plan: BuckpartsRetailerLinkParityCorrectionPlanV1;
  mode?: "dry_run" | "write";
  now?: () => Date;
  ioCapability?: BuckpartsIoCapabilityV1;
  readText?: (abs: string) => string;
  loadLiveRows?: (args: {
    link_ids: string[];
  }) => Promise<
    | { status: "CHECKED"; by_link_id: Map<string, BuckpartsRetailerLinkParityLiveRowV1> }
    | { status: "UNKNOWN_DB_UNAVAILABLE"; reason: string }
  >;
}): Promise<BuckpartsRetailerLinkParityGuardedApplyReportV1> {
  const mode = args.mode ?? "dry_run";
  const nowIso = (args.now ?? (() => new Date()))().toISOString();
  const readText = args.readText ?? ((p) => readFileSync(p, "utf8"));
  const blockers: string[] = [];
  const unknown_facts: string[] = [];
  const proven_facts: string[] = [];

  if (args.plan.contract !== BUCKPARTS_RETAILER_LINK_PARITY_CORRECTION_PLAN_CONTRACT_V1) {
    blockers.push("plan_schema_invalid:contract");
  }
  blockers.push(...validateRetailerLinkParityCorrectionPlanSemanticsV1(args.plan).blockers);
  const recomputed = hashRetailerLinkParityCorrectionPlanV1(args.plan);
  if (recomputed !== args.plan.plan_sha256) {
    blockers.push("plan_sha256_recompute_mismatch");
  }
  if (args.plan.operation !== "UPDATE") blockers.push("plan_operation_not_update");
  if (args.plan.apply_model !== "single_row_apply_v1") blockers.push("plan_apply_model_invalid");
  if (args.plan.insert_posture !== "forbidden" || args.plan.delete_posture !== "forbidden") {
    blockers.push("plan_insert_or_delete_not_forbidden");
  }
  if (args.plan.table !== BUCKPARTS_RETAILER_LINK_PARITY_TABLE_V1) {
    blockers.push(`plan_table_mismatch:${args.plan.table}`);
  }
  if (args.plan.wedge !== BUCKPARTS_RETAILER_LINK_PARITY_WEDGE_V1) {
    blockers.push(`plan_wedge_mismatch:${args.plan.wedge}`);
  }
  if (args.plan.row_count !== args.plan.rows.length) {
    blockers.push("plan_row_count_internal_mismatch");
  }
  if (args.plan.row_count === 0) blockers.push("plan_zero_rows");
  if (args.plan.row_count > BUCKPARTS_RETAILER_LINK_PARITY_APPLY_MAX_ROWS_V1) {
    blockers.push(`single_row_apply_v1_max_exceeded:${args.plan.row_count}`);
  }
  if (args.plan.blockers.length > 0) blockers.push("plan_has_blockers");

  const ids = new Set<string>();
  for (const r of args.plan.rows) {
    if (r.operation !== "UPDATE") blockers.push(`row_operation_not_update:${r.issue_id}`);
    if (ids.has(r.expected_current.supabase_link_id)) {
      blockers.push(`duplicate_row:${r.expected_current.supabase_link_id}`);
    }
    ids.add(r.expected_current.supabase_link_id);
  }

  const approval = loadApprovalDocV1(args.rootDir, readText);
  blockers.push(...approval.blockers);
  let founder_decision_id: string | null = null;
  if (approval.row) {
    founder_decision_id = String(approval.row.decision_id ?? "") || null;
    const v = verifyApprovalV1({
      row: approval.row,
      plan: args.plan,
      rootDir: args.rootDir,
      nowIso,
      readText,
    });
    blockers.push(...v.blockers);
    if (v.ok) proven_facts.push("PROVEN: founder approval bindings and expiry gate passed.");
  }

  const loadLive =
    args.loadLiveRows ??
    (async () =>
      ({
        status: "UNKNOWN_DB_UNAVAILABLE" as const,
        reason: "live_row_loader_not_injected",
      }) as const);

  const live = await loadLive({
    link_ids: args.plan.rows.map((r) => r.expected_current.supabase_link_id),
  });
  if (live.status === "UNKNOWN_DB_UNAVAILABLE") {
    blockers.push(`supabase_unavailable:${live.reason}`);
    unknown_facts.push("UNKNOWN: live Supabase row state unavailable.");
  } else {
    for (const r of args.plan.rows) {
      const row = live.by_link_id.get(r.expected_current.supabase_link_id);
      if (!row) {
        blockers.push(`missing_live_row:${r.expected_current.supabase_link_id}`);
        continue;
      }
      blockers.push(...liveEqualsExpected(row, r.expected_current));
      const unexpectedKeys = Object.keys(row).filter(
        (k) =>
          !(
            [
              "filter_slug",
              "filter_id",
              "supabase_link_id",
              "affiliate_url",
              "retailer_key",
              "retailer_name",
              "browser_truth_classification",
              "is_primary",
            ] as string[]
          ).includes(k),
      );
      if (unexpectedKeys.length > 0) {
        blockers.push(`unexpected_field:${r.filter_slug}:${unexpectedKeys.sort().join(",")}`);
      }
    }
  }

  const io =
    args.ioCapability ??
    (mode === "write" ? resolveIoCapabilityFromEnvV1() : ("READ_INDEX" as BuckpartsIoCapabilityV1));
  if (mode === "write") {
    const preflight = buildSupabaseMutationGatePreflightV1({
      mode: "write",
      io_capability: io,
    });
    if (!preflight.mutation_authorized) {
      for (const b of preflight.blockers) blockers.push(b);
    }
  } else if (io === "MUTATION" && mode === "dry_run") {
    // dry-run never authorizes mutation
  }

  const uniqueBlockers = [...new Set(blockers)].sort();
  const mutation_authorized =
    mode === "write" &&
    uniqueBlockers.length === 0 &&
    io === "MUTATION" &&
    approval.ok &&
    live.status === "CHECKED";

  return {
    contract: BUCKPARTS_RETAILER_LINK_PARITY_GUARDED_APPLY_CONTRACT_V1,
    read_only: mode !== "write" || !mutation_authorized,
    data_mutation: false,
    mode,
    mutation_authorized,
    supabase_mutation_authorized: mutation_authorized,
    csv_mutation_authorized: false,
    plan_sha256: args.plan.plan_sha256,
    founder_approval_present: approval.ok,
    founder_decision_id,
    row_count_planned: args.plan.row_count,
    planned_updates: args.plan.row_count,
    planned_inserts: 0,
    planned_deletes: 0,
    blockers: uniqueBlockers,
    proven_facts,
    unknown_facts,
    recommended_next_action: mutation_authorized
      ? "Authorized for UPDATE-only apply of exact planned rows."
      : "Refuse apply; clear blockers and obtain matching founder approval.",
  };
}

export async function applyRetailerLinkParityGuardedWriteV1(args: {
  rootDir: string;
  plan: BuckpartsRetailerLinkParityCorrectionPlanV1;
  report: BuckpartsRetailerLinkParityGuardedApplyReportV1;
  now?: () => Date;
  ioCapability?: BuckpartsIoCapabilityV1;
  readText?: (abs: string) => string;
  loadLiveRows: (args: {
    link_ids: string[];
  }) => Promise<
    | { status: "CHECKED"; by_link_id: Map<string, BuckpartsRetailerLinkParityLiveRowV1> }
    | { status: "UNKNOWN_DB_UNAVAILABLE"; reason: string }
  >;
  loadEnv?: () => void;
  getSupabaseAdmin?: () => {
    from: (table: string) => {
      update: (
        payload: Record<string, unknown>,
        opts?: { count?: "exact" },
      ) => {
        eq: (col: string, val: string) => {
          eq: (col2: string, val2: string | boolean) => {
            eq: (
              col3: string,
              val3: string | boolean,
            ) => Promise<{ error: { message: string } | null; count: number | null }>;
          };
        };
      };
    };
  };
}): Promise<{
  apply_status: "APPLIED";
  rows_updated: number;
  inserts: 0;
  deletes: 0;
  updated_link_ids: string[];
}> {
  // Never trust a previously built report as a write capability. Re-run every
  // binding and live-state gate against this exact plan at the write boundary.
  if (
    args.report.plan_sha256 !== args.plan.plan_sha256 ||
    args.report.plan_sha256 !== hashRetailerLinkParityCorrectionPlanV1(args.plan)
  ) {
    throw new Error("RETAILER_LINK_PARITY_REPORT_PLAN_SHA256_MISMATCH");
  }
  const semantics = validateRetailerLinkParityCorrectionPlanSemanticsV1(args.plan);
  if (!semantics.ok) {
    throw new Error(`RETAILER_LINK_PARITY_PLAN_SEMANTICS_INVALID:${semantics.blockers.join(",")}`);
  }
  const boundary = await buildRetailerLinkParityGuardedApplyReportV1({
    rootDir: args.rootDir,
    plan: args.plan,
    mode: "write",
    now: args.now,
    ioCapability: args.ioCapability ?? resolveIoCapabilityFromEnvV1(),
    readText: args.readText,
    loadLiveRows: args.loadLiveRows,
  });
  if (!boundary.mutation_authorized) {
    throw new Error(`RETAILER_LINK_PARITY_MUTATION_NOT_AUTHORIZED:${boundary.blockers.join(",")}`);
  }
  if (args.plan.row_count > BUCKPARTS_RETAILER_LINK_PARITY_APPLY_MAX_ROWS_V1) {
    throw new Error("RETAILER_LINK_PARITY_SINGLE_ROW_APPLY_V1_MAX_EXCEEDED");
  }

  const loadEnv = args.loadEnv ?? (await import("./load-env")).loadEnv;
  const getSupabaseAdmin =
    args.getSupabaseAdmin ?? (await import("./supabase-admin")).getSupabaseAdmin;
  loadEnv();
  const supabase = getSupabaseAdmin();

  const updated_link_ids: string[] = [];
  for (const r of args.plan.rows) {
    const payload = {
      affiliate_url: r.approved_after.affiliate_url,
      retailer_key: r.approved_after.retailer_key,
      retailer_name: r.approved_after.retailer_name,
      browser_truth_classification: r.approved_after.browser_truth_classification,
      is_primary: r.approved_after.is_primary,
    };
    const { error, count } = await supabase
      .from("retailer_links")
      .update(payload, { count: "exact" })
      .eq("id", r.expected_current.supabase_link_id)
      .eq("filter_id", r.expected_current.filter_id)
      .eq("is_primary", r.expected_current.is_primary);
    if (error) throw new Error(error.message);
    if (typeof count !== "number" || count !== 1) {
      throw new Error(
        `Expected exactly 1 updated row for ${r.filter_slug}, got ${String(count)}`,
      );
    }
    updated_link_ids.push(r.expected_current.supabase_link_id);
  }

  return {
    apply_status: "APPLIED",
    rows_updated: updated_link_ids.length,
    inserts: 0,
    deletes: 0,
    updated_link_ids,
  };
}

async function main(): Promise<void> {
  const argv = process.argv.slice(2);
  const wantsWrite = argv.includes("--write");
  const planArgIndex = argv.indexOf("--plan-file");
  const planFile = planArgIndex >= 0 ? argv[planArgIndex + 1] : undefined;
  if (!wantsWrite) {
    process.stdout.write(
      `${JSON.stringify({
        contract: BUCKPARTS_RETAILER_LINK_PARITY_GUARDED_APPLY_CONTRACT_V1,
        mode: "dry_run",
        data_mutation: false,
        mutation_authorized: false,
        writer_calls: 0,
        blockers: planFile ? ["dry_run_plan_file_not_executed"] : ["plan_file_required_for_write"],
      }, null, 2)}\n`,
    );
    return;
  }
  if (resolveIoCapabilityFromEnvV1() !== "MUTATION") {
    process.stdout.write(`${JSON.stringify({ mode: "write", data_mutation: false, mutation_authorized: false, writer_calls: 0, blockers: ["mutation_capability_required"] }, null, 2)}\n`);
    process.exitCode = 1;
    return;
  }
  if (!planFile) {
    process.stdout.write(`${JSON.stringify({ mode: "write", data_mutation: false, mutation_authorized: false, writer_calls: 0, blockers: ["plan_file_required_for_write"] }, null, 2)}\n`);
    process.exitCode = 1;
    return;
  }
  let plan: BuckpartsRetailerLinkParityCorrectionPlanV1;
  try {
    plan = JSON.parse(readFileSync(path.resolve(process.cwd(), planFile), "utf8")) as BuckpartsRetailerLinkParityCorrectionPlanV1;
  } catch (error) {
    process.stdout.write(`${JSON.stringify({ mode: "write", data_mutation: false, mutation_authorized: false, writer_calls: 0, blockers: [`plan_file_unreadable:${error instanceof Error ? error.message : String(error)}`] }, null, 2)}\n`);
    process.exitCode = 1;
    return;
  }
  // Deliberately no standalone live loader or Supabase writer: parsing the
  // plan still evaluates the approval, but cannot claim a write completed.
  const report = await buildRetailerLinkParityGuardedApplyReportV1({
    rootDir: process.cwd(),
    plan,
    mode: "write",
    ioCapability: "MUTATION",
  });
  process.stdout.write(`${JSON.stringify({ ...report, writer_calls: 0, blockers: [...report.blockers, "standalone_cli_requires_integrated_live_loader_and_writer"] }, null, 2)}\n`);
  process.exitCode = 1;
}

function isExecutedAsCliMainV1(): boolean {
  const entry = process.argv[1];
  if (!entry) return false;
  try {
    return import.meta.url === pathToFileURL(path.resolve(entry)).href;
  } catch {
    return false;
  }
}

// Only run when this file is the process entrypoint — never on test/import.
if (
  isExecutedAsCliMainV1() &&
  process.env.BUCKPARTS_RETAILER_LINK_PARITY_GUARDED_APPLY_TEST_HOOK !== "1"
) {
  main().catch((error) => {
    process.stderr.write(`${error instanceof Error ? error.message : String(error)}\n`);
    process.exitCode = 1;
  });
}
