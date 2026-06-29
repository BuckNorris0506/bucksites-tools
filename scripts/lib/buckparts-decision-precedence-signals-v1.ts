/**
 * Decision precedence signal collectors — bridge domain gates to central resolver.
 */

import path from "node:path";

import { buyLinkGateFailureKind } from "@/lib/retailers/launch-buy-links";

import {
  assessGuardedApplyCommittedEvidenceFreshnessV1,
  guardedApplyCommittedEvidenceStaleBlockerV1,
} from "./guarded-apply-committed-evidence-freshness-v1";
import {
  decisionSignalFromDispositionV1,
  type DecisionSignalV1,
} from "./buckparts-decision-precedence-resolver-v1";
import {
  parseSlugEvidenceFileV1,
  isEvidenceFileDeniedForPrecedenceV1,
} from "./fridge-safe-link-evidence-precedence-v1";

export { isEvidenceFileDeniedForPrecedenceV1 } from "./fridge-safe-link-evidence-precedence-v1";

export function decisionSignalsFromBuyLinkRowsV1(args: {
  rows: Array<{
    retailer_key?: string | null;
    affiliate_url?: string | null;
    destination_url?: string | null;
    browser_truth_classification?: string | null;
    browser_truth_buyable_subtype?: string | null;
    browser_truth_checked_at?: string | null;
    browser_truth_notes?: string | null;
  }>;
  homeowner_exposed: boolean;
}): DecisionSignalV1[] {
  const signals: DecisionSignalV1[] = [];
  let anyAllow = false;
  for (const row of args.rows) {
    const url = (row.destination_url ?? row.affiliate_url ?? "").trim();
    const gate = buyLinkGateFailureKind({
      retailer_key: row.retailer_key ?? null,
      affiliate_url: url,
      browser_truth_classification: row.browser_truth_classification ?? null,
      browser_truth_buyable_subtype: row.browser_truth_buyable_subtype ?? null,
      browser_truth_checked_at: row.browser_truth_checked_at ?? null,
      browser_truth_notes: row.browser_truth_notes ?? null,
    });
    if (gate) {
      signals.push(
        decisionSignalFromDispositionV1({
          dimension: "buy_link_gate",
          disposition: "DENY",
          source_contract: "launch_buy_links_v1",
          reason: `buy_link_gate_failure:${gate}`,
          homeowner_exposed: args.homeowner_exposed,
        }),
      );
    } else if (url) {
      anyAllow = true;
    }
  }
  if (anyAllow && signals.every((s) => s.dimension !== "buy_link_gate" || s.disposition !== "DENY")) {
    signals.push(
      decisionSignalFromDispositionV1({
        dimension: "buy_link_gate",
        disposition: "ALLOW",
        source_contract: "launch_buy_links_v1",
        reason: "at_least_one_row_passes_buy_link_gate",
        homeowner_exposed: args.homeowner_exposed,
      }),
    );
  }
  return signals;
}

export function decisionSignalsFromEvidenceFreshnessV1(args: {
  rootDir: string;
  slug: string;
  now?: () => Date;
  evidence_rel_paths?: string[];
  winning_rel_path?: string | null;
  homeowner_exposed: boolean;
}): DecisionSignalV1[] {
  const freshness = assessGuardedApplyCommittedEvidenceFreshnessV1({
    rootDir: args.rootDir,
    slug: args.slug,
    now: args.now,
    evidence_rel_paths: args.evidence_rel_paths,
    winning_rel_path: args.winning_rel_path,
  });
  const blocker = guardedApplyCommittedEvidenceStaleBlockerV1(freshness);
  if (blocker) {
    return [
      decisionSignalFromDispositionV1({
        dimension: "evidence_freshness",
        disposition: "DENY",
        source_contract: "guarded_apply_committed_evidence_freshness_v1",
        reason: blocker,
        homeowner_exposed: args.homeowner_exposed,
      }),
    ];
  }
  if (!freshness.winning_rel_path || freshness.age_days === "UNKNOWN") {
    return [
      decisionSignalFromDispositionV1({
        dimension: "evidence_binding",
        disposition: "UNKNOWN",
        source_contract: "guarded_apply_committed_evidence_freshness_v1",
        reason: freshness.notes,
        homeowner_exposed: args.homeowner_exposed,
      }),
    ];
  }
  return [
    decisionSignalFromDispositionV1({
      dimension: "evidence_freshness",
      disposition: "ALLOW",
      source_contract: "guarded_apply_committed_evidence_freshness_v1",
      reason: freshness.notes,
      homeowner_exposed: args.homeowner_exposed,
    }),
  ];
}

export function decisionSignalsFromEvidenceFileV1(args: {
  rootDir: string;
  rel_path: string;
  readText?: (abs: string) => string;
  homeowner_exposed?: boolean;
}): DecisionSignalV1[] {
  const parsed = parseSlugEvidenceFileV1({
    rootDir: args.rootDir,
    rel_path: args.rel_path,
  });
  let rawText: string | undefined;
  if (args.readText) {
    try {
      rawText = args.readText(path.join(args.rootDir, args.rel_path));
    } catch {
      rawText = undefined;
    }
  }
  const deny = isEvidenceFileDeniedForPrecedenceV1(parsed, rawText);
  if (deny) {
    return [
      decisionSignalFromDispositionV1({
        dimension: deny.includes("wrong_family") ? "wrong_family" : "hard_do_not_use",
        disposition: "DENY",
        source_contract: "fridge_safe_link_evidence_precedence_v1",
        reason: `${deny}:${args.rel_path}`,
        homeowner_exposed: args.homeowner_exposed ?? false,
      }),
    ];
  }
  if (!parsed) {
    return [
      decisionSignalFromDispositionV1({
        dimension: "evidence_binding",
        disposition: "UNKNOWN",
        source_contract: "fridge_safe_link_evidence_precedence_v1",
        reason: `evidence_unparseable:${args.rel_path}`,
      }),
    ];
  }
  return [
    decisionSignalFromDispositionV1({
      dimension: "evidence_binding",
      disposition: "ALLOW",
      source_contract: "fridge_safe_link_evidence_precedence_v1",
      reason: `evidence_eligible:${args.rel_path}`,
    }),
  ];
}

export function decisionSignalsFromStopTheLineV1(args: {
  stop_the_line: boolean;
  source_contract: string;
  reason: string;
  homeowner_exposed?: boolean;
}): DecisionSignalV1[] {
  if (!args.stop_the_line) return [];
  return [
    decisionSignalFromDispositionV1({
      dimension: "stop_the_line_stale_evidence",
      disposition: "DENY",
      source_contract: args.source_contract,
      reason: args.reason,
      homeowner_exposed: args.homeowner_exposed ?? true,
    }),
  ];
}

export function decisionSignalsFromTruthLedgerBlockersV1(args: {
  blockers: string[];
  homeowner_exposed?: boolean;
}): DecisionSignalV1[] {
  if (args.blockers.length === 0) {
    return [
      decisionSignalFromDispositionV1({
        dimension: "execution_plan_hash",
        disposition: "ALLOW",
        source_contract: "truth_ledger_v1",
        reason: "artifact_hashes_verified",
      }),
    ];
  }
  return args.blockers.map((blocker) =>
    decisionSignalFromDispositionV1({
      dimension: blocker.includes("founder")
        ? "founder_approval_binding"
        : "execution_plan_hash",
      disposition: "DENY",
      source_contract: "truth_ledger_v1",
      reason: blocker,
      homeowner_exposed: args.homeowner_exposed ?? false,
    }),
  );
}
