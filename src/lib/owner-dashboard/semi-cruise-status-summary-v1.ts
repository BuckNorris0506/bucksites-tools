/**
 * Read-only Semi-Cruise + Netlify credit conservation summary for Command Center v2 and owner dashboard.
 * PROVEN: pure projection over existing CC/neuron/spend-ledger inputs — not a mutation permission source.
 */

import type { CommandCenterV2Report } from "../../../scripts/lib/buckparts-command-center-v2-types";
import type { SpendLedgerEntryV1 } from "../../../scripts/lib/buckparts-spend-ledger-contract-v1";
import type { OwnerCommandCenterNeuronsReport, OwnerNeuronConnectionLevel } from "./owner-command-center-neurons-v1";

export const SEMI_CRUISE_STATUS_SUMMARY_CONTRACT_V1 = "semi_cruise_status_summary_v1" as const;

export type SemiCruiseReadOnlyStatusV1 = "PROVEN_OPERATIONAL" | "PARTIAL" | "NOT_OPERATIONAL" | "UNKNOWN";

export type SemiCruiseMutationStatusV1 = "NOT_PROVEN";

export type NetlifyPublishingStatusV1 = "LOCKED" | "OPERATOR_REPORTED" | "UNKNOWN";

export type DeployCreditRiskStatusV1 = "MONITOR" | "HIGH_RISK" | "LOW" | "UNKNOWN";

export type SemiCruiseRuntimeStatusV1 = "OK" | "ATTENTION" | "UNKNOWN";

export type SemiCruiseStatusSummaryV1 = {
  contract: typeof SEMI_CRUISE_STATUS_SUMMARY_CONTRACT_V1;
  read_only: true;
  data_mutation: false;
  generated_at: string;
  runtime_status: SemiCruiseRuntimeStatusV1;
  read_only_semi_cruise_status: SemiCruiseReadOnlyStatusV1;
  mutation_semi_cruise_status: SemiCruiseMutationStatusV1;
  netlify_publishing_status: NetlifyPublishingStatusV1;
  deploy_credit_risk_status: DeployCreditRiskStatusV1;
  bright_neuron_count: number;
  dim_neuron_count: number;
  dark_neuron_count: number;
  remaining_owner_gates: string[];
  proven_facts: string[];
  unknown_facts: string[];
  recommended_next_action: string;
};

export type SemiCruiseStatusSummaryBuildInputV1 = {
  generated_at: string;
  read_only: boolean;
  data_mutation: boolean;
  operator_can_be_away_status: string;
  system_health_status: string;
  execution_guidance: {
    next_move_mode: string;
    mutating_blocked: boolean;
  };
  command_center_v2: Pick<
    CommandCenterV2Report,
    | "external_measurement_freshness_v1"
    | "page_publishability_truth_summary_v1"
    | "affiliate_readiness"
    | "coverage_health"
    | "amazon_rescue"
    | "revenue_snapshot"
  >;
  owner_command_center_neurons: OwnerCommandCenterNeuronsReport | null;
  spend_ledger_entries: SpendLedgerEntryV1[];
};

const OPERATOR_REPORTED_PUBLISHING_PREFIX = "OPERATOR_REPORTED:";
const PROVEN_LOCKED_PUBLISHING_PREFIX = "PROVEN:";

function countNeuronsByLevel(
  neurons: OwnerCommandCenterNeuronsReport["neurons"] | undefined,
): { bright: number; dim: number; dark: number } {
  const counts = { bright: 0, dim: 0, dark: 0 };
  for (const n of neurons ?? []) {
    const level: OwnerNeuronConnectionLevel = n.connection_level;
    if (level === "BRIGHT") counts.bright += 1;
    else if (level === "DIM") counts.dim += 1;
    else if (level === "DARK") counts.dark += 1;
  }
  return counts;
}

/** PROVEN in-repo only when spend-ledger proven_facts carry explicit durable lock lines. */
export function resolveNetlifyPublishingStatusFromSpendLedgerV1(
  entries: SpendLedgerEntryV1[],
): { status: NetlifyPublishingStatusV1; proven_facts: string[]; unknown_facts: string[] } {
  const proven_facts: string[] = [];
  const unknown_facts: string[] = [];

  for (const entry of entries) {
    for (const line of entry.proven_facts) {
      const trimmed = line.trim();
      const lower = trimmed.toLowerCase();
      if (
        trimmed.startsWith(PROVEN_LOCKED_PUBLISHING_PREFIX) &&
        lower.includes("netlify") &&
        (lower.includes("publish") || lower.includes("locked") || lower.includes("paused"))
      ) {
        proven_facts.push(trimmed);
        return {
          status: "LOCKED",
          proven_facts: [
            ...proven_facts,
            "PROVEN: Netlify publishing lock attested in data/ops/spend-ledger-v1.json proven_facts.",
          ],
          unknown_facts,
        };
      }
      if (trimmed.startsWith(OPERATOR_REPORTED_PUBLISHING_PREFIX) && lower.includes("netlify")) {
        proven_facts.push(trimmed);
        return {
          status: "OPERATOR_REPORTED",
          proven_facts: [
            ...proven_facts,
            "OPERATOR_REPORTED: Netlify publishing state recorded in spend ledger proven_facts (not a Netlify API proof).",
          ],
          unknown_facts: [
            "UNKNOWN: Netlify dashboard was not queried by this summary builder; confirm lock/suspend in Usage & billing UI.",
          ],
        };
      }
    }
  }

  return {
    status: "UNKNOWN",
    proven_facts,
    unknown_facts: [
      "UNKNOWN: No durable repo source for Netlify publishing lock (expected spend-ledger proven_facts with OPERATOR_REPORTED: or PROVEN: Netlify publishing lines).",
    ],
  };
}

function resolveDeployCreditRiskV1(entries: SpendLedgerEntryV1[]): {
  status: DeployCreditRiskStatusV1;
  proven_facts: string[];
  unknown_facts: string[];
} {
  const deployRows = entries.filter((e) => e.provider === "netlify" && e.deploy_triggered);
  const unknown_facts = [
    "UNKNOWN: Actual Netlify credit burn is proven only from Netlify Usage & billing dashboard or export — not from git push alone.",
  ];
  const proven_facts: string[] = [
    "PROVEN: Official credit-plan rule (Netlify docs): production deploys consume deploy credits; preview/branch deploys are 0 on credit plans.",
  ];

  if (deployRows.length === 0) {
    return {
      status: "MONITOR",
      proven_facts: [
        ...proven_facts,
        "PROVEN: spend-ledger-v1 has no deploy_triggered Netlify rows in this snapshot.",
      ],
      unknown_facts,
    };
  }

  const anyExact = deployRows.some((r) => r.exact_cost_proven);
  const inferredRows = deployRows.filter((r) => !r.exact_cost_proven);
  if (inferredRows.length > 0) {
    proven_facts.push(
      `PROVEN: ${inferredRows.length} spend-ledger Netlify row(s) record deploy risk with exact_cost_proven=false.`,
    );
  }
  if (anyExact) {
    proven_facts.push("PROVEN: At least one spend-ledger Netlify row claims exact_cost_proven=true from operator/vendor proof.");
  }

  return {
    status: inferredRows.length > 0 ? "HIGH_RISK" : "MONITOR",
    proven_facts,
    unknown_facts,
  };
}

function buildRemainingOwnerGates(input: SemiCruiseStatusSummaryBuildInputV1): string[] {
  const gates: string[] = [];
  const v2 = input.command_center_v2;

  if (v2.affiliate_readiness.status !== "OK") {
    gates.push(`affiliate_readiness: ${v2.affiliate_readiness.status} — ${v2.affiliate_readiness.blocker ?? "lane not OK"}`);
  } else {
    gates.push("affiliate_readiness: OK lane but monetization prep may remain DIM on neurons — not full launch readiness.");
  }

  if (v2.coverage_health.status !== "OK") {
    gates.push(`coverage_health: ${v2.coverage_health.status} — ${v2.coverage_health.blocker ?? "lane not OK"}`);
  } else {
    gates.push("coverage_health: OK lane — still verify neuron connection_level for buy-path pressure.");
  }

  const rescue = v2.amazon_rescue;
  if (rescue.human_browser_required_tokens.length > 0) {
    gates.push(
      `amazon_rescue: HUMAN_BROWSER_REQUIRED tokens (${rescue.human_browser_required_tokens.slice(0, 5).join(", ")})`,
    );
  }
  if (rescue.status === "ATTENTION" || rescue.status === "BLOCKED") {
    gates.push(`amazon_rescue: ${rescue.status} — ${rescue.blocker ?? rescue.next_owner_action}`);
  }

  const commission = v2.revenue_snapshot.click_visibility?.commission_or_revenue ?? "UNKNOWN";
  if (commission === "NOT_CONNECTED") {
    gates.push("commission_or_revenue: NOT_CONNECTED — revenue ledger has no proven commission feed.");
  }

  const dimNeurons =
    input.owner_command_center_neurons?.neurons.filter((n) => n.connection_level === "DIM").map((n) => n.neuron_key) ??
    [];
  if (dimNeurons.length > 0) {
    gates.push(`owner_command_center_neurons DIM: ${dimNeurons.join(", ")}`);
  }

  return gates;
}

function evaluateReadOnlySemiCruiseOperational(input: SemiCruiseStatusSummaryBuildInputV1): {
  status: SemiCruiseReadOnlyStatusV1;
  proven_facts: string[];
  unknown_facts: string[];
} {
  const proven_facts: string[] = [];
  const unknown_facts: string[] = [];
  const checks: { ok: boolean; label: string }[] = [
    { ok: input.read_only === true, label: "Command Center read_only=true" },
    { ok: input.data_mutation === false, label: "Command Center data_mutation=false" },
    {
      ok: input.execution_guidance.next_move_mode === "READ_ONLY",
      label: "execution_guidance.next_move_mode=READ_ONLY",
    },
    {
      ok: input.operator_can_be_away_status === "READY_FOR_AUTONOMOUS_READ_ONLY",
      label: "operator_can_be_away_status=READY_FOR_AUTONOMOUS_READ_ONLY",
    },
    { ok: input.system_health_status === "OK", label: "system_health_summary.status=OK" },
    {
      ok: input.command_center_v2.external_measurement_freshness_v1.overall_status === "OK",
      label: "external_measurement_freshness_v1.overall_status=OK",
    },
    {
      ok: input.command_center_v2.external_measurement_freshness_v1.runtime_status === "OK",
      label: "external_measurement_freshness_v1.runtime_status=OK",
    },
    {
      ok: input.command_center_v2.page_publishability_truth_summary_v1.unknown_join_count === 0,
      label: "page_publishability_truth_summary_v1.unknown_join_count=0",
    },
  ];

  const failed = checks.filter((c) => !c.ok);
  for (const c of checks.filter((c) => c.ok)) {
    proven_facts.push(`PROVEN: ${c.label}.`);
  }
  for (const c of failed) {
    unknown_facts.push(`NOT_MET: ${c.label}.`);
  }

  if (failed.length === 0) {
    return {
      status: "PROVEN_OPERATIONAL",
      proven_facts: [
        ...proven_facts,
        "PROVEN: Read-only Semi-Cruise loop (Command Center → Runner Step → Founder Digest) is operational per CC snapshot fields.",
        "PROVEN: Runner Step pass is not loaded on Command Center — run `npm run buckparts:runner-step` separately to verify.",
      ],
      unknown_facts,
    };
  }
  if (failed.length < checks.length) {
    return { status: "PARTIAL", proven_facts, unknown_facts };
  }
  return { status: "NOT_OPERATIONAL", proven_facts, unknown_facts };
}

export function buildSemiCruiseStatusSummaryV1(
  input: SemiCruiseStatusSummaryBuildInputV1,
): SemiCruiseStatusSummaryV1 {
  const neuronCounts = countNeuronsByLevel(input.owner_command_center_neurons?.neurons);
  const readOnlyEval = evaluateReadOnlySemiCruiseOperational(input);
  const publishing = resolveNetlifyPublishingStatusFromSpendLedgerV1(input.spend_ledger_entries);
  const deployRisk = resolveDeployCreditRiskV1(input.spend_ledger_entries);
  const remaining_owner_gates = buildRemainingOwnerGates(input);

  const proven_facts = [
    `PROVEN: ${SEMI_CRUISE_STATUS_SUMMARY_CONTRACT_V1} is informational only — it does not grant mutation, deploy, or Runner allowlist authority.`,
    ...readOnlyEval.proven_facts,
    ...publishing.proven_facts,
    ...deployRisk.proven_facts,
  ];

  const unknown_facts = [
    ...readOnlyEval.unknown_facts,
    ...publishing.unknown_facts,
    ...deployRisk.unknown_facts,
    "UNKNOWN: Mutation Semi-Cruise (autonomous mutating workflows) is NOT_PROVEN in-repo.",
  ];

  let runtime_status: SemiCruiseRuntimeStatusV1 = "OK";
  if (readOnlyEval.status === "NOT_OPERATIONAL") {
    runtime_status = "UNKNOWN";
  } else if (
    readOnlyEval.status === "PARTIAL" ||
    publishing.status === "UNKNOWN" ||
    deployRisk.status === "HIGH_RISK" ||
    input.execution_guidance.mutating_blocked !== true
  ) {
    runtime_status = "ATTENTION";
  }

  const recommended_next_action =
    readOnlyEval.status === "PROVEN_OPERATIONAL"
      ? "Stay on read-only Semi-Cruise: `npm run buckparts:command-center`, `npm run buckparts:runner-step`, `npm run buckparts:founder-digest` — no git push to main until Netlify credits reset and publishing state is dashboard-proven. Log spend rows from Netlify Usage & billing before any production deploy."
      : "Restore read-only Semi-Cruise prerequisites on Command Center (system health, external measurement, publishability joins, READ_ONLY next_move_mode) before expanding scope. Do not push to Netlify production while deploy_credit_risk_status is elevated.";

  return {
    contract: SEMI_CRUISE_STATUS_SUMMARY_CONTRACT_V1,
    read_only: true,
    data_mutation: false,
    generated_at: input.generated_at,
    runtime_status,
    read_only_semi_cruise_status: readOnlyEval.status,
    mutation_semi_cruise_status: "NOT_PROVEN",
    netlify_publishing_status: publishing.status,
    deploy_credit_risk_status: deployRisk.status,
    bright_neuron_count: neuronCounts.bright,
    dim_neuron_count: neuronCounts.dim,
    dark_neuron_count: neuronCounts.dark,
    remaining_owner_gates,
    proven_facts,
    unknown_facts,
    recommended_next_action,
  };
}
