/**
 * HQII candidate queue upsert — run orchestration with truth-ledger outcome recording.
 */

import fs from "node:fs";
import path from "node:path";

import type { SupabaseClient } from "@supabase/supabase-js";

import { canonicalAmazonDpUrl } from "./discovery-candidate-enrichment";
import type { BuckpartsIoCapabilityV1 } from "./buckparts-io-capabilities-v1";
import {
  buildHqiiCandidateQueueUpsertMutationPreflightV1,
  HQII_CANDIDATE_QUEUE_UPSERT_MUTATION_GATE_REF_V1,
  HQII_CANDIDATE_QUEUE_UPSERT_MUTATION_LANE_V1,
  hqiiCandidateQueueUpsertMutationAuthorizedV1,
  type HqiiCandidateQueueUpsertMutationPreflightV1,
} from "./hqii-candidate-queue-upsert-mutation-gate-v1";
import type { FounderDecisionRowWithSlugCorrelationV1 } from "./founder-decision-slug-correlation-v1";
import {
  recordTruthLedgerMutationOutcomeV1,
  type TruthLedgerMutationApplyOutcomeV1,
} from "./truth-ledger-v1";

type CandidateState =
  | "candidate_found"
  | "token_verified"
  | "browser_truth_checked"
  | "direct_buyable"
  | "likely_valid"
  | "rejected";

export const CATALOG_WEDGES = [
  "refrigerator_water",
  "air_purifier",
  "vacuum",
  "humidifier",
  "whole_house_water",
  "appliance_air",
] as const;

export type CatalogWedge = (typeof CATALOG_WEDGES)[number];

const WEDGE_TABLE_FK: Record<CatalogWedge, { table: string; fkColumn: QueueFkColumn }> = {
  refrigerator_water: { table: "filters", fkColumn: "refrigerator_filter_id" },
  air_purifier: { table: "air_purifier_filters", fkColumn: "air_purifier_filter_id" },
  vacuum: { table: "vacuum_filters", fkColumn: "vacuum_filter_id" },
  humidifier: { table: "humidifier_filters", fkColumn: "humidifier_filter_id" },
  whole_house_water: {
    table: "whole_house_water_parts",
    fkColumn: "whole_house_water_part_id",
  },
  appliance_air: { table: "appliance_air_parts", fkColumn: "appliance_air_part_id" },
};

const NULL_FK_COLUMNS = {
  refrigerator_filter_id: null as string | null,
  air_purifier_filter_id: null as string | null,
  vacuum_filter_id: null as string | null,
  humidifier_filter_id: null as string | null,
  whole_house_water_part_id: null as string | null,
  appliance_air_part_id: null as string | null,
};
type QueueFkColumn = keyof typeof NULL_FK_COLUMNS;

export type QueueInputRow = {
  filter_slug: string;
  wedge?: CatalogWedge;
  retailer_name?: string;
  url: string;
  token_required?: string[];
  token_evidence_ok?: boolean;
  token_evidence_notes?: string;
};

export type QueueRowDraft = {
  filter_slug: string;
  retailer_key: "amazon";
  retailer_name: string;
  offer_url: string;
  canonical_url: string;
  asin: string;
  source_kind: string;
  validation_status: "pending" | "rejected";
  candidate_state: CandidateState;
  token_required: string[] | null;
  token_evidence_ok: boolean | null;
  token_evidence_notes: string | null;
  last_error: string | null;
  notes: string | null;
};

const SOURCE = "hqii_discovery_enrichment_phase1";

/** Inventory/static-audit marker — run module satisfies mutationGateRef checks. */
const mutationGateRef = HQII_CANDIDATE_QUEUE_UPSERT_MUTATION_GATE_REF_V1;
void mutationGateRef;

const TRUTH_LEDGER_IO_ON_WRITE_INTENT_V1 = "MUTATION" as const;

export type HqiiCandidateQueueUpsertApplyStatusV1 = "BLOCKED" | "APPLIED";

export type HqiiCandidateQueueUpsertReportV1 = {
  dry_run: boolean;
  input_count: number;
  matched_filter_slugs: number;
  unknown_filter_slugs: string[];
  state_counts: Record<string, number>;
  inserted: number;
  updated: number;
  rows: QueueRowDraft[];
  apply_status?: HqiiCandidateQueueUpsertApplyStatusV1;
  mutation_authorized?: boolean;
  mutation_preflight_blockers?: string[];
  founder_decision_id?: string | null;
};

export type HqiiCandidateQueueUpsertRunResultV1 = {
  report: HqiiCandidateQueueUpsertReportV1;
  exit_code: 0 | 1;
};

export type HqiiCandidateQueueUpsertDepsV1 = {
  getSupabaseAdmin: () => SupabaseClient;
};

function inferAsinFromCanonical(canonicalUrl: string): string | null {
  const m = canonicalUrl.match(/\/dp\/([A-Z0-9]{10})$/i);
  return m ? m[1].toUpperCase() : null;
}

export function catalogWedgeFromInput(wedge: string | undefined): CatalogWedge {
  const t = wedge?.trim();
  if (!t) return "refrigerator_water";
  if ((CATALOG_WEDGES as readonly string[]).includes(t)) return t as CatalogWedge;
  throw new Error(
    `Unknown wedge "${t}". Expected one of: ${CATALOG_WEDGES.join(", ")}`,
  );
}

export function buildQueueRowDraft(row: QueueInputRow): QueueRowDraft {
  const filterSlug = row.filter_slug?.trim() ?? "";
  const rawUrl = row.url?.trim() ?? "";
  const retailerName = row.retailer_name?.trim() || "Amazon";
  const tokenRequired =
    Array.isArray(row.token_required) && row.token_required.length > 0
      ? row.token_required.map((t) => t.trim()).filter(Boolean)
      : null;
  const tokenEvidenceOk =
    typeof row.token_evidence_ok === "boolean" ? row.token_evidence_ok : null;
  const tokenEvidenceNotes = row.token_evidence_notes?.trim() || null;

  const canonical = canonicalAmazonDpUrl(rawUrl);
  if (!canonical) {
    return {
      filter_slug: filterSlug,
      retailer_key: "amazon",
      retailer_name: retailerName,
      offer_url: rawUrl,
      canonical_url: rawUrl,
      asin: "",
      source_kind: SOURCE,
      validation_status: "rejected",
      candidate_state: "rejected",
      token_required: tokenRequired,
      token_evidence_ok: tokenEvidenceOk,
      token_evidence_notes: tokenEvidenceNotes,
      last_error: "non_amazon_dp_url",
      notes: "Rejected: only Amazon /dp/{ASIN} candidates are accepted.",
    };
  }

  const asin = inferAsinFromCanonical(canonical) ?? "";

  let candidate_state: CandidateState = "candidate_found";
  let validation_status: "pending" | "rejected" = "pending";
  let last_error: string | null = null;
  let notes: string | null = null;

  if (tokenEvidenceOk === true) {
    candidate_state = "token_verified";
    notes = "Token evidence verified from enrichment output.";
  } else if (tokenEvidenceOk === false) {
    candidate_state = "rejected";
    validation_status = "rejected";
    last_error = "token_evidence_missing";
    notes = "Rejected: required token evidence not found in candidate body.";
  } else {
    candidate_state = "candidate_found";
    notes = "Candidate found with no token verdict yet.";
  }

  return {
    filter_slug: filterSlug,
    retailer_key: "amazon",
    retailer_name: retailerName,
    offer_url: rawUrl,
    canonical_url: canonical,
    asin,
    source_kind: SOURCE,
    validation_status,
    candidate_state,
    token_required: tokenRequired,
    token_evidence_ok: tokenEvidenceOk,
    token_evidence_notes: tokenEvidenceNotes,
    last_error,
    notes,
  };
}

export function buildOfferCandidatePayload(
  fkColumn: QueueFkColumn,
  entityId: string,
  draft: QueueRowDraft,
) {
  const fkPayload = { ...NULL_FK_COLUMNS, [fkColumn]: entityId };
  return {
    ...fkPayload,
    retailer_key: draft.retailer_key,
    offer_url: draft.offer_url,
    retailer_name: draft.retailer_name,
    source_kind: draft.source_kind,
    validation_status: draft.validation_status,
    notes: draft.notes,
    candidate_state: draft.candidate_state,
    canonical_url: draft.canonical_url,
    asin: draft.asin,
    token_required: draft.token_required,
    token_evidence_ok: draft.token_evidence_ok,
    token_evidence_notes: draft.token_evidence_notes,
    browser_truth_classification: null,
    browser_truth_notes: null,
    browser_truth_checked_at: null,
    retry_after: null,
    retry_count: 0,
    last_error: draft.last_error,
  };
}

export function parseHqiiCandidateQueueUpsertCliArgsV1(argv: readonly string[]): {
  inputPath: string | null;
  write: boolean;
} {
  const argValue = (flag: string): string | null => {
    const idx = argv.indexOf(flag);
    if (idx < 0) return null;
    const v = argv[idx + 1];
    return v && !v.startsWith("--") ? v : null;
  };
  return {
    inputPath: argValue("--input"),
    write: argv.includes("--write"),
  };
}

export function createHqiiCandidateQueueUpsertLiveDepsV1(
  getSupabaseAdmin: () => SupabaseClient,
): HqiiCandidateQueueUpsertDepsV1 {
  return { getSupabaseAdmin };
}

export async function runHqiiCandidateQueueUpsertV1(args: {
  rootDir: string;
  inputPath: string;
  write: boolean;
  deps: HqiiCandidateQueueUpsertDepsV1;
  now?: () => Date;
  io_capability?: BuckpartsIoCapabilityV1;
  readText?: (abs: string) => string;
  founderRows?: readonly FounderDecisionRowWithSlugCorrelationV1[];
  recordTruthLedger?: typeof recordTruthLedgerMutationOutcomeV1;
}): Promise<HqiiCandidateQueueUpsertRunResultV1> {
  const recordTruthLedger = args.recordTruthLedger ?? recordTruthLedgerMutationOutcomeV1;
  const readInput = args.readText ?? ((abs: string) => fs.readFileSync(abs, "utf8"));

  const abs = path.resolve(args.rootDir, args.inputPath);
  const parsed = JSON.parse(readInput(abs)) as unknown;
  if (!Array.isArray(parsed)) {
    throw new Error("Input must be a JSON array.");
  }

  const rows = (parsed as QueueInputRow[]).map((row) => ({
    wedge: catalogWedgeFromInput(row.wedge),
    draft: buildQueueRowDraft(row),
  }));

  const idBySlugByWedge = new Map<CatalogWedge, Map<string, string>>();
  const supabase = args.deps.getSupabaseAdmin();

  for (const w of CATALOG_WEDGES) {
    const slugs = [
      ...new Set(
        rows.filter((r) => r.wedge === w).map((r) => r.draft.filter_slug).filter(Boolean),
      ),
    ];
    if (slugs.length === 0) continue;
    const { table } = WEDGE_TABLE_FK[w];
    const { data, error } = await supabase.from(table).select("id, slug").in("slug", slugs);
    if (error) throw error;
    idBySlugByWedge.set(
      w,
      new Map((data ?? []).map((row) => [String(row.slug), String(row.id)])),
    );
  }

  const accepted: { wedge: CatalogWedge; draft: QueueRowDraft; entityId: string }[] = [];
  const rejectedUnknownSlug = rows
    .filter(({ wedge, draft }) => !idBySlugByWedge.get(wedge)?.has(draft.filter_slug))
    .map(({ draft }) => draft.filter_slug);

  for (const { wedge, draft } of rows) {
    const entityId = idBySlugByWedge.get(wedge)?.get(draft.filter_slug);
    if (entityId) accepted.push({ wedge, draft, entityId });
  }

  const stateCounts = rows.reduce(
    (acc, { draft: d }) => {
      acc[d.candidate_state] = (acc[d.candidate_state] ?? 0) + 1;
      return acc;
    },
    {} as Record<string, number>,
  );

  const baseReport: HqiiCandidateQueueUpsertReportV1 = {
    dry_run: !args.write,
    input_count: rows.length,
    matched_filter_slugs: accepted.length,
    unknown_filter_slugs: rejectedUnknownSlug,
    state_counts: stateCounts,
    inserted: 0,
    updated: 0,
    rows: rows.map((r) => r.draft),
  };

  if (!args.write) {
    return { report: baseReport, exit_code: 0 };
  }

  const preflight: HqiiCandidateQueueUpsertMutationPreflightV1 =
    buildHqiiCandidateQueueUpsertMutationPreflightV1({
      rootDir: args.rootDir,
      mode: "write",
      inputRelPath: args.inputPath,
      io_capability: args.io_capability,
      now: args.now,
      readText: args.readText,
      founderRows: args.founderRows,
    });
  const mutation_authorized = hqiiCandidateQueueUpsertMutationAuthorizedV1(preflight);
  const blockers = [...preflight.blockers];

  let inserted = 0;
  let updated = 0;

  if (mutation_authorized && accepted.length > 0) {
    for (const { wedge, draft, entityId } of accepted) {
      const { fkColumn } = WEDGE_TABLE_FK[wedge];

      const { data: existing, error: existingErr } = await supabase
        .from("retailer_offer_candidates")
        .select("id")
        .eq(fkColumn, entityId)
        .eq("retailer_key", draft.retailer_key)
        .eq("validation_status", "pending")
        .limit(1);
      if (existingErr) throw existingErr;

      const payload = buildOfferCandidatePayload(fkColumn, entityId, draft);

      if ((existing ?? []).length > 0) {
        const id = String(existing![0]!.id);
        const { error: updateErr } = await supabase
          .from("retailer_offer_candidates")
          .update(payload)
          .eq("id", id);
        if (updateErr) throw updateErr;
        updated += 1;
      } else {
        const { error: insertErr } = await supabase
          .from("retailer_offer_candidates")
          .insert(payload);
        if (insertErr) throw insertErr;
        inserted += 1;
      }
    }
  }

  let apply_status: HqiiCandidateQueueUpsertApplyStatusV1 =
    blockers.length > 0 ? "BLOCKED" : "APPLIED";

  const applyOutcome: TruthLedgerMutationApplyOutcomeV1 =
    apply_status === "BLOCKED" ? "blocked" : "applied";
  const record = recordTruthLedger({
    rootDir: args.rootDir,
    io_capability: TRUTH_LEDGER_IO_ON_WRITE_INTENT_V1,
    mutation_lane: HQII_CANDIDATE_QUEUE_UPSERT_MUTATION_LANE_V1,
    founder_decision_id: preflight.founder_decision_id,
    apply_outcome: applyOutcome,
    blockers,
    now: args.now,
  });
  if (!record.ok) {
    blockers.push(...record.blockers);
    apply_status = "BLOCKED";
  }

  return {
    report: {
      ...baseReport,
      dry_run: false,
      inserted,
      updated,
      apply_status,
      mutation_authorized: mutation_authorized && apply_status === "APPLIED",
      mutation_preflight_blockers: blockers,
      founder_decision_id: preflight.founder_decision_id,
    },
    exit_code: apply_status === "BLOCKED" ? 1 : 0,
  };
}
