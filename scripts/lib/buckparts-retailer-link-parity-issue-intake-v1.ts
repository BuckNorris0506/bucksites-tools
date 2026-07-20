/**
 * Phase 3 — Retailer-link parity issue intake (repo/evidence → Supabase UPDATE cohort).
 * Consumes fridge-supabase-vs-csv-retailer-links-diff-v1; no duplicate detector.
 * Read-only; no issue-registry auto-write; no production mutation.
 */

import { createHash } from "node:crypto";

import {
  buildFridgeSupabaseVsCsvRetailerLinksDiffV1,
  type FridgeRetailerLinksDiffRowStatusV1,
  type FridgeRetailerLinksDiffRowV1,
  type FridgeSupabaseVsCsvRetailerLinksDiffV1,
} from "./fridge-supabase-vs-csv-retailer-links-diff-v1";

export const BUCKPARTS_RETAILER_LINK_PARITY_ISSUE_INTAKE_CONTRACT_V1 =
  "buckparts_retailer_link_parity_issue_intake_v1" as const;

export const BUCKPARTS_RETAILER_LINK_PARITY_WEDGE_V1 = "refrigerator_water" as const;
export const BUCKPARTS_RETAILER_LINK_PARITY_TABLE_V1 = "public.retailer_links" as const;

export const BUCKPARTS_RETAILER_LINK_PARITY_CORRECTABLE_STATUSES_V1 = [
  "CSV_HAS_WIN_SUPABASE_MISSING",
  "EVIDENCE_ONLY_NOT_IN_SUPABASE",
] as const;

export type BuckpartsRetailerLinkParityCorrectableStatusV1 =
  (typeof BUCKPARTS_RETAILER_LINK_PARITY_CORRECTABLE_STATUSES_V1)[number];

export type BuckpartsRetailerLinkParityIssueLifecycleV1 = "DISCOVERED";

export type BuckpartsRetailerLinkParityExistingRowIdentityV1 = {
  filter_slug: string;
  filter_id: string;
  supabase_link_id: string;
  is_primary: true;
  current_affiliate_url: string;
  current_retailer_key: string | null;
  current_retailer_name: string | null;
  current_browser_truth_classification: string | null;
};

export type BuckpartsRetailerLinkParityIssueCandidateV1 = {
  issue_id: string;
  lifecycle: BuckpartsRetailerLinkParityIssueLifecycleV1;
  defect_class: BuckpartsRetailerLinkParityCorrectableStatusV1;
  wedge: typeof BUCKPARTS_RETAILER_LINK_PARITY_WEDGE_V1;
  table: typeof BUCKPARTS_RETAILER_LINK_PARITY_TABLE_V1;
  filter_slug: string;
  existing_row: BuckpartsRetailerLinkParityExistingRowIdentityV1;
  evidence_win_artifacts: string[];
  csv_primary_url: string | null;
  csv_primary_retailer: string | null;
  detector_status: FridgeRetailerLinksDiffRowStatusV1;
  operation: "UPDATE";
  insert_delete_posture: "forbidden";
};

export type BuckpartsRetailerLinkParityIssueIntakeReportV1 = {
  contract: typeof BUCKPARTS_RETAILER_LINK_PARITY_ISSUE_INTAKE_CONTRACT_V1;
  read_only: true;
  data_mutation: false;
  mutation_authorized: false;
  generated_at: string;
  detected_count: number;
  correctable_count: number;
  unknown_count: number;
  non_correctable_count: number;
  blocked_count: number;
  candidates: BuckpartsRetailerLinkParityIssueCandidateV1[];
  blockers: string[];
  proof_sources: string[];
  recommended_next_action: string;
};

export type BuckpartsRetailerLinkParityExistingRowLoaderV1 = (args: {
  filter_slugs: string[];
}) => Promise<
  | { status: "CHECKED"; by_slug: Map<string, BuckpartsRetailerLinkParityExistingRowIdentityV1 | null> }
  | { status: "UNKNOWN_DB_UNAVAILABLE"; reason: string }
>;

/** Read-only primary-row identity loader for UPDATE binding (select only; never mutates). */
export async function loadRetailerLinkParityExistingRowsFromSupabaseV1(args: {
  filter_slugs: string[];
}): Promise<
  | { status: "CHECKED"; by_slug: Map<string, BuckpartsRetailerLinkParityExistingRowIdentityV1 | null> }
  | { status: "UNKNOWN_DB_UNAVAILABLE"; reason: string }
> {
  const slugs = [...new Set(args.filter_slugs.map((s) => s.trim().toLowerCase()).filter(Boolean))];
  if (slugs.length === 0) {
    return { status: "CHECKED", by_slug: new Map() };
  }
  try {
    const { loadEnv } = await import("./load-env");
    const { getSupabaseAdmin } = await import("./supabase-admin");
    loadEnv();
    const supabase = getSupabaseAdmin();
    const { data: filters, error: filterErr } = await supabase
      .from("filters")
      .select("id, slug")
      .in("slug", slugs);
    if (filterErr) throw filterErr;

    const slugToFilterId = new Map<string, string>();
    const filterIdToSlug = new Map<string, string>();
    for (const row of filters ?? []) {
      const id = String((row as { id?: string }).id ?? "").trim();
      const slug = String((row as { slug?: string }).slug ?? "")
        .trim()
        .toLowerCase();
      if (!id || !slug) continue;
      slugToFilterId.set(slug, id);
      filterIdToSlug.set(id, slug);
    }

    const by_slug = new Map<string, BuckpartsRetailerLinkParityExistingRowIdentityV1 | null>();
    for (const slug of slugs) by_slug.set(slug, null);

    const filterIds = [...filterIdToSlug.keys()];
    if (filterIds.length > 0) {
      const { data: links, error: linkErr } = await supabase
        .from("retailer_links")
        .select(
          "id, filter_id, retailer_key, retailer_name, affiliate_url, is_primary, browser_truth_classification",
        )
        .in("filter_id", filterIds)
        .eq("is_primary", true);
      if (linkErr) throw linkErr;
      for (const raw of links ?? []) {
        const filterId = String((raw as { filter_id?: string }).filter_id ?? "").trim();
        const slug = filterIdToSlug.get(filterId);
        const linkId = String((raw as { id?: string }).id ?? "").trim();
        if (!slug || !linkId) continue;
        by_slug.set(slug, {
          filter_slug: slug,
          filter_id: filterId,
          supabase_link_id: linkId,
          is_primary: true,
          current_affiliate_url: String((raw as { affiliate_url?: string }).affiliate_url ?? ""),
          current_retailer_key: (raw as { retailer_key?: string | null }).retailer_key ?? null,
          current_retailer_name: (raw as { retailer_name?: string | null }).retailer_name ?? null,
          current_browser_truth_classification:
            (raw as { browser_truth_classification?: string | null }).browser_truth_classification ??
            null,
        });
      }
    }
    return { status: "CHECKED", by_slug };
  } catch (err) {
    return {
      status: "UNKNOWN_DB_UNAVAILABLE",
      reason: err instanceof Error ? err.message : String(err),
    };
  }
}

function isCorrectableStatus(
  status: FridgeRetailerLinksDiffRowStatusV1,
): status is BuckpartsRetailerLinkParityCorrectableStatusV1 {
  return (BUCKPARTS_RETAILER_LINK_PARITY_CORRECTABLE_STATUSES_V1 as readonly string[]).includes(
    status,
  );
}

export function buildRetailerLinkParityIssueIdV1(args: {
  defect_class: unknown;
  table: unknown;
  wedge: unknown;
  filter_slug: unknown;
  link_id: unknown;
}): { ok: true; issue_id: string } | { ok: false; blocker: string } {
  const fields: Array<[string, unknown]> = [
    ["defect_class", args.defect_class],
    ["table", args.table],
    ["wedge", args.wedge],
    ["filter_slug", args.filter_slug],
    ["link_id", args.link_id],
  ];
  for (const [name, value] of fields) {
    if (typeof value !== "string" || !value.trim()) {
      return { ok: false, blocker: `invalid_issue_identity:${name}` };
    }
  }
  const defect_class = String(args.defect_class).trim();
  const table = String(args.table).trim();
  const wedge = String(args.wedge).trim();
  const filter_slug = String(args.filter_slug).trim().toLowerCase();
  const link_id = String(args.link_id).trim().toLowerCase();
  if (table !== BUCKPARTS_RETAILER_LINK_PARITY_TABLE_V1) {
    return { ok: false, blocker: "invalid_issue_identity:table" };
  }
  const material = [defect_class, table, wedge, filter_slug, link_id].join("|");
  return { ok: true, issue_id: createHash("sha256").update(material).digest("hex").slice(0, 32) };
}

export function classifyRetailerLinkParityIntakeRowV1(args: {
  row: FridgeRetailerLinksDiffRowV1;
  existing: BuckpartsRetailerLinkParityExistingRowIdentityV1 | null | undefined;
  db_unavailable: boolean;
}): {
  kind: "candidate" | "blocked" | "non_correctable" | "unknown";
  blocker?: string;
  candidate?: Omit<BuckpartsRetailerLinkParityIssueCandidateV1, "issue_id"> & { issue_id?: string };
} {
  if (args.db_unavailable || args.row.status === "UNKNOWN") {
    return {
      kind: "unknown",
      blocker: `unknown_or_db_unavailable:${args.row.filter_slug}:${args.row.status}`,
    };
  }
  if (!isCorrectableStatus(args.row.status)) {
    return { kind: "non_correctable" };
  }
  if (!args.existing?.supabase_link_id) {
    return {
      kind: "blocked",
      blocker: `insert_required_or_missing_existing_row:${args.row.filter_slug}`,
    };
  }
  if (args.row.status === "EVIDENCE_ONLY_NOT_IN_SUPABASE") {
    if (!args.row.evidence_win_artifacts?.length) {
      return {
        kind: "blocked",
        blocker: `evidence_only_missing_artifacts:${args.row.filter_slug}`,
      };
    }
    if (!args.row.csv_primary_url) {
      return {
        kind: "blocked",
        blocker: `evidence_only_requires_csv_or_bound_url:${args.row.filter_slug}`,
      };
    }
  }
  if (args.row.status === "CSV_HAS_WIN_SUPABASE_MISSING" && !args.row.csv_primary_url) {
    return {
      kind: "blocked",
      blocker: `csv_win_missing_primary_url:${args.row.filter_slug}`,
    };
  }

  const identity = buildRetailerLinkParityIssueIdV1({
    defect_class: args.row.status,
    table: BUCKPARTS_RETAILER_LINK_PARITY_TABLE_V1,
    wedge: BUCKPARTS_RETAILER_LINK_PARITY_WEDGE_V1,
    filter_slug: args.row.filter_slug,
    link_id: args.existing.supabase_link_id,
  });
  if (!identity.ok) {
    return { kind: "blocked", blocker: identity.blocker };
  }

  return {
    kind: "candidate",
    candidate: {
      issue_id: identity.issue_id,
      lifecycle: "DISCOVERED",
      defect_class: args.row.status,
      wedge: BUCKPARTS_RETAILER_LINK_PARITY_WEDGE_V1,
      table: BUCKPARTS_RETAILER_LINK_PARITY_TABLE_V1,
      filter_slug: args.row.filter_slug,
      existing_row: args.existing,
      evidence_win_artifacts: [...(args.row.evidence_win_artifacts ?? [])].sort(),
      csv_primary_url: args.row.csv_primary_url,
      csv_primary_retailer: args.row.csv_primary_retailer,
      detector_status: args.row.status,
      operation: "UPDATE",
      insert_delete_posture: "forbidden",
    },
  };
}

export async function buildRetailerLinkParityIssueIntakeV1(args: {
  rootDir: string;
  now?: () => Date;
  diffBuilder?: (rootDir: string) => Promise<FridgeSupabaseVsCsvRetailerLinksDiffV1>;
  loadExistingRows?: BuckpartsRetailerLinkParityExistingRowLoaderV1;
}): Promise<BuckpartsRetailerLinkParityIssueIntakeReportV1> {
  const now = args.now ?? (() => new Date());
  const generated_at = now().toISOString();
  const blockers: string[] = [];
  const proof_sources: string[] = [
    "scripts/lib/fridge-supabase-vs-csv-retailer-links-diff-v1.ts",
  ];

  const diff =
    args.diffBuilder != null
      ? await args.diffBuilder(args.rootDir)
      : await buildFridgeSupabaseVsCsvRetailerLinksDiffV1({ rootDir: args.rootDir });

  if (diff.supabase_truth_status !== "CHECKED") {
    blockers.push(
      `unknown_or_db_unavailable:detector:${diff.supabase_unavailable_reason ?? "UNKNOWN"}`,
    );
    return {
      contract: BUCKPARTS_RETAILER_LINK_PARITY_ISSUE_INTAKE_CONTRACT_V1,
      read_only: true,
      data_mutation: false,
      mutation_authorized: false,
      generated_at,
      detected_count: diff.checked_slug_count,
      correctable_count: 0,
      unknown_count: diff.unknown_status_count + diff.checked_slug_count,
      non_correctable_count: 0,
      blocked_count: 0,
      candidates: [],
      blockers,
      proof_sources,
      recommended_next_action:
        "Resolve Supabase availability before retailer-link parity correction intake.",
    };
  }

  const correctableRows = diff.rows.filter((r) => isCorrectableStatus(r.status));
  const loadExisting =
    args.loadExistingRows ?? loadRetailerLinkParityExistingRowsFromSupabaseV1;

  const existingResult = await loadExisting({
    filter_slugs: correctableRows.map((r) => r.filter_slug),
  });

  if (existingResult.status === "UNKNOWN_DB_UNAVAILABLE") {
    blockers.push(`unknown_or_db_unavailable:existing_row_loader:${existingResult.reason}`);
    return {
      contract: BUCKPARTS_RETAILER_LINK_PARITY_ISSUE_INTAKE_CONTRACT_V1,
      read_only: true,
      data_mutation: false,
      mutation_authorized: false,
      generated_at,
      detected_count: diff.rows.length,
      correctable_count: 0,
      unknown_count: diff.rows.length,
      non_correctable_count: 0,
      blocked_count: 0,
      candidates: [],
      blockers,
      proof_sources,
      recommended_next_action:
        "Provide CHECKED existing-row identity loader before planning UPDATE corrections.",
    };
  }

  const candidates: BuckpartsRetailerLinkParityIssueCandidateV1[] = [];
  let unknown_count = 0;
  let non_correctable_count = 0;
  let blocked_count = 0;

  for (const row of [...diff.rows].sort((a, b) => a.filter_slug.localeCompare(b.filter_slug))) {
    const classified = classifyRetailerLinkParityIntakeRowV1({
      row,
      existing: existingResult.by_slug.get(row.filter_slug) ?? null,
      db_unavailable: false,
    });
    if (classified.kind === "unknown") {
      unknown_count += 1;
      if (classified.blocker) blockers.push(classified.blocker);
      continue;
    }
    if (classified.kind === "non_correctable") {
      non_correctable_count += 1;
      continue;
    }
    if (classified.kind === "blocked") {
      blocked_count += 1;
      if (classified.blocker) blockers.push(classified.blocker);
      continue;
    }
    candidates.push(classified.candidate as BuckpartsRetailerLinkParityIssueCandidateV1);
  }

  // A repeated detector identity is ambiguous evidence, not a dedupe opportunity:
  // fail the complete intake closed rather than silently selecting one row.
  const duplicateIssueIds = candidates
    .map((candidate) => candidate.issue_id)
    .filter((issueId, index, all) => all.indexOf(issueId) !== index);
  if (duplicateIssueIds.length > 0) {
    const duplicateBlockers = [...new Set(duplicateIssueIds)]
      .sort()
      .map((issueId) => `duplicate_intake_identity:${issueId}`);
    return {
      contract: BUCKPARTS_RETAILER_LINK_PARITY_ISSUE_INTAKE_CONTRACT_V1,
      read_only: true,
      data_mutation: false,
      mutation_authorized: false,
      generated_at,
      detected_count: diff.rows.length,
      correctable_count: 0,
      unknown_count,
      non_correctable_count,
      blocked_count: blocked_count + duplicateBlockers.length,
      candidates: [],
      blockers: [...new Set([...blockers, ...duplicateBlockers])].sort(),
      proof_sources,
      recommended_next_action:
        "Refuse intake until duplicate detector identities are reconciled.",
    };
  }

  // Deterministic candidate order + idempotent IDs.
  candidates.sort((a, b) => a.issue_id.localeCompare(b.issue_id));

  return {
    contract: BUCKPARTS_RETAILER_LINK_PARITY_ISSUE_INTAKE_CONTRACT_V1,
    read_only: true,
    data_mutation: false,
    mutation_authorized: false,
    generated_at,
    detected_count: diff.rows.length,
    correctable_count: candidates.length,
    unknown_count,
    non_correctable_count,
    blocked_count,
    candidates,
    blockers: [...new Set(blockers)].sort(),
    proof_sources,
    recommended_next_action:
      candidates.length > 0
        ? "Build retailer-link parity correction plan dry-run for DISCOVERED UPDATE candidates."
        : "ARMED_AND_IDLE: no UPDATE-correctable existing-row parity candidates.",
  };
}
