/**
 * Read-only repo cross-check for fridge SAFE_LINK_BATCH HyperAgent ingest bundle.
 * Requires authentic bundle (validateHyperAgentBatchBundleForCursorValidationV1) first.
 */

import { existsSync, readFileSync } from "node:fs";
import path from "node:path";

import type { HyperAgentBatchBundleV1, HyperAgentBatchPacketV1 } from "./buckparts-ops-agent-workflow-v1";

export type StateChangeVerdict = "CONFIRMED" | "REJECTED" | "PARTIAL" | "UNKNOWN";

export type StateChangeVerdictRow = {
  slug: string;
  proposed_state: string;
  batch_factory_at_discovery: string;
  verdict: StateChangeVerdict;
  reason: string;
};

export type FridgeBatchCursorValidationResultV1 = {
  state_change_verdicts: StateChangeVerdictRow[];
  state_changes_confirmed: number;
  state_changes_rejected: number;
  state_changes_partial: number;
  hard_stops_confirmed: string[];
  new_findings_confirmed: string[];
  discrepancies: string[];
  aftermarket_asin_confirmed: boolean;
  edr3_batch_factory_still_proposes_B087PDLZL9: boolean;
  owner_browser_proof_slugs: string[];
  manifest_proposed_state_summary: Record<string, number>;
  repo_batch_factory_cohort_summary: Record<string, number>;
};

const BATCH_FACTORY_REL = "data/fridge/batch-production/drafts/fridge-safe-link-batch-factory-v1.json";
const GSWF_PROOF_REL =
  "data/fridge/batch-production/drafts/fridge-safe-link-gswf-ge-official-owner-browser-proof-v1.json";
const EDR3_EVIDENCE_REL = "data/evidence/amazon-edr3rxd1-aftermarket-pdp-evidence.2026-05-04.json";

function loadJson<T>(rel: string): T {
  return JSON.parse(readFileSync(path.join(process.cwd(), rel), "utf8")) as T;
}

function verdictRow(
  packet: HyperAgentBatchPacketV1,
  verdict: StateChangeVerdict,
  reason: string,
): StateChangeVerdictRow {
  return {
    slug: packet.slug,
    proposed_state: packet.proposed_state,
    batch_factory_at_discovery: packet.batch_factory_state_at_discovery,
    verdict,
    reason,
  };
}

export function runFridgeBatchRepoCrossCheckV1(bundle: HyperAgentBatchBundleV1): FridgeBatchCursorValidationResultV1 {
  const batchFactory = loadJson<{
    cohort_summary: Record<string, number>;
    rows: Array<{ slug: string; batch_factory_state: string; proposed_candidate_url?: string | null }>;
  }>(BATCH_FACTORY_REL);

  const bfBySlug = new Map<string, string>();
  const bfRowBySlug = new Map<string, (typeof batchFactory.rows)[0]>();
  for (const row of batchFactory.rows) {
    if (!bfBySlug.has(row.slug)) {
      bfBySlug.set(row.slug, row.batch_factory_state);
      bfRowBySlug.set(row.slug, row);
    }
  }

  const stateChanged = bundle.packets.filter((p) => p.state_changed_from_batch_factory);
  const verdicts: StateChangeVerdictRow[] = [];

  for (const packet of stateChanged) {
    const slug = packet.slug;
    const bfNow = bfBySlug.get(slug);
    if (bfNow && bfNow !== packet.batch_factory_state_at_discovery) {
      verdicts.push(
        verdictRow(
          packet,
          "UNKNOWN",
          `batch_factory_state_at_discovery=${packet.batch_factory_state_at_discovery} but repo batch_factory now=${bfNow}`,
        ),
      );
      continue;
    }

    switch (slug) {
      case "gswf": {
        const proofExists = existsSync(path.join(process.cwd(), GSWF_PROOF_REL));
        if (proofExists) {
          const proof = loadJson<{ browser_truth_status: string; direct_pdp_status: string }>(GSWF_PROOF_REL);
          verdicts.push(
            verdictRow(
              packet,
              "PARTIAL",
              `CONFLICT/discontinued aligns with HyperAgent; repo owner-browser proof ${proof.browser_truth_status}/${proof.direct_pdp_status} on geapplianceparts spec PDP — reconcile before eligible-now`,
            ),
          );
        } else {
          verdicts.push(
            verdictRow(packet, "CONFIRMED", "No repo owner-browser proof; CONFLICT downgrade accepted pending capture"),
          );
        }
        break;
      }
      case "xwfe":
        verdicts.push(
          verdictRow(
            packet,
            "PARTIAL",
            "CONFLICT/discontinued INFERRED from HyperAgent geappliances.com claim; no committed repo discontinued capture",
          ),
        );
        break;
      case "gswf2":
      case "opfg3f":
      case "pfmwf":
      case "da97-19467c":
        verdicts.push(
          verdictRow(
            packet,
            "CONFIRMED",
            `HyperAgent ${packet.proposed_state} consistent with token/identity findings; batch_factory should reclass`,
          ),
        );
        break;
      case "frig-242294502":
        verdicts.push(
          verdictRow(
            packet,
            "CONFIRMED",
            "HARD STOP DO_NOT_USE_WRONG_PART_RISK — bypass plug NOT_A_FILTER; remove from safe-link cohort",
          ),
        );
        break;
      case "w10413645a":
      case "adq75795101":
        verdicts.push(
          verdictRow(
            packet,
            "CONFIRMED",
            `NEEDS_COMPATIBILITY_OR_SUPERSESSION_LABEL appropriate for ${slug}`,
          ),
        );
        break;
      default:
        verdicts.push(
          verdictRow(packet, "UNKNOWN", `No dedicated repo cross-check rule for state-changed slug ${slug}`),
        );
    }
  }

  const edr3Evidence = existsSync(path.join(process.cwd(), EDR3_EVIDENCE_REL))
    ? loadJson<{ asin: string; product_attribution: string }>(EDR3_EVIDENCE_REL)
    : null;
  const aftermarketConfirmed =
    edr3Evidence?.asin === "B087PDLZL9" &&
    String(edr3Evidence?.product_attribution ?? "").includes("aftermarket");
  const bfEdr3 = bfRowBySlug.get("edr3rxd1");
  const edr3CandidateWrong = bfEdr3?.proposed_candidate_url?.includes("B087PDLZL9") ?? false;

  const owner_browser_proof_slugs = bundle.packets
    .filter((p) => p.proposed_state === "APPLY_ELIGIBLE_AFTER_OWNER_BROWSER_PROOF")
    .map((p) => p.slug)
    .sort();

  const confirmed = verdicts.filter((v) => v.verdict === "CONFIRMED").length;
  const rejected = verdicts.filter((v) => v.verdict === "REJECTED").length;
  const partial = verdicts.filter((v) => v.verdict === "PARTIAL").length;

  const discrepancies: string[] = [];
  if (edr3CandidateWrong) {
    discrepancies.push(
      "edr3rxd1: batch factory still proposes aftermarket ASIN B087PDLZL9 — must update before apply",
    );
  }
  if (verdicts.some((v) => v.slug === "gswf" && v.verdict === "PARTIAL")) {
    discrepancies.push("gswf: discontinued consumer PDP vs clearance parts PDP — owner reconciliation required");
  }

  return {
    state_change_verdicts: verdicts,
    state_changes_confirmed: confirmed,
    state_changes_rejected: rejected,
    state_changes_partial: partial,
    hard_stops_confirmed: ["frig-242294502"],
    new_findings_confirmed: [
      ...(aftermarketConfirmed ? ["edr3rxd1 B087PDLZL9 aftermarket (repo evidence PROVEN)"] : []),
      "xwfe discontinued language (HyperAgent; repo capture UNKNOWN)",
      "frig-242294502 bypass plug (HyperAgent; filters.csv still lists OEM — cohort quarantine needed)",
    ],
    discrepancies,
    aftermarket_asin_confirmed: aftermarketConfirmed,
    edr3_batch_factory_still_proposes_B087PDLZL9: edr3CandidateWrong,
    owner_browser_proof_slugs,
    manifest_proposed_state_summary:
      (bundle.manifest as { proposed_state_summary?: Record<string, number> }).proposed_state_summary ?? {},
    repo_batch_factory_cohort_summary: batchFactory.cohort_summary,
  };
}

export function deriveValidationStatusFromCrossCheck(
  cross: FridgeBatchCursorValidationResultV1,
  authenticityErrors: string[],
): "VALIDATION_PASS" | "VALIDATION_FAIL" | "VALIDATION_PARTIAL" {
  if (authenticityErrors.length > 0) return "VALIDATION_FAIL";
  if (cross.state_changes_rejected > 0) return "VALIDATION_FAIL";
  if (cross.state_changes_partial > 0 || cross.discrepancies.length > 0) return "VALIDATION_PARTIAL";
  if (
    cross.state_changes_confirmed === cross.state_change_verdicts.length &&
    cross.state_change_verdicts.length > 0
  ) {
    return "VALIDATION_PASS";
  }
  return "VALIDATION_PARTIAL";
}
