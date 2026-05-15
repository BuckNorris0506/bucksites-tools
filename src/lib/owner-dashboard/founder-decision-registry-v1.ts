/**
 * Founder Decision Registry v1 — pure types + validation for durable owner decisions.
 * PROVEN: no I/O, no agents, no Runner wiring; does not alter Founder Decision Packet eligibility.
 */

export const FOUNDER_DECISION_REGISTRY_CONTRACT_V1 = "founder_decision_registry_v1" as const;

/** Short footer appended to each decision packet’s recommended block (registry pointer only). */
export const FOUNDER_DECISION_REGISTRY_PACKET_FOOTER_V1 =
  "**PROVEN:** After you decide, record structured state in **Founder Decision Registry v1** (`docs/BuckParts-FOUNDER-DECISION-REGISTRY.md`). **INFERRED:** No repo automation consumes registry files yet — this does not change packet eligibility or Runner allowlists.";

/** Plain sentence for React owner dashboard (no markdown emphasis). */
export const FOUNDER_DECISION_REGISTRY_OWNER_DASHBOARD_LINE_V1 =
  "Record approve / reject / defer in Founder Decision Registry v1 (docs/BuckParts-FOUNDER-DECISION-REGISTRY.md; optional data/owner-decisions/). Digest and dashboard surface read-model counts only — BuckParts automation does not act on registry rows.";

/** Short hint for digest / dashboard headers (single source of truth). */
export const FOUNDER_DECISION_REGISTRY_DIGEST_HINT_V1 =
  "**PROVEN:** Record approve / reject / defer outcomes in **Founder Decision Registry v1** (`docs/BuckParts-FOUNDER-DECISION-REGISTRY.md`; optional row files under `data/owner-decisions/` per README). **PROVEN:** Weekly digest also embeds **read model v1** counts from the same directory (machine-parseable JSON stdout: `node --import tsx scripts/report-founder-decision-registry.ts`; see `docs/BuckParts-JSON-STDOUT-CONTRACT.md`). **INFERRED:** Counts are informational — no automation consumes registry rows to change queues, packets, or Runner.";

export type FounderDecisionRegistryDecisionStatusV1 =
  | "approved"
  | "rejected"
  | "deferred"
  | "needs_more_evidence";

export type FounderDecisionRegistryAllowedNextScopeV1 =
  | "none"
  | "read_only_agent"
  | "human_external"
  | "owner_mutation_approved";

export type FounderDecisionRegistryRowV1 = {
  decision_id: string;
  source_queue_row_id: string;
  source_decision_packet_id: string;
  decided_at: string;
  decision_status: FounderDecisionRegistryDecisionStatusV1;
  owner_note: string;
  allowed_next_scope: FounderDecisionRegistryAllowedNextScopeV1;
  /** Optional ISO 8601 — after this instant the row must not be treated as an active standing approval. */
  expires_at?: string | null;
  /** Optional ISO 8601 — founder-scheduled re-read; past instant ⇒ not an active approval. */
  review_after?: string | null;
  /**
   * When `true`, founder attests that evidence gates remain before any mutating work.
   * Required to be `true` when `allowed_next_scope === "owner_mutation_approved"`.
   */
  evidence_required_before_mutation: boolean;
  /** Snapshot of prohibitions that still bind (e.g. copied from the decision packet). */
  prohibited_actions_still_apply: readonly string[];
};

export type FounderDecisionRegistryDocumentV1 = {
  contract: typeof FOUNDER_DECISION_REGISTRY_CONTRACT_V1;
  read_only: true;
  data_mutation: false;
  rows: FounderDecisionRegistryRowV1[];
};

const DECISION_STATUS_LIST: FounderDecisionRegistryDecisionStatusV1[] = [
  "approved",
  "rejected",
  "deferred",
  "needs_more_evidence",
];
const DECISION_STATUSES = new Set(DECISION_STATUS_LIST);

const SCOPE_LIST: FounderDecisionRegistryAllowedNextScopeV1[] = [
  "none",
  "read_only_agent",
  "human_external",
  "owner_mutation_approved",
];
const SCOPES = new Set(SCOPE_LIST);

function isNonEmptyString(v: unknown): v is string {
  return typeof v === "string" && v.trim().length > 0;
}

function parseIsoInstant(label: string, v: unknown): string | null | undefined {
  if (v === undefined) return undefined;
  if (v === null) return null;
  if (typeof v !== "string" || v.trim().length === 0) {
    return undefined;
  }
  const t = Date.parse(v);
  if (Number.isNaN(t)) {
    throw new Error(`${label} must be a parseable ISO 8601 string`);
  }
  return v.trim();
}

export function validateFounderDecisionRegistryRowV1(
  input: unknown,
): { ok: true; row: FounderDecisionRegistryRowV1 } | { ok: false; errors: string[] } {
  const errors: string[] = [];
  if (input === null || typeof input !== "object" || Array.isArray(input)) {
    return { ok: false, errors: ["row must be a non-null object"] };
  }
  const o = input as Record<string, unknown>;

  if (!isNonEmptyString(o.decision_id)) errors.push("decision_id must be a non-empty string");
  if (!isNonEmptyString(o.source_queue_row_id)) errors.push("source_queue_row_id must be a non-empty string");
  if (!isNonEmptyString(o.source_decision_packet_id)) {
    errors.push("source_decision_packet_id must be a non-empty string");
  }
  if (!isNonEmptyString(o.decided_at)) {
    errors.push("decided_at must be a non-empty ISO 8601 string");
  } else if (Number.isNaN(Date.parse(o.decided_at))) {
    errors.push("decided_at must parse as a date (ISO 8601)");
  }

  const status = o.decision_status;
  if (typeof status !== "string" || !DECISION_STATUSES.has(status as FounderDecisionRegistryDecisionStatusV1)) {
    errors.push(
      `decision_status must be one of: ${DECISION_STATUS_LIST.join(", ")} (got ${JSON.stringify(status)})`,
    );
  }

  const scope = o.allowed_next_scope;
  if (typeof scope !== "string" || !SCOPES.has(scope as FounderDecisionRegistryAllowedNextScopeV1)) {
    errors.push(`allowed_next_scope must be one of: ${SCOPE_LIST.join(", ")} (got ${JSON.stringify(scope)})`);
  }

  const owner_note = typeof o.owner_note === "string" ? o.owner_note : "";
  if (scope === "owner_mutation_approved" && owner_note.trim().length === 0) {
    errors.push("owner_mutation_approved requires a non-empty owner_note (explicit founder text)");
  }

  const ev = o.evidence_required_before_mutation;
  if (typeof ev !== "boolean") {
    errors.push("evidence_required_before_mutation must be a boolean");
  } else if (scope === "owner_mutation_approved" && ev !== true) {
    errors.push(
      "owner_mutation_approved requires evidence_required_before_mutation === true (explicit evidence gate before mutation)",
    );
  }

  const prohib = o.prohibited_actions_still_apply;
  if (!Array.isArray(prohib) || prohib.length === 0) {
    errors.push("prohibited_actions_still_apply must be a non-empty array of strings");
  } else if (!prohib.every((x) => typeof x === "string" && x.trim().length > 0)) {
    errors.push("prohibited_actions_still_apply entries must be non-empty strings");
  }

  let expires_at: string | null | undefined;
  let review_after: string | null | undefined;
  try {
    expires_at = parseIsoInstant("expires_at", o.expires_at);
    review_after = parseIsoInstant("review_after", o.review_after);
  } catch (e) {
    errors.push(e instanceof Error ? e.message : String(e));
  }

  if (errors.length > 0) {
    return { ok: false, errors };
  }

  const evidence_required_before_mutation = ev as boolean;
  const row: FounderDecisionRegistryRowV1 = {
    decision_id: (o.decision_id as string).trim(),
    source_queue_row_id: (o.source_queue_row_id as string).trim(),
    source_decision_packet_id: (o.source_decision_packet_id as string).trim(),
    decided_at: (o.decided_at as string).trim(),
    decision_status: o.decision_status as FounderDecisionRegistryDecisionStatusV1,
    owner_note,
    allowed_next_scope: o.allowed_next_scope as FounderDecisionRegistryAllowedNextScopeV1,
    expires_at,
    review_after,
    evidence_required_before_mutation,
    prohibited_actions_still_apply: prohib as string[],
  };
  return { ok: true, row };
}

export function validateFounderDecisionRegistryDocumentV1(
  input: unknown,
): { ok: true; doc: FounderDecisionRegistryDocumentV1 } | { ok: false; errors: string[] } {
  if (input === null || typeof input !== "object" || Array.isArray(input)) {
    return { ok: false, errors: ["document must be a non-null object"] };
  }
  const o = input as Record<string, unknown>;
  const errors: string[] = [];
  if (o.contract !== FOUNDER_DECISION_REGISTRY_CONTRACT_V1) {
    errors.push(`contract must be "${FOUNDER_DECISION_REGISTRY_CONTRACT_V1}"`);
  }
  if (o.read_only !== true) errors.push("read_only must be true");
  if (o.data_mutation !== false) errors.push("data_mutation must be false");
  if (!Array.isArray(o.rows)) {
    errors.push("rows must be an array");
    return { ok: false, errors };
  }
  const rows: FounderDecisionRegistryRowV1[] = [];
  o.rows.forEach((r, i) => {
    const v = validateFounderDecisionRegistryRowV1(r);
    if (!v.ok) {
      errors.push(`rows[${i}]: ${v.errors.join("; ")}`);
    } else {
      rows.push(v.row);
    }
  });
  if (errors.length > 0) return { ok: false, errors };
  return {
    ok: true,
    doc: {
      contract: FOUNDER_DECISION_REGISTRY_CONTRACT_V1,
      read_only: true,
      data_mutation: false,
      rows,
    },
  };
}

/**
 * PROVEN: `read_only_agent` never authorizes mutating repo scripts or production mutation.
 * INFERRED: Only `owner_mutation_approved` can surface as a mutation-shaped scope label — still subject to time bounds.
 */
export function founderRegistryRowGrantsMutatingRepoAuthority(
  row: FounderDecisionRegistryRowV1,
  referenceTimeIso: string,
): boolean {
  return isFounderRegistryRowActiveMutationApproval(row, referenceTimeIso);
}

/** Active “standing approval” for mutation-shaped scope: approved + owner_mutation_approved + not past expires_at/review_after. */
export function isFounderRegistryRowActiveMutationApproval(
  row: FounderDecisionRegistryRowV1,
  referenceTimeIso: string,
): boolean {
  const v = validateFounderDecisionRegistryRowV1(row);
  if (!v.ok) return false;
  const r = v.row;
  if (r.decision_status !== "approved" || r.allowed_next_scope !== "owner_mutation_approved") {
    return false;
  }
  const now = Date.parse(referenceTimeIso);
  if (Number.isNaN(now)) return false;
  if (r.expires_at != null && r.expires_at !== "") {
    const exp = Date.parse(r.expires_at);
    if (!Number.isNaN(exp) && now >= exp) return false;
  }
  if (r.review_after != null && r.review_after !== "") {
    const rev = Date.parse(r.review_after);
    if (!Number.isNaN(rev) && now >= rev) return false;
  }
  return true;
}
