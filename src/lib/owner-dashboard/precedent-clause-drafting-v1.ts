/**
 * Precedent Clause drafting discipline v1 — read-only draft text only.
 *
 * Appends a structured Precedent Clause to Executive recommendation / decision drafts.
 * Uses existing founder_decision_registry_v1 Owner Approval Records (OAR) only.
 * No new stores, no engines, no scoring/weights, no NBA/Dispatch/Daily/CC authority.
 * Prefer UNKNOWN / NONE over invented history.
 */

import { scanFounderDecisionRegistryJsonFilesV1 } from "./founder-decision-registry-scan-v1";
import {
  validateFounderDecisionRegistryDocumentV1,
  type FounderDecisionRegistryDecisionStatusV1,
} from "./founder-decision-registry-v1";

export const PRECEDENT_CLAUSE_DRAFTING_CONTRACT_V1 = "precedent_clause_drafting_v1" as const;

export const CLOSED_DECISION_STATUSES_V1: readonly FounderDecisionRegistryDecisionStatusV1[] = [
  "approved",
  "rejected",
  "deferred",
  "needs_more_evidence",
] as const;

export type ClosedOarPrecedentSubstrateV1 = {
  decision_id: string;
  decision_status: FounderDecisionRegistryDecisionStatusV1;
  decided_at: string;
  source_queue_row_id: string;
  source_decision_packet_id: string;
  /** Optional label list from artifacts when present — never treated as numeric weights. */
  executive_recommendation_decision_priors?: readonly string[];
  source_path?: string;
};

export type PrecedentClauseCurrentDraftV1 = {
  /** Stable class key for matching closed OARs (queue row id, packet id, or ODR class key). */
  decision_class: string;
  recommended_option?: string | null;
  /** Optional prior labels on the current draft — labels only; not weights. */
  decision_priors?: readonly string[];
  draft_status?: "open" | "pending" | "closed" | string;
};

export type PrecedentClauseDraftingV1 = {
  contract: typeof PRECEDENT_CLAUSE_DRAFTING_CONTRACT_V1;
  read_only: true;
  data_mutation: false;
  mutation_authorized: false;
  steering_authority: false;
  nba_authority: false;
  dispatch_authority: false;
  daily_operator_authority: false;
  command_center_authority: false;
  behavior_change: false;
  decision_class: string;
  closed_precedent_count: number;
  /** Exact drafting text to append (markdown-friendly plain lines). */
  precedent_clause: string;
  closed_precedents: ClosedOarPrecedentSubstrateV1[];
  weights_changed: "NONE";
  proven_facts: string[];
  unknown_facts: string[];
};

const CLOSED_STATUS_SET = new Set<string>(CLOSED_DECISION_STATUSES_V1);

function isClosedStatus(status: unknown): status is FounderDecisionRegistryDecisionStatusV1 {
  return typeof status === "string" && CLOSED_STATUS_SET.has(status);
}

/** Class key for founder decision packets / queue rows. */
export function precedentClassForFounderQueueRowV1(sourceQueueRowId: string): string {
  return sourceQueueRowId.trim();
}

/** Class key for Owner Decision Request (ODR) Executive recommendations. */
export function precedentClassForOwnerDecisionRequestV1(decisionType: string): string {
  return `owner_decision_request_v1:${decisionType.trim()}`;
}

/** Class key for owner-approval / packet-shaped drafts. */
export function precedentClassForDecisionPacketIdV1(sourceDecisionPacketId: string): string {
  const id = sourceDecisionPacketId.trim();
  const colon = id.indexOf(":");
  // Keep full packet id when it already encodes the instance; class match also accepts prefix.
  return colon === -1 ? id : id.slice(0, colon);
}

/**
 * Match closed OARs to a decision class without inventing membership.
 * Match when any hold:
 * - source_queue_row_id === class
 * - source_decision_packet_id === class
 * - source_decision_packet_id starts with `${class}:`
 * - packet contract prefix (before `:`) === class
 */
export function oarMatchesPrecedentClassV1(
  oar: Pick<ClosedOarPrecedentSubstrateV1, "source_queue_row_id" | "source_decision_packet_id">,
  decisionClass: string,
): boolean {
  const cls = decisionClass.trim();
  if (!cls) return false;
  const queue = oar.source_queue_row_id.trim();
  const packet = oar.source_decision_packet_id.trim();
  if (queue === cls) return true;
  if (packet === cls) return true;
  if (packet.startsWith(`${cls}:`)) return true;
  const packetPrefix = packet.includes(":") ? packet.slice(0, packet.indexOf(":")) : packet;
  if (packetPrefix === cls) return true;
  return false;
}

export function loadClosedOarPrecedentSubstratesV1(rootDir: string): ClosedOarPrecedentSubstrateV1[] {
  const out: ClosedOarPrecedentSubstrateV1[] = [];
  for (const file of scanFounderDecisionRegistryJsonFilesV1(rootDir)) {
    if (!("parsed" in file)) continue;
    const doc = validateFounderDecisionRegistryDocumentV1(file.parsed);
    if (!doc.ok) continue;
    for (const row of doc.doc.rows) {
      if (!isClosedStatus(row.decision_status)) continue;
      const priors = (row as { executive_recommendation_decision_priors?: unknown })
        .executive_recommendation_decision_priors;
      out.push({
        decision_id: row.decision_id,
        decision_status: row.decision_status,
        decided_at: row.decided_at,
        source_queue_row_id: row.source_queue_row_id,
        source_decision_packet_id: row.source_decision_packet_id,
        source_path: file.source,
        ...(Array.isArray(priors) && priors.every((p) => typeof p === "string")
          ? { executive_recommendation_decision_priors: priors as string[] }
          : {}),
      });
    }
  }
  return out.sort((a, b) => {
    const ta = Date.parse(a.decided_at);
    const tb = Date.parse(b.decided_at);
    if (!Number.isNaN(ta) && !Number.isNaN(tb) && ta !== tb) return tb - ta;
    return a.decision_id.localeCompare(b.decision_id);
  });
}

function formatClosedPrecedentLineV1(oar: ClosedOarPrecedentSubstrateV1): string {
  const src = oar.source_path ? ` source=${oar.source_path}` : "";
  return `- decision_id=${oar.decision_id} status=${oar.decision_status} decided_at=${oar.decided_at} packet=${oar.source_decision_packet_id}${src}`;
}

/**
 * Weights: v1 has no decision-weight / scoring system in-repo.
 * Never invent weight changes. Always NONE.
 */
function formatWeightsChangedLineV1(): { line: string; weights_changed: "NONE" } {
  return { line: "NONE", weights_changed: "NONE" };
}

function formatDifferenceLineV1(args: {
  closed: readonly ClosedOarPrecedentSubstrateV1[];
  current?: PrecedentClauseCurrentDraftV1;
  substrate_supplied: boolean;
}): string {
  if (!args.substrate_supplied) {
    return "UNKNOWN (closed OAR substrate not supplied to draft)";
  }
  if (args.closed.length === 0) {
    return "FIRST CLOSED DECISION OF THIS CLASS";
  }

  const parts: string[] = [];
  const statuses = [...new Set(args.closed.map((c) => c.decision_status))];
  parts.push(
    `class already has ${String(args.closed.length)} closed OAR judgment(s) with status=${statuses.join("|")}`,
  );

  const draftStatus = (args.current?.draft_status ?? "open").trim() || "open";
  if (draftStatus === "open" || draftStatus === "pending") {
    parts.push(`current draft is ${draftStatus} (not yet a closed OAR)`);
  }

  const recommended = args.current?.recommended_option?.trim();
  if (recommended) {
    parts.push(`current executive recommended_option=${recommended}`);
  }

  // Only cite prior statuses — do not invent a causal narrative.
  return parts.join("; ");
}

/**
 * Build the Precedent Clause drafting block from existing closed OARs.
 * When `closed_oar_rows` is null/undefined, do not invent zero closures.
 */
export function buildPrecedentClauseDraftingV1(args: {
  decision_class: string;
  closed_oar_rows?: readonly ClosedOarPrecedentSubstrateV1[] | null;
  current?: Omit<PrecedentClauseCurrentDraftV1, "decision_class">;
}): PrecedentClauseDraftingV1 {
  const decision_class = args.decision_class.trim();
  const substrate_supplied = args.closed_oar_rows !== undefined && args.closed_oar_rows !== null;
  const closed = substrate_supplied
    ? args.closed_oar_rows!.filter((oar) => oarMatchesPrecedentClassV1(oar, decision_class))
    : [];

  const weights = formatWeightsChangedLineV1();
  const difference = formatDifferenceLineV1({
    closed,
    current: { decision_class, ...args.current },
    substrate_supplied,
  });

  let precedent_clause: string;
  if (!substrate_supplied) {
    precedent_clause = [
      "Closed precedents of this class:",
      "UNKNOWN (closed OAR substrate not supplied to draft)",
      "Weights changed since:",
      weights.line,
      "This differs because:",
      difference,
    ].join("\n");
  } else if (closed.length === 0) {
    precedent_clause = [
      "Closed precedents: NONE (zero closures)",
      "Weights changed: NONE",
      "Difference: FIRST CLOSED DECISION OF THIS CLASS",
    ].join("\n");
  } else {
    precedent_clause = [
      "Closed precedents of this class:",
      ...closed.map(formatClosedPrecedentLineV1),
      "Weights changed since:",
      weights.line,
      "This differs because:",
      difference,
    ].join("\n");
  }

  return {
    contract: PRECEDENT_CLAUSE_DRAFTING_CONTRACT_V1,
    read_only: true,
    data_mutation: false,
    mutation_authorized: false,
    steering_authority: false,
    nba_authority: false,
    dispatch_authority: false,
    daily_operator_authority: false,
    command_center_authority: false,
    behavior_change: false,
    decision_class,
    closed_precedent_count: closed.length,
    precedent_clause,
    closed_precedents: closed,
    weights_changed: "NONE",
    proven_facts: [
      "PROVEN: precedent_clause_drafting_v1 is a read-only drafting discipline over existing founder_decision_registry_v1 OAR rows.",
      "PROVEN: weights_changed is NONE — no decision-weight/scoring system exists to cite.",
      "PROVEN: nba_authority=false, dispatch_authority=false, daily_operator_authority=false, command_center_authority=false, behavior_change=false.",
    ],
    unknown_facts: substrate_supplied
      ? []
      : ["UNKNOWN: closed OAR substrate was not supplied; zero closures were not invented."],
  };
}

/** Append Precedent Clause to an existing draft body (drafting only). */
export function appendPrecedentClauseToDraftV1(args: {
  draft_body: string;
  decision_class: string;
  closed_oar_rows?: readonly ClosedOarPrecedentSubstrateV1[] | null;
  current?: Omit<PrecedentClauseCurrentDraftV1, "decision_class">;
}): { draft_body: string; clause: PrecedentClauseDraftingV1 } {
  const clause = buildPrecedentClauseDraftingV1({
    decision_class: args.decision_class,
    closed_oar_rows: args.closed_oar_rows,
    current: args.current,
  });
  const body = args.draft_body.trimEnd();
  const draft_body = [
    body,
    "",
    "---",
    "**Precedent Clause (read-only drafting discipline):**",
    "",
    clause.precedent_clause,
  ].join("\n");
  return { draft_body, clause };
}
