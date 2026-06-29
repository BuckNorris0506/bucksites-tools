/**
 * Decision precedence signal collectors — bridge domain gates to central resolver.
 */

import { existsSync, readFileSync } from "node:fs";
import path from "node:path";

import { buyLinkGateFailureKind } from "@/lib/retailers/launch-buy-links";

import {
  decisionSignalFromDispositionV1,
  type DecisionSignalV1,
} from "./buckparts-decision-precedence-resolver-v1";

const DECISION_PRECEDENCE_COMMITTED_EVIDENCE_MAX_AGE_DAYS_V1 = 45;

type ParsedSlugEvidenceFileV1 = {
  rel_path: string;
  verdict: string | null;
  generated_at: string | null;
  product_attribution: string | null;
  no_safe_pdp: boolean;
  exact_pdp_proven: boolean;
  excluded_evidence_rel_paths: string[];
  supersedes: string | null;
};

function loadJsonRecord(abs: string): Record<string, unknown> | null {
  try {
    return JSON.parse(readFileSync(abs, "utf8")) as Record<string, unknown>;
  } catch {
    return null;
  }
}

function parseSlugEvidenceFileV1(args: {
  rootDir: string;
  rel_path: string;
}): ParsedSlugEvidenceFileV1 | null {
  const abs = path.join(args.rootDir, args.rel_path);
  if (!existsSync(abs)) return null;
  const e = loadJsonRecord(abs);
  if (!e) return null;

  const verdict = typeof e.verdict === "string" ? e.verdict.trim() : null;
  const generated_at =
    typeof e.generated_at === "string" ? e.generated_at.trim() : null;
  const product_attribution =
    typeof e.product_attribution === "string" ? e.product_attribution.trim() : null;
  const noSafe =
    verdict === "NO_SAFE_PDP_FOUND_FROM_OWNER_BROWSER_SEARCH" ||
    verdict === "NO_SAFE_PDP_FOUND";
  const excluded = Array.isArray(e.excluded_evidence_rel_paths)
    ? e.excluded_evidence_rel_paths.filter((x): x is string => typeof x === "string")
    : [];
  const supersedes = typeof e.supersedes === "string" ? e.supersedes.trim() : null;

  return {
    rel_path: args.rel_path,
    verdict,
    generated_at,
    product_attribution,
    no_safe_pdp: noSafe,
    exact_pdp_proven: verdict?.includes("EXACT_PDP_PROVEN") ?? false,
    excluded_evidence_rel_paths: excluded,
    supersedes,
  };
}

export function isEvidenceFileDeniedForPrecedenceV1(
  parsed: ParsedSlugEvidenceFileV1 | null,
  rawText?: string,
): string | null {
  if (!parsed) return "evidence_file_missing";
  if (parsed.no_safe_pdp) return "no_safe_pdp_verdict";
  const verdict = (parsed.verdict ?? "").toUpperCase();
  if (verdict.includes("HARD_DO_NOT_USE")) return "hard_do_not_use_verdict";
  if (rawText) {
    const upper = rawText.toUpperCase();
    if (upper.includes("HARD_DO_NOT_USE")) return "hard_do_not_use_in_artifact";
    if (upper.includes('"WRONG_FAMILY"') || upper.includes("WRONG_FAMILY")) {
      return "wrong_family_in_artifact";
    }
  }
  return null;
}

function evidenceVerdictStrengthV1(parsed: ParsedSlugEvidenceFileV1): number {
  const verdict = parsed.verdict ?? "";
  if (parsed.exact_pdp_proven) {
    let score = 300;
    if (parsed.product_attribution === "oem_official") score += 20;
    if (parsed.product_attribution === "aftermarket_compatible") score -= 10;
    return score;
  }
  if (parsed.no_safe_pdp) return 10;
  if (verdict === "UNKNOWN") return 20;
  if (verdict.includes("PROVEN") || verdict.includes("PASS")) return 100;
  return 30;
}

function generatedAtMsV1(generated_at: string | null): number {
  if (!generated_at) return 0;
  const ms = Date.parse(generated_at);
  return Number.isFinite(ms) ? ms : 0;
}

function resolveWinningRepoEvidenceVerdictV1(args: {
  rootDir: string;
  evidence_rel_paths: string[];
}): {
  winning_rel_path: string | null;
  generated_at: string | null;
} {
  const parsed = args.evidence_rel_paths
    .map((rel) => parseSlugEvidenceFileV1({ rootDir: args.rootDir, rel_path: rel }))
    .filter((p): p is ParsedSlugEvidenceFileV1 => p !== null);

  if (parsed.length === 0) {
    return { winning_rel_path: null, generated_at: null };
  }

  const excluded = new Set<string>();
  for (const file of parsed) {
    for (const rel of file.excluded_evidence_rel_paths) {
      excluded.add(rel);
    }
    if (file.supersedes) {
      excluded.add(file.supersedes);
    }
  }

  const eligible = parsed.filter((file) => {
    if (excluded.has(file.rel_path)) return false;
    return isEvidenceFileDeniedForPrecedenceV1(file) === null;
  });
  if (eligible.length === 0) {
    return { winning_rel_path: null, generated_at: null };
  }

  const ranked = [...eligible].sort((a, b) => {
    const strengthDelta = evidenceVerdictStrengthV1(b) - evidenceVerdictStrengthV1(a);
    if (strengthDelta !== 0) return strengthDelta;
    return generatedAtMsV1(b.generated_at) - generatedAtMsV1(a.generated_at);
  });

  const winner = ranked[0] ?? null;
  return {
    winning_rel_path: winner?.rel_path ?? null,
    generated_at: winner?.generated_at ?? null,
  };
}

function assessCommittedEvidenceFreshnessForPrecedenceV1(args: {
  rootDir: string;
  slug: string;
  now?: () => Date;
  evidence_rel_paths?: string[];
  winning_rel_path?: string | null;
}): {
  winning_rel_path: string | null;
  generated_at: string | null;
  age_days: number | "UNKNOWN";
  fresh: boolean;
  notes: string;
} {
  const now = args.now ?? (() => new Date());
  const maxAgeDays = DECISION_PRECEDENCE_COMMITTED_EVIDENCE_MAX_AGE_DAYS_V1;
  const slug = args.slug.trim().toLowerCase();
  const evidenceRelPaths = args.evidence_rel_paths ?? [];

  const winning =
    args.winning_rel_path != null
      ? {
          winning_rel_path: args.winning_rel_path,
          generated_at:
            parseSlugEvidenceFileV1({
              rootDir: args.rootDir,
              rel_path: args.winning_rel_path,
            })?.generated_at ?? null,
        }
      : resolveWinningRepoEvidenceVerdictV1({
          rootDir: args.rootDir,
          evidence_rel_paths: evidenceRelPaths,
        });

  if (!winning.winning_rel_path) {
    return {
      winning_rel_path: null,
      generated_at: null,
      age_days: "UNKNOWN",
      fresh: false,
      notes: `no winning committed evidence for slug=${slug}`,
    };
  }

  const generatedAt = winning.generated_at;
  if (!generatedAt) {
    return {
      winning_rel_path: winning.winning_rel_path,
      generated_at: null,
      age_days: "UNKNOWN",
      fresh: false,
      notes: `missing or invalid generated_at on ${winning.winning_rel_path}`,
    };
  }

  const ms = Date.parse(generatedAt);
  if (!Number.isFinite(ms)) {
    return {
      winning_rel_path: winning.winning_rel_path,
      generated_at: generatedAt,
      age_days: "UNKNOWN",
      fresh: false,
      notes: `missing or invalid generated_at on ${winning.winning_rel_path}`,
    };
  }

  const ageDays = (now().getTime() - ms) / 86_400_000;
  const fresh = ageDays <= maxAgeDays;
  return {
    winning_rel_path: winning.winning_rel_path,
    generated_at: generatedAt,
    age_days: ageDays,
    fresh,
    notes: fresh
      ? `evidence age ${ageDays.toFixed(1)}d within ${String(maxAgeDays)}d`
      : `evidence stale generated_at=${generatedAt} age=${ageDays.toFixed(1)}d exceeds ${String(maxAgeDays)}d`,
  };
}

function committedEvidenceStaleBlockerV1(freshness: {
  fresh: boolean;
  winning_rel_path: string | null;
  age_days: number | "UNKNOWN";
  generated_at: string | null;
}): string | null {
  if (freshness.fresh) return null;
  if (
    typeof freshness.age_days === "number" &&
    freshness.age_days > DECISION_PRECEDENCE_COMMITTED_EVIDENCE_MAX_AGE_DAYS_V1
  ) {
    return "committed_evidence_stale_beyond_max_age";
  }
  if (!freshness.winning_rel_path || freshness.age_days === "UNKNOWN") {
    return "committed_evidence_freshness_unknown";
  }
  return "committed_evidence_stale_beyond_max_age";
}

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
  const freshness = assessCommittedEvidenceFreshnessForPrecedenceV1({
    rootDir: args.rootDir,
    slug: args.slug,
    now: args.now,
    evidence_rel_paths: args.evidence_rel_paths,
    winning_rel_path: args.winning_rel_path,
  });
  const blocker = committedEvidenceStaleBlockerV1(freshness);
  if (blocker) {
    return [
      decisionSignalFromDispositionV1({
        dimension: "evidence_freshness",
        disposition: "DENY",
        source_contract: "decision_precedence_committed_evidence_freshness_v1",
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
        source_contract: "decision_precedence_committed_evidence_freshness_v1",
        reason: freshness.notes,
        homeowner_exposed: args.homeowner_exposed,
      }),
    ];
  }
  return [
    decisionSignalFromDispositionV1({
      dimension: "evidence_freshness",
      disposition: "ALLOW",
      source_contract: "decision_precedence_committed_evidence_freshness_v1",
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
        source_contract: "decision_precedence_evidence_precedence_v1",
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
        source_contract: "decision_precedence_evidence_precedence_v1",
        reason: `evidence_unparseable:${args.rel_path}`,
      }),
    ];
  }
  return [
    decisionSignalFromDispositionV1({
      dimension: "evidence_binding",
      disposition: "ALLOW",
      source_contract: "decision_precedence_evidence_precedence_v1",
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
