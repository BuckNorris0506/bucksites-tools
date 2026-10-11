/**
 * R16 Phase B1 — tag-only normalization for inactive Amazon Associates (refrigerator wedge).
 * Dry-run by default; CSV write and Supabase write require founder approval + closeout binding.
 */

import { createHash } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";

import {
  assertSupabaseMutationAuthorizedV1,
  buildSupabaseMutationGatePreflightV1,
  resolveIoCapabilityFromEnvV1,
} from "./buckparts-supabase-mutation-gate-core-v1";
import { FRIDGE_RETAILER_LINKS_CSV_REL_V1 } from "./fridge-buyer-path-batch-apply-plan-proposal-v1";
import {
  applyGuardedCsvWritePlanToCsvTextV1,
  FRIDGE_RETAILER_LINKS_CSV_HEADER_COLUMNS_V1,
} from "./universal-batch-lifecycle-guarded-csv-apply-executor-write-v1";
import {
  loadFridgeRetailerLinksCsvRowsV1,
  type RetailerLinkCsvRowV1,
} from "./universal-batch-lifecycle-apply-execution-plan-v1";

export const R16_AMAZON_STORED_TAG_NORMALIZATION_CONTRACT_V1 =
  "buckparts_r16_amazon_stored_tag_normalization_v1" as const;

export const R16_AMAZON_STORED_TAG_NORMALIZATION_CANONICAL_MAIN_SHA_V1 =
  "110e67541533d16c8d936cc394bfd36ffeb19dc9" as const;

export const R16_AMAZON_INACTIVE_TAG_V1 = "buckparts20-20" as const;

export const R16_AMAZON_STORED_TAG_NORMALIZATION_OWNER_APPROVAL_JSON_REL_V1 =
  "data/owner-decisions/r16-amazon-stored-tag-normalization-owner-approval-v1.json" as const;

export const R16_AMAZON_STORED_TAG_NORMALIZATION_OWNER_APPROVAL_DECISION_ID_V1 =
  "decision-2026-10-11-r16-amazon-stored-tag-normalization" as const;

export const R16_AMAZON_STORED_TAG_NORMALIZATION_APPLY_PLAN_JSON_REL_V1 =
  "data/fridge/batch-production/apply-plans/r16-amazon-stored-tag-normalization-apply-plan-v1.json" as const;

export const R16_AMAZON_STORED_TAG_NORMALIZATION_PRE_MUTATION_SNAPSHOT_JSON_REL_V1 =
  "data/ops/r16-amazon-stored-tag-normalization-pre-mutation-snapshot-v1.json" as const;

export const R16_AMAZON_STORED_TAG_NORMALIZATION_CSV_CLOSEOUT_JSON_REL_V1 =
  "data/fridge/batch-production/closeout/r16-amazon-stored-tag-normalization-csv-closeout-v1.json" as const;

export const R16_AMAZON_STORED_TAG_NORMALIZATION_SUPABASE_CLOSEOUT_JSON_REL_V1 =
  "data/fridge/batch-production/closeout/r16-amazon-stored-tag-normalization-supabase-closeout-v1.json" as const;

export const R16_AMAZON_STORED_TAG_NORMALIZATION_SOURCE_COMMAND_V1 =
  "npm run buckparts:r16-amazon-stored-tag-normalization" as const;

/** Refrigerator CSV primary Amazon slugs (14). */
export const R16_AMAZON_CSV_TARGET_SLUGS_V1 = [
  "lt1000p",
  "lt1000pc",
  "lt700p",
  "lt800p",
  "lt600p",
  "mdj64844601",
  "da29-00019a",
  "da97-15217d",
  "edr1rxd1",
  "edr2rxd1",
  "ukf8001",
  "4396508",
  "8171413",
  "46-9002",
] as const;

/** Production Supabase rows with stored inactive tag (16). */
export const R16_AMAZON_SUPABASE_TARGET_ROWS_V1 = [
  { id: "e59a1742-6476-4651-8dff-c5b94998b734", slug: "4396508", asin: "B00NXPKBQ2" },
  { id: "b2241855-b588-4884-9dfa-b0f5969becbf", slug: "4396710", asin: "B087PDLZL9" },
  { id: "0ec8d954-9596-472f-8c74-815870226bce", slug: "4396841", asin: "B087PDLZL9" },
  { id: "17510d54-85a3-4e43-a671-272a9df274b6", slug: "46-9002", asin: "B01IDH3IPU" },
  { id: "a891c852-2bd3-4b0c-9948-7226469c638a", slug: "8171413", asin: "B01CA0V1VE" },
  { id: "72029713-27b2-4598-bd4f-33ba5a0e22cc", slug: "da29-00019a", asin: "B019HPTP3G" },
  { id: "3ae440ae-2324-4580-802b-5f50116f4da2", slug: "da97-15217d", asin: "B07BHZWSCQ" },
  { id: "32288a9b-4ff3-4424-86fa-99f716308ef5", slug: "edr1rxd1", asin: "B00UXG4WR8" },
  { id: "6f81b4ce-a3b0-4c09-b0d9-965aca5bfc17", slug: "edr2rxd1", asin: "B00VBP8QPO" },
  { id: "c5303885-6ea2-43da-87bb-846a311edba1", slug: "lt1000p", asin: "B07H9LHMR2" },
  { id: "0a1e3c22-518d-476e-ba95-91955984e2ec", slug: "lt1000pc", asin: "B07H9LHMR2" },
  { id: "4b240a57-970a-42f5-a23d-ca99fbc40ad2", slug: "lt600p", asin: "B07VGD8Z5Z" },
  { id: "a468799b-64c4-44e9-a16f-c87be931345a", slug: "lt700p", asin: "B0042ACZU2" },
  { id: "6bbf8586-a87e-46de-932c-2bc341587619", slug: "lt800p", asin: "B00X3DWMS4" },
  { id: "b289be90-b9c3-44c3-9c26-3a554c545a47", slug: "mdj64844601", asin: "B08HDD1PK1" },
  { id: "b1cc3087-935a-4890-8dfe-af6586c65997", slug: "ukf8001", asin: "B07C8C2VBH" },
] as const;

export type R16AmazonStoredTagNormalizationModeV1 =
  | "snapshot"
  | "csv_dry_run"
  | "csv_write"
  | "supabase_dry_run"
  | "supabase_write";

export function sha256Text(text: string): string {
  return createHash("sha256").update(text).digest("hex");
}

export function sha256File(rootDir: string, rel: string, readText = readFileSync): string {
  return sha256Text(readText(path.join(rootDir, rel), "utf8"));
}

export function normalizeSlug(slug: string): string {
  return slug.trim().toLowerCase();
}

export function asinFromAmazonUrl(url: string): string | null {
  const m = url.match(/\/dp\/([A-Z0-9]{10})/i);
  return m ? m[1]!.toUpperCase() : null;
}

/** Remove only tag=buckparts20-20; preserve path/ASIN and other query params. */
export function stripInactiveAmazonAssociatesTagFromUrl(url: string): string {
  const trimmed = url.trim();
  if (!trimmed) return trimmed;
  let u: URL;
  try {
    u = new URL(trimmed);
  } catch {
    return trimmed;
  }
  if (u.searchParams.get("tag") === R16_AMAZON_INACTIVE_TAG_V1) {
    u.searchParams.delete("tag");
  }
  const out = u.toString();
  return out.endsWith("?") ? out.slice(0, -1) : out;
}

export function urlHasInactiveAmazonTag(url: string): boolean {
  try {
    return new URL(url.trim()).searchParams.get("tag") === R16_AMAZON_INACTIVE_TAG_V1;
  } catch {
    return false;
  }
}

function findPrimaryAmazonRowIndex(rows: RetailerLinkCsvRowV1[], slug: string): number {
  const target = normalizeSlug(slug);
  return rows.findIndex(
    (r) =>
      normalizeSlug(r.filter_slug ?? "") === target &&
      String(r.is_primary ?? "").trim().toLowerCase() === "true" &&
      normalizeSlug(r.retailer_key ?? "") === "amazon",
  );
}

export type R16CsvPlannedUpdateV1 = {
  filter_slug: string;
  row_index: number;
  before_affiliate_url: string;
  after_affiliate_url: string;
  asin: string;
  changed_fields: string[];
};

export function buildR16CsvTagStripPlanV1(args: {
  rootDir: string;
  readText?: (abs: string) => string;
  fileExists?: (abs: string) => boolean;
}): { ok: true; updates: R16CsvPlannedUpdateV1[] } | { ok: false; blockers: string[] } {
  const fileExists = args.fileExists ?? existsSync;
  const readText = args.readText ?? ((abs) => readFileSync(abs, "utf8"));
  const blockers: string[] = [];
  const rows = loadFridgeRetailerLinksCsvRowsV1({
    rootDir: args.rootDir,
    fileExists,
    readText,
  });
  const updates: R16CsvPlannedUpdateV1[] = [];

  for (const slug of R16_AMAZON_CSV_TARGET_SLUGS_V1) {
    const idx = findPrimaryAmazonRowIndex(rows, slug);
    if (idx < 0) {
      blockers.push(`csv_primary_amazon_row_missing:${slug}`);
      continue;
    }
    const before = rows[idx]!;
    const beforeUrl = (before.affiliate_url ?? "").trim();
    const asin = asinFromAmazonUrl(beforeUrl);
    if (!asin) blockers.push(`csv_asin_missing:${slug}`);
    if (!urlHasInactiveAmazonTag(beforeUrl)) {
      blockers.push(`csv_unexpected_untagged_or_wrong_tag:${slug}`);
    }
    const afterUrl = stripInactiveAmazonAssociatesTagFromUrl(beforeUrl);
    if (asin && asinFromAmazonUrl(afterUrl) !== asin) {
      blockers.push(`csv_asin_drift_after_strip:${slug}`);
    }
    const after: RetailerLinkCsvRowV1 = { ...before, affiliate_url: afterUrl };
    const changed_fields: string[] = [];
    for (const key of FRIDGE_RETAILER_LINKS_CSV_HEADER_COLUMNS_V1) {
      if ((before[key] ?? "") !== (after[key] ?? "")) changed_fields.push(key);
    }
    if (changed_fields.some((f) => f !== "affiliate_url")) {
      blockers.push(`csv_non_affiliate_field_would_change:${slug}`);
    }
    updates.push({
      filter_slug: slug,
      row_index: idx,
      before_affiliate_url: beforeUrl,
      after_affiliate_url: afterUrl,
      asin: asin ?? "UNKNOWN",
      changed_fields,
    });
  }

  if (updates.length !== R16_AMAZON_CSV_TARGET_SLUGS_V1.length) {
    blockers.push(`csv_update_count_not_14:${String(updates.length)}`);
  }
  if (blockers.length > 0) return { ok: false, blockers };
  return { ok: true, updates };
}

export function applyR16CsvTagStripWriteV1(args: {
  rootDir: string;
  updates: R16CsvPlannedUpdateV1[];
  readText?: (abs: string) => string;
  writeText?: (abs: string, content: string) => void;
}): { ok: true; rows_written: number } | { ok: false; blockers: string[] } {
  const readText = args.readText ?? ((abs) => readFileSync(abs, "utf8"));
  const writeText =
    args.writeText ??
    ((abs, content) => {
      mkdirSync(path.dirname(abs), { recursive: true });
      writeFileSync(abs, content, "utf8");
    });
  const csvAbs = path.join(args.rootDir, FRIDGE_RETAILER_LINKS_CSV_REL_V1);
  const csvText = readText(csvAbs);
  const rows = loadFridgeRetailerLinksCsvRowsV1({
    rootDir: args.rootDir,
    fileExists: existsSync,
    readText: () => csvText,
  });
  const nextRows = rows.map((row) => ({ ...row }));
  const targetRowIndices: number[] = [];
  for (const u of args.updates) {
    const before = nextRows[u.row_index];
    if (!before) return { ok: false, blockers: [`row_index_missing:${u.filter_slug}`] };
    nextRows[u.row_index] = { ...before, affiliate_url: u.after_affiliate_url };
    targetRowIndices.push(u.row_index);
  }
  const nextCsv = applyGuardedCsvWritePlanToCsvTextV1({
    csvText,
    headers: FRIDGE_RETAILER_LINKS_CSV_HEADER_COLUMNS_V1,
    rows: nextRows,
    targetRowIndices,
  });
  writeText(csvAbs, nextCsv);
  return { ok: true, rows_written: args.updates.length };
}

export type R16SupabaseRowSnapshotV1 = {
  id: string;
  slug: string | null;
  filter_id: string;
  affiliate_url: string;
  destination_url: string | null;
  asin: string | null;
  is_primary: boolean | null;
  status: string | null;
  browser_truth_classification: string | null;
  browser_truth_checked_at: string | null;
  created_at: string | null;
};

export type R16SupabasePlannedUpdateV1 = {
  id: string;
  slug: string;
  asin: string;
  before_affiliate_url: string;
  after_affiliate_url: string;
  before_destination_url: string | null;
  after_destination_url: string | null;
};

export async function loadR16SupabaseTargetSnapshotsV1(): Promise<
  | { status: "CHECKED"; rows: R16SupabaseRowSnapshotV1[] }
  | { status: "UNKNOWN_DB_UNAVAILABLE"; reason: string }
> {
  try {
    const { loadEnv } = await import("./load-env");
    const { getSupabaseAdmin } = await import("./supabase-admin");
    loadEnv();
    const supabase = getSupabaseAdmin();
    const ids = R16_AMAZON_SUPABASE_TARGET_ROWS_V1.map((r) => r.id);
    const { data, error } = await supabase
      .from("retailer_links")
      .select(
        "id, filter_id, affiliate_url, destination_url, is_primary, status, browser_truth_classification, browser_truth_checked_at, created_at",
      )
      .in("id", ids);
    if (error) throw error;
    const byId = new Map((data ?? []).map((r) => [String((r as { id: string }).id), r]));
    if (byId.size !== 16) {
      return {
        status: "UNKNOWN_DB_UNAVAILABLE",
        reason: `expected_16_rows_got_${String(byId.size)}`,
      };
    }
    const filterIds = [...new Set([...(data ?? []).map((r) => (r as { filter_id: string }).filter_id)])];
    const { data: filters, error: fe } = await supabase
      .from("filters")
      .select("id, slug")
      .in("id", filterIds);
    if (fe) throw fe;
    const slugByFilterId = new Map(
      (filters ?? []).map((f) => [(f as { id: string }).id, (f as { slug: string }).slug]),
    );
    const rows: R16SupabaseRowSnapshotV1[] = [];
    for (const expected of R16_AMAZON_SUPABASE_TARGET_ROWS_V1) {
      const raw = byId.get(expected.id) as Record<string, unknown> | undefined;
      if (!raw) {
        return { status: "UNKNOWN_DB_UNAVAILABLE", reason: `missing_id:${expected.id}` };
      }
      const affiliate = String(raw.affiliate_url ?? "");
      const dest = raw.destination_url != null ? String(raw.destination_url) : null;
      const slug = slugByFilterId.get(String(raw.filter_id)) ?? null;
      if (normalizeSlug(slug ?? "") !== normalizeSlug(expected.slug)) {
        return {
          status: "UNKNOWN_DB_UNAVAILABLE",
          reason: `slug_drift:${expected.id}:${String(slug)}`,
        };
      }
      const asin = asinFromAmazonUrl(affiliate || dest || "");
      if (asin !== expected.asin) {
        return {
          status: "UNKNOWN_DB_UNAVAILABLE",
          reason: `asin_drift:${expected.id}:${String(asin)}`,
        };
      }
      rows.push({
        id: expected.id,
        slug,
        filter_id: String(raw.filter_id),
        affiliate_url: affiliate,
        destination_url: dest,
        asin,
        is_primary: (raw.is_primary as boolean | null) ?? null,
        status: (raw.status as string | null) ?? null,
        browser_truth_classification: (raw.browser_truth_classification as string | null) ?? null,
        browser_truth_checked_at: (raw.browser_truth_checked_at as string | null) ?? null,
        created_at: (raw.created_at as string | null) ?? null,
      });
    }
    return { status: "CHECKED", rows };
  } catch (err) {
    return {
      status: "UNKNOWN_DB_UNAVAILABLE",
      reason: err instanceof Error ? err.message : String(err),
    };
  }
}

export function buildR16SupabaseTagStripPlanFromSnapshotsV1(
  snapshots: R16SupabaseRowSnapshotV1[],
): { ok: true; updates: R16SupabasePlannedUpdateV1[] } | { ok: false; blockers: string[] } {
  const blockers: string[] = [];
  const updates: R16SupabasePlannedUpdateV1[] = [];
  if (snapshots.length !== 16) blockers.push(`supabase_snapshot_count:${String(snapshots.length)}`);

  for (const row of snapshots) {
    const slug = row.slug ?? "UNKNOWN";
    const tagged =
      urlHasInactiveAmazonTag(row.affiliate_url) ||
      (row.destination_url != null && urlHasInactiveAmazonTag(row.destination_url));
    if (!tagged) blockers.push(`supabase_untagged_or_wrong_tag:${row.id}`);
    const afterAffiliate = stripInactiveAmazonAssociatesTagFromUrl(row.affiliate_url);
    const afterDest =
      row.destination_url != null
        ? stripInactiveAmazonAssociatesTagFromUrl(row.destination_url)
        : null;
    if (asinFromAmazonUrl(afterAffiliate) !== row.asin) {
      blockers.push(`supabase_asin_drift_affiliate:${row.id}`);
    }
    if (afterDest != null && asinFromAmazonUrl(afterDest) !== row.asin) {
      blockers.push(`supabase_asin_drift_destination:${row.id}`);
    }
    updates.push({
      id: row.id,
      slug,
      asin: row.asin ?? "UNKNOWN",
      before_affiliate_url: row.affiliate_url,
      after_affiliate_url: afterAffiliate,
      before_destination_url: row.destination_url,
      after_destination_url: afterDest,
    });
  }
  if (blockers.length > 0) return { ok: false, blockers };
  return { ok: true, updates };
}

export async function applyR16SupabaseTagStripWriteV1(args: {
  updates: R16SupabasePlannedUpdateV1[];
  snapshots: R16SupabaseRowSnapshotV1[];
}): Promise<{ ok: true; rows_updated: number } | { ok: false; blockers: string[] }> {
  const preflight = buildSupabaseMutationGatePreflightV1({
    mode: "write",
    io_capability: resolveIoCapabilityFromEnvV1(),
  });
  try {
    assertSupabaseMutationAuthorizedV1(preflight);
  } catch (err) {
    return {
      ok: false,
      blockers: [err instanceof Error ? err.message : String(err)],
    };
  }

  const snapshotById = new Map(args.snapshots.map((s) => [s.id, s]));
  const { loadEnv } = await import("./load-env");
  const { getSupabaseAdmin } = await import("./supabase-admin");
  loadEnv();
  const supabase = getSupabaseAdmin();

  let updated = 0;
  for (const u of args.updates) {
    const snap = snapshotById.get(u.id);
    if (!snap) return { ok: false, blockers: [`snapshot_missing:${u.id}`] };
    const { data: live, error: readErr } = await supabase
      .from("retailer_links")
      .select(
        "id, filter_id, affiliate_url, destination_url, is_primary, status, browser_truth_classification, browser_truth_checked_at",
      )
      .eq("id", u.id)
      .maybeSingle();
    if (readErr || !live) {
      return { ok: false, blockers: [`live_read_failed:${u.id}`] };
    }
    const liveRow = live as Record<string, unknown>;
    if (String(liveRow.affiliate_url) !== snap.affiliate_url) {
      return { ok: false, blockers: [`live_affiliate_drift:${u.id}`] };
    }
    if (String(liveRow.destination_url ?? "") !== String(snap.destination_url ?? "")) {
      return { ok: false, blockers: [`live_destination_drift:${u.id}`] };
    }
    for (const field of [
      "is_primary",
      "status",
      "browser_truth_classification",
      "browser_truth_checked_at",
    ] as const) {
      if (liveRow[field] !== snap[field]) {
        return { ok: false, blockers: [`live_field_drift:${u.id}:${field}`] };
      }
    }

    const payload: Record<string, string> = {
      affiliate_url: u.after_affiliate_url,
    };
    if (snap.destination_url != null && urlHasInactiveAmazonTag(snap.destination_url)) {
      payload.destination_url = u.after_destination_url ?? u.after_affiliate_url;
    }
    const { error, count } = await supabase
      .from("retailer_links")
      .update(payload, { count: "exact" })
      .eq("id", u.id)
      .eq("filter_id", snap.filter_id);
    if (error) return { ok: false, blockers: [`update_error:${u.id}:${error.message}`] };
    if (count !== 1) return { ok: false, blockers: [`update_count:${u.id}:${String(count)}`] };
    updated += 1;
  }
  return { ok: true, rows_updated: updated };
}

export function verifyR16OwnerApprovalGatesV1(args: {
  rootDir: string;
  readText?: (abs: string) => string;
  fileExists?: (abs: string) => boolean;
}): { ok: boolean; blockers: string[] } {
  const fileExists = args.fileExists ?? existsSync;
  const readText = args.readText ?? ((abs) => readFileSync(abs, "utf8"));
  const blockers: string[] = [];
  const approvalRel = R16_AMAZON_STORED_TAG_NORMALIZATION_OWNER_APPROVAL_JSON_REL_V1;
  const planRel = R16_AMAZON_STORED_TAG_NORMALIZATION_APPLY_PLAN_JSON_REL_V1;
  const snapshotRel = R16_AMAZON_STORED_TAG_NORMALIZATION_PRE_MUTATION_SNAPSHOT_JSON_REL_V1;
  if (!fileExists(path.join(args.rootDir, approvalRel))) blockers.push("approval_missing");
  if (!fileExists(path.join(args.rootDir, planRel))) blockers.push("plan_missing");
  if (!fileExists(path.join(args.rootDir, snapshotRel))) blockers.push("snapshot_missing");
  if (blockers.length > 0) return { ok: false, blockers };

  type ApprovalDoc = {
    rows?: Array<{
      decision_id?: string;
      decision_status?: string;
      allowed_next_scope?: string;
      bound_artifacts_v1?: Array<{ artifact_rel_path?: string; sha256_at_binding?: string }>;
    }>;
  };
  const approval = JSON.parse(readText(path.join(args.rootDir, approvalRel))) as ApprovalDoc;
  const row = approval.rows?.[0];
  if (!row) blockers.push("approval_row_missing");
  else {
    if (row.decision_id !== R16_AMAZON_STORED_TAG_NORMALIZATION_OWNER_APPROVAL_DECISION_ID_V1) {
      blockers.push("approval_decision_id_mismatch");
    }
    if (row.decision_status !== "approved") blockers.push("approval_not_approved");
    if (row.allowed_next_scope !== "owner_mutation_approved") {
      blockers.push("approval_scope_mismatch");
    }
    for (const rel of [planRel, snapshotRel]) {
      const sha = sha256File(args.rootDir, rel, readText);
      const bound = (row.bound_artifacts_v1 ?? []).find((b) => b.artifact_rel_path === rel);
      if (!bound || bound.sha256_at_binding !== sha) {
        blockers.push(`approval_sha_mismatch:${rel}`);
      }
    }
  }
  return { ok: blockers.length === 0, blockers };
}

export async function writeR16PreMutationSnapshotV1(args: {
  rootDir: string;
  now?: () => Date;
}): Promise<{ ok: true; rel_path: string } | { ok: false; blockers: string[] }> {
  const csvPlan = buildR16CsvTagStripPlanV1({ rootDir: args.rootDir });
  if (!csvPlan.ok) return { ok: false, blockers: csvPlan.blockers };
  const supabaseLoad = await loadR16SupabaseTargetSnapshotsV1();
  if (supabaseLoad.status !== "CHECKED") {
    return { ok: false, blockers: [`supabase:${supabaseLoad.reason}`] };
  }
  const generated_at = (args.now ?? (() => new Date()))().toISOString();
  const payload = {
    contract: "r16_amazon_stored_tag_normalization_pre_mutation_snapshot_v1",
    read_only: true,
    canonical_main_sha: R16_AMAZON_STORED_TAG_NORMALIZATION_CANONICAL_MAIN_SHA_V1,
    generated_at,
    csv_rows: csvPlan.updates.map((u) => ({
      filter_slug: u.filter_slug,
      asin: u.asin,
      affiliate_url: u.before_affiliate_url,
    })),
    supabase_rows: supabaseLoad.rows,
  };
  const rel = R16_AMAZON_STORED_TAG_NORMALIZATION_PRE_MUTATION_SNAPSHOT_JSON_REL_V1;
  const abs = path.join(args.rootDir, rel);
  mkdirSync(path.dirname(abs), { recursive: true });
  writeFileSync(abs, `${JSON.stringify(payload, null, 2)}\n`, "utf8");
  return { ok: true, rel_path: rel };
}
