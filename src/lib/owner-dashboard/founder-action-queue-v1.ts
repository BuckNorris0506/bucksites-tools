/**
 * Founder Action Queue v1 — read-only prioritization of Command Center signals for founders.
 * PROVEN inputs: fields documented on `FounderActionQueueCommandCenterInput`.
 */

import type { CommandCenterV2Report } from "../../../scripts/lib/buckparts-command-center-v2-types";

export const FOUNDER_ACTION_QUEUE_CONTRACT_V1 = "founder_action_queue_v1" as const;

export type FounderActionQueueRowStatusV1 =
  | "needs_owner"
  | "agent_safe"
  | "blocked"
  | "waiting"
  | "do_not_touch";

export type FounderActionQueueOwnerBurdenV1 = "low" | "medium" | "high";

export type FounderActionQueueActorV1 = "founder" | "agent" | "system" | "external";

export type FounderActionQueueMutationAuthorityV1 =
  | "read_only"
  | "owner_approval_required"
  | "mutating_blocked";

export type FounderActionQueueRowV1 = {
  id: string;
  title: string;
  status: FounderActionQueueRowStatusV1;
  owner_burden: FounderActionQueueOwnerBurdenV1;
  recommended_actor: FounderActionQueueActorV1;
  mutation_authority: FounderActionQueueMutationAuthorityV1;
  evidence_basis: string;
  next_action: string;
};

export type FounderActionQueueCommandCenterInput = {
  next_best_action: string;
  execution_guidance: {
    next_move_mode: string;
    mutating_blocked: boolean;
    mutating_block_reasons: string[];
  };
  command_center_v2: {
    next_owner_action: string;
    amazon_rescue: {
      next_agent_action: string;
      next_owner_action: string;
      human_browser_required_tokens: string[];
      status: string;
    };
    affiliate_readiness: {
      status: string;
      next_owner_action: string;
      next_agent_action: string;
    };
    deploy_live_site_status: {
      status: string;
      live_site_monitor: {
        runtime_status?: string;
        routes?: { ok?: boolean }[];
      } | null;
    };
    unknown_or_human_review: {
      status: string;
      next_owner_action: string;
      blocker: string | null;
    };
  };
};

const READ_ONLY_AGENT_VERB = /\b(read-only|read only|dry-run|dry run|precheck|audit|report|verify|queue review)\b/i;

function burdenFromText(s: string): FounderActionQueueOwnerBurdenV1 {
  const n = s.trim().length;
  if (n >= 280) return "high";
  if (n >= 120) return "medium";
  return "low";
}

function truncate(s: string, max: number): string {
  const t = s.trim();
  if (t.length <= max) return t;
  return `${t.slice(0, max - 1)}…`;
}

/** Sort: needs_owner → agent_safe → blocked/waiting → do_not_touch; then high owner burden first. */
export function sortFounderActionQueueRows(rows: FounderActionQueueRowV1[]): FounderActionQueueRowV1[] {
  const tier = (s: FounderActionQueueRowStatusV1): number => {
    if (s === "needs_owner") return 0;
    if (s === "agent_safe") return 1;
    if (s === "blocked" || s === "waiting") return 2;
    if (s === "do_not_touch") return 3;
    return 2;
  };
  const burdenRank = (b: FounderActionQueueOwnerBurdenV1): number => (b === "high" ? 0 : b === "medium" ? 1 : 2);
  return [...rows].sort((a, b) => {
    const td = tier(a.status) - tier(b.status);
    if (td !== 0) return td;
    return burdenRank(a.owner_burden) - burdenRank(b.owner_burden);
  });
}

function dedupeFounderActionQueueRowsById(rows: FounderActionQueueRowV1[]): FounderActionQueueRowV1[] {
  const seen = new Set<string>();
  const out: FounderActionQueueRowV1[] = [];
  for (const r of rows) {
    if (seen.has(r.id)) continue;
    seen.add(r.id);
    out.push(r);
  }
  return out;
}

function buildAmazonAgentRow(
  input: FounderActionQueueCommandCenterInput,
): FounderActionQueueRowV1 | null {
  const text = input.command_center_v2.amazon_rescue.next_agent_action.trim();
  if (!text) return null;
  const mb = input.execution_guidance.mutating_blocked;
  const readOnlyMode = input.execution_guidance.next_move_mode === "READ_ONLY";
  const looksReadOnly = READ_ONLY_AGENT_VERB.test(text);

  if (mb) {
    return {
      id: "queue-amazon-agent",
      title: "Amazon rescue · agent lane (mutations gated)",
      status: "blocked",
      owner_burden: "medium",
      recommended_actor: "founder",
      mutation_authority: "mutating_blocked",
      evidence_basis: "Command Center execution_guidance.mutating_blocked + v2.amazon_rescue.next_agent_action",
      next_action: truncate(
        `Unblock mutating gates first, then re-read agent guidance: ${text}`,
        420,
      ),
    };
  }
  if (readOnlyMode && looksReadOnly) {
    return {
      id: "queue-amazon-agent",
      title: "Amazon rescue · read-only agent work",
      status: "agent_safe",
      owner_burden: "medium",
      recommended_actor: "agent",
      mutation_authority: "read_only",
      evidence_basis:
        "Command Center v2.amazon_rescue.next_agent_action with read-only/dry-run/precheck language; execution_guidance.next_move_mode=READ_ONLY",
      next_action: truncate(text, 420),
    };
  }
  return {
    id: "queue-amazon-agent",
    title: "Amazon rescue · agent coordination",
    status: "waiting",
    owner_burden: "medium",
    recommended_actor: "agent",
    mutation_authority: "owner_approval_required",
    evidence_basis: "Command Center v2.amazon_rescue.next_agent_action (no proven read-only verb match)",
    next_action: truncate(text, 420),
  };
}

export function buildFounderActionQueueRowsUnsorted(input: FounderActionQueueCommandCenterInput): FounderActionQueueRowV1[] {
  const v2 = input.command_center_v2;
  const rows: FounderActionQueueRowV1[] = [];

  if (v2.next_owner_action.trim() && v2.next_owner_action !== "UNKNOWN") {
    rows.push({
      id: "queue-owner-v2",
      title: "Owner · synthesized Command Center next step",
      status: "needs_owner",
      owner_burden: burdenFromText(v2.next_owner_action),
      recommended_actor: "founder",
      mutation_authority: "owner_approval_required",
      evidence_basis: "Command Center command_center_v2.next_owner_action",
      next_action: truncate(v2.next_owner_action, 480),
    });
  }

  if (input.next_best_action.trim() && input.next_best_action !== "UNKNOWN") {
    rows.push({
      id: "queue-next-best",
      title: "Command Center · next best action",
      status: "needs_owner",
      owner_burden: burdenFromText(input.next_best_action),
      recommended_actor: "founder",
      mutation_authority: "read_only",
      evidence_basis: "Command Center root next_best_action (interpretation still owner-led)",
      next_action: truncate(input.next_best_action, 480),
    });
  }

  if (input.execution_guidance.mutating_blocked) {
    rows.push({
      id: "queue-mutating-gate",
      title: "Mutating scripts · gate active",
      status: "blocked",
      owner_burden: "high",
      recommended_actor: "founder",
      mutation_authority: "mutating_blocked",
      evidence_basis: "Command Center execution_guidance.mutating_blocked + mutating_block_reasons",
      next_action: truncate(
        input.execution_guidance.mutating_block_reasons.join(" · ") || "Review execution_guidance in Command Center JSON.",
        480,
      ),
    });
  }

  const hb = v2.amazon_rescue.human_browser_required_tokens ?? [];
  if (hb.length > 0) {
    rows.push({
      id: "queue-human-browser",
      title: "Human browser verification required",
      status: "needs_owner",
      owner_burden: "high",
      recommended_actor: "founder",
      mutation_authority: "read_only",
      evidence_basis: "Command Center v2.amazon_rescue.human_browser_required_tokens",
      next_action: truncate(`Review tokens on Amazon PDP with exact-token discipline: ${hb.slice(0, 8).join(", ")}`, 480),
    });
  }

  const mon = v2.deploy_live_site_status.live_site_monitor;
  const rt = mon?.runtime_status;
  const routes = mon?.routes;
  const routesBad =
    Array.isArray(routes) && routes.length > 0 ? routes.some((r) => r.ok === false) : false;
  if (rt && rt !== "OK") {
    rows.push({
      id: "queue-live-site",
      title: "Live site / deploy monitor",
      status: "blocked",
      owner_burden: "high",
      recommended_actor: "founder",
      mutation_authority: "read_only",
      evidence_basis: "Command Center deploy lane live_site_monitor.runtime_status",
      next_action: truncate(`Live monitor runtime_status=${rt}; fix routes or target before trusting deploy health.`, 420),
    });
  } else if (routesBad) {
    rows.push({
      id: "queue-live-site",
      title: "Live site / deploy monitor",
      status: "waiting",
      owner_burden: "medium",
      recommended_actor: "founder",
      mutation_authority: "read_only",
      evidence_basis: "Command Center deploy lane live_site_monitor.routes",
      next_action: "One or more allowlisted routes failed smoke — triage before expanding monetization work.",
    });
  }

  const aff = v2.affiliate_readiness.status;
  if (aff === "BLOCKED" || aff === "ATTENTION") {
    rows.push({
      id: "queue-affiliate",
      title: "Affiliate readiness",
      status: aff === "BLOCKED" ? "blocked" : "waiting",
      owner_burden: "high",
      recommended_actor: "founder",
      mutation_authority: "owner_approval_required",
      evidence_basis: "Command Center v2.affiliate_readiness.status + next_owner_action",
      next_action: truncate(v2.affiliate_readiness.next_owner_action || "See affiliate readiness lane in dashboard.", 420),
    });
  }

  const unk = v2.unknown_or_human_review;
  if (unk.status === "BLOCKED" || unk.blocker) {
    rows.push({
      id: "queue-unknown-human",
      title: "Unknown / human-review cohort",
      status: "needs_owner",
      owner_burden: "high",
      recommended_actor: "founder",
      mutation_authority: "read_only",
      evidence_basis: "Command Center v2.unknown_or_human_review",
      next_action: truncate(unk.next_owner_action || unk.blocker || "Review unknown/human-review lane.", 420),
    });
  }

  const amazonRow = buildAmazonAgentRow(input);
  if (amazonRow) rows.push(amazonRow);

  if (input.execution_guidance.mutating_block_reasons.length > 0) {
    rows.push({
      id: "queue-do-not-touch-scope",
      title: "Scope guard · do not expand mutating work",
      status: "do_not_touch",
      owner_burden: "low",
      recommended_actor: "system",
      mutation_authority: "mutating_blocked",
      evidence_basis: "Command Center execution_guidance (mutating risk callouts)",
      next_action: "Do not run repo mutating scripts or retailer writes until gates clear — use read-only reports only.",
    });
  }

  return rows;
}

export function buildFounderActionQueueV1(input: FounderActionQueueCommandCenterInput): {
  contract: typeof FOUNDER_ACTION_QUEUE_CONTRACT_V1;
  rows: FounderActionQueueRowV1[];
} {
  const unsorted = buildFounderActionQueueRowsUnsorted(input);
  const sorted = dedupeFounderActionQueueRowsById(sortFounderActionQueueRows(unsorted));
  let out = sorted.slice(0, 7);
  if (out.length < 3) {
    out = dedupeFounderActionQueueRowsById(
      sortFounderActionQueueRows([
        ...out,
        {
          id: "queue-pad-routine",
          title: "Routine · refresh this dashboard",
          status: "waiting",
          owner_burden: "low",
          recommended_actor: "founder",
          mutation_authority: "read_only",
          evidence_basis: "Founder Action Queue v1 padding rule (min 3 rows)",
          next_action: "Reload owner dashboard after meaningful repo or Command Center changes.",
        },
        {
          id: "queue-pad-ci",
          title: "Routine · CI read-only checks",
          status: "agent_safe",
          owner_burden: "low",
          recommended_actor: "agent",
          mutation_authority: "read_only",
          evidence_basis: "GitHub workflows buckparts-daily-operator.yml / buckparts-founder-digest.yml (repo files)",
          next_action: "Keep scheduled read-only workflows green; no production mutation implied.",
        },
      ]),
    ).slice(0, 7);
  }
  return { contract: FOUNDER_ACTION_QUEUE_CONTRACT_V1, rows: out };
}

/** Markdown fragment for founder digest (short table, founder-readable). */
export function formatFounderActionQueueForDigest(rows: FounderActionQueueRowV1[]): string {
  if (rows.length === 0) return "_No queue rows._\n";
  const lines = [
    "| Priority | Title | Status | Actor | Next step |",
    "| --- | --- | --- | --- | --- |",
    ...rows.map((r, i) => {
      const step = r.next_action.replace(/\|/g, "\\|").replace(/\n/g, " ");
      return `| ${i + 1} | ${r.title.replace(/\|/g, "\\|")} | ${r.status} | ${r.recommended_actor} | ${truncate(step, 120)} |`;
    }),
  ];
  return `${lines.join("\n")}\n`;
}

/** Same Command Center envelope the owner dashboard uses after `loadCommandCenterReportForOwner()`. */
export type OwnerDashboardCommandCenterEnvelope = {
  next_best_action: string;
  execution_guidance: {
    next_move_mode: string;
    mutating_blocked: boolean;
    mutating_block_reasons: string[];
  };
  command_center_v2: CommandCenterV2Report;
};

export function buildFounderActionQueueForOwnerDashboard(
  report: OwnerDashboardCommandCenterEnvelope,
): ReturnType<typeof buildFounderActionQueueV1> {
  const v2 = report.command_center_v2;
  return buildFounderActionQueueV1({
    next_best_action: report.next_best_action,
    execution_guidance: {
      next_move_mode: report.execution_guidance.next_move_mode,
      mutating_blocked: report.execution_guidance.mutating_blocked,
      mutating_block_reasons: report.execution_guidance.mutating_block_reasons ?? [],
    },
    command_center_v2: {
      next_owner_action: v2.next_owner_action,
      amazon_rescue: {
        next_agent_action: v2.amazon_rescue.next_agent_action,
        next_owner_action: v2.amazon_rescue.next_owner_action,
        human_browser_required_tokens: v2.amazon_rescue.human_browser_required_tokens,
        status: v2.amazon_rescue.status,
      },
      affiliate_readiness: {
        status: v2.affiliate_readiness.status,
        next_owner_action: v2.affiliate_readiness.next_owner_action,
        next_agent_action: v2.affiliate_readiness.next_agent_action,
      },
      deploy_live_site_status: {
        status: v2.deploy_live_site_status.status,
        live_site_monitor: v2.deploy_live_site_status.live_site_monitor,
      },
      unknown_or_human_review: {
        status: v2.unknown_or_human_review.status,
        next_owner_action: v2.unknown_or_human_review.next_owner_action,
        blocker: v2.unknown_or_human_review.blocker ?? null,
      },
    },
  });
}

function asRecord(o: unknown): Record<string, unknown> | null {
  return o && typeof o === "object" ? (o as Record<string, unknown>) : null;
}

function strProp(o: unknown, key: string, fallback = ""): string {
  const r = asRecord(o);
  if (!r) return fallback;
  const v = r[key];
  return typeof v === "string" ? v : fallback;
}

function boolProp(o: unknown, key: string): boolean {
  const r = asRecord(o);
  if (!r || !(key in r)) return false;
  return Boolean(r[key]);
}

function strArrProp(o: unknown, key: string): string[] {
  const r = asRecord(o);
  if (!r || !Array.isArray(r[key])) return [];
  return (r[key] as unknown[]).filter((x): x is string => typeof x === "string");
}

function blockerProp(o: unknown, key: string): string | null {
  const r = asRecord(o);
  if (!r || !(key in r)) return null;
  const v = r[key];
  if (v === null) return null;
  return typeof v === "string" ? v : null;
}

/**
 * Parse a Command Center JSON object (e.g. founder digest) into the queue input contract.
 * Missing nested objects default conservatively so the digest never throws on partial JSON.
 */
export function founderActionQueueInputFromCommandCenterJson(cc: unknown): FounderActionQueueCommandCenterInput {
  const root = asRecord(cc) ?? {};
  const eg = asRecord(root.execution_guidance) ?? {};
  const v2 = asRecord(root.command_center_v2) ?? {};
  const amazon = asRecord(v2.amazon_rescue) ?? {};
  const affiliate = asRecord(v2.affiliate_readiness) ?? {};
  const deploy = asRecord(v2.deploy_live_site_status) ?? {};
  const unk = asRecord(v2.unknown_or_human_review) ?? {};
  const monitorRaw = deploy.live_site_monitor;
  let live_site_monitor: FounderActionQueueCommandCenterInput["command_center_v2"]["deploy_live_site_status"]["live_site_monitor"] =
    null;
  if (monitorRaw && typeof monitorRaw === "object") {
    const m = asRecord(monitorRaw) ?? {};
    const routesRaw = m.routes;
    const routes = Array.isArray(routesRaw)
      ? routesRaw.map((item) => {
          const rr = asRecord(item);
          if (!rr || !("ok" in rr)) return { ok: false };
          return { ok: Boolean(rr.ok) };
        })
      : undefined;
    live_site_monitor = {
      runtime_status: typeof m.runtime_status === "string" ? m.runtime_status : undefined,
      routes,
    };
  }
  return {
    next_best_action: strProp(root, "next_best_action", "UNKNOWN"),
    execution_guidance: {
      next_move_mode: strProp(eg, "next_move_mode", "UNKNOWN"),
      mutating_blocked: boolProp(eg, "mutating_blocked"),
      mutating_block_reasons: strArrProp(eg, "mutating_block_reasons"),
    },
    command_center_v2: {
      next_owner_action: strProp(v2, "next_owner_action", "UNKNOWN"),
      amazon_rescue: {
        next_agent_action: strProp(amazon, "next_agent_action"),
        next_owner_action: strProp(amazon, "next_owner_action"),
        human_browser_required_tokens: strArrProp(amazon, "human_browser_required_tokens"),
        status: strProp(amazon, "status", "UNKNOWN"),
      },
      affiliate_readiness: {
        status: strProp(affiliate, "status", "UNKNOWN"),
        next_owner_action: strProp(affiliate, "next_owner_action"),
        next_agent_action: strProp(affiliate, "next_agent_action"),
      },
      deploy_live_site_status: {
        status: strProp(deploy, "status", "UNKNOWN"),
        live_site_monitor,
      },
      unknown_or_human_review: {
        status: strProp(unk, "status", "UNKNOWN"),
        next_owner_action: strProp(unk, "next_owner_action"),
        blocker: blockerProp(unk, "blocker"),
      },
    },
  };
}
