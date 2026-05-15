/**
 * Layer 6 Readiness Summary v1 — pure read model over Failure Pattern Registry (+ optional Runner Step signals).
 * PROVEN: no I/O; does not alter Runner Step, workflows, queues, packets, or mutation gates.
 */

import type { FailurePatternRegistryReadModelV1 } from "./failure-pattern-registry-v1";

export const LAYER_SIX_READINESS_SUMMARY_CONTRACT_V1 = "layer_six_readiness_summary_v1" as const;

/** Digest section header hint (single source of truth). */
export const LAYER_SIX_READINESS_DIGEST_HINT_V1 =
  "**PROVEN:** Readiness is derived from `failure_pattern_registry_read_model_v1` counts only (plus optional Runner Step `layer_truth` when supplied). **PROVEN:** This summary is informational — it does **not** expand Runner autonomy, allowlists, or mutation gates. **PROVEN:** Layer 6 (`layer_6_founder_only_approval`) remains **NOT_PROVEN** in-repo until external agent execution/capture and founder-only judgment loops are evidenced elsewhere.";

/** Plain sentence for React owner dashboard (no markdown emphasis). */
export const LAYER_SIX_READINESS_OWNER_DASHBOARD_LINE_V1 =
  "Layer 6 readiness summarizes failure-pattern guardrails for awareness only. It does not drive Runner, queues, packets, or gates, and does not integrate Cursor, Codex, or OpenAI.";

export type LayerSixReadinessStatusV1 = "blocked" | "needs_review" | "informational_ready";

export type LayerSixReadinessRunnerContextV1 = {
  overall_status?: string | null;
  layer_truth?: {
    layer_3_external_agent_execution?: string;
    layer_4_output_capture?: string;
    layer_6_founder_only_approval?: string;
  } | null;
};

export type LayerSixReadinessSummaryV1 = {
  contract: typeof LAYER_SIX_READINESS_SUMMARY_CONTRACT_V1;
  read_only: true;
  data_mutation: false;
  automation_input: false;
  informational_only: true;
  generated_at: string;
  readiness_status: LayerSixReadinessStatusV1;
  reasons: string[];
  required_before_layer_6: string[];
  proven_facts: string[];
  unknown_facts: string[];
  failure_pattern_registry: {
    guarded_count: number;
    unguarded_count: number;
    recurring_count: number;
    unknown_guardrail_count: number;
  };
  runner_context_present: boolean;
};

function baseRequiredBeforeLayer6(): string[] {
  return [
    "PROVEN: In-repo Runner Step `layer_truth.layer_6_founder_only_approval` is NOT_PROVEN — founder-only quality judgment and approval are not automated.",
    "UNKNOWN: Repo-owned path to send prompts to Cursor, Codex, or OpenAI and capture agent output automatically (see `docs/BuckParts-RUNNER-STATUS.md` execution surfaces).",
    "PROVEN: Do not treat `informational_ready` as permission to widen Runner allowlists, workflows, or mutation gates without explicit founder decision + registry/process updates.",
  ];
}

/**
 * PROVEN: pure function — derives readiness from Failure Pattern Registry read model counts.
 * INFERRED: Optional Runner context enriches proven/unknown facts but does not override guardrail blocking rules.
 */
export function buildLayerSixReadinessSummaryV1(
  failurePatterns: FailurePatternRegistryReadModelV1,
  options: {
    generated_at: string;
    runner?: LayerSixReadinessRunnerContextV1 | null;
  },
): LayerSixReadinessSummaryV1 {
  const generated_at = options.generated_at;
  const runner = options.runner ?? null;
  const runner_context_present = runner != null;

  const fp = {
    guarded_count: failurePatterns.guarded_count,
    unguarded_count: failurePatterns.unguarded_count,
    recurring_count: failurePatterns.recurring_count,
    unknown_guardrail_count: failurePatterns.unknown_guardrail_count,
  };

  const proven_facts: string[] = [
    `PROVEN: Summary contract ${LAYER_SIX_READINESS_SUMMARY_CONTRACT_V1}; source registry contract ${failurePatterns.contract}.`,
    `PROVEN: Failure Pattern Registry counts — guarded=${fp.guarded_count}, unguarded(observed)=${fp.unguarded_count}, recurring=${fp.recurring_count}, unknown_guardrail=${fp.unknown_guardrail_count}.`,
    "PROVEN: This summary is not consumed as `automation_input` by Runner, Action Queue, Decision Packets, Execution Packets, or mutation gates.",
  ];

  const unknown_facts: string[] = [
    "UNKNOWN: Whether production or founder workflows outside this repo have proven external agent execution — not inferred from guardrail counts alone.",
  ];

  if (runner_context_present) {
    const lt = runner?.layer_truth;
    if (lt?.layer_6_founder_only_approval) {
      proven_facts.push(
        `PROVEN: Runner Step layer_truth.layer_6_founder_only_approval=${lt.layer_6_founder_only_approval} (when runner context supplied).`,
      );
    }
    if (runner?.overall_status) {
      proven_facts.push(`PROVEN: Runner Step overall_status=${runner.overall_status} (when runner context supplied).`);
    }
    if (lt?.layer_3_external_agent_execution === "UNKNOWN") {
      unknown_facts.push(
        "UNKNOWN: Runner Step reports layer_3_external_agent_execution=UNKNOWN — no in-repo Cursor/Codex/OpenAI agent loop.",
      );
    }
    if (lt?.layer_4_output_capture && lt.layer_4_output_capture !== "PROVEN") {
      unknown_facts.push(
        `UNKNOWN: Automatic agent output capture beyond repo-owned commands (layer_4_output_capture=${lt.layer_4_output_capture}).`,
      );
    }
  } else {
    unknown_facts.push(
      "UNKNOWN: Live Runner Step JSON was not supplied to this summary builder (digest local runs may omit FOUNDER_DIGEST_RUNNER_STEP_JSON_PATH).",
    );
  }

  const reasons: string[] = [];
  const required_before_layer_6: string[] = [...baseRequiredBeforeLayer6()];
  let readiness_status: LayerSixReadinessStatusV1;

  if (fp.unguarded_count > 0) {
    readiness_status = "blocked";
    reasons.push(
      `PROVEN: unguarded_count=${fp.unguarded_count} (status=observed) — recurring failure classes lack documented guardrails in the registry read model.`,
    );
    required_before_layer_6.unshift(
      "PROVEN: Guard or retire every observed (unguarded) failure pattern row before treating Layer 6 expansion as safe.",
    );
  } else if (fp.recurring_count > 0 || fp.unknown_guardrail_count > 0) {
    readiness_status = "needs_review";
    if (fp.recurring_count > 0) {
      reasons.push(`PROVEN: recurring_count=${fp.recurring_count} — patterns still marked recurring need founder/process review.`);
      required_before_layer_6.unshift(
        "PROVEN: Review recurring failure pattern rows and either add guardrail_paths or downgrade status with evidence.",
      );
    }
    if (fp.unknown_guardrail_count > 0) {
      reasons.push(
        `PROVEN: unknown_guardrail_count=${fp.unknown_guardrail_count} — rows with UNKNOWN proof_status or empty guardrails (non-retired).`,
      );
      required_before_layer_6.unshift(
        "PROVEN: Resolve UNKNOWN guardrail proof or document guardrail_paths for affected failure_id values.",
      );
    }
  } else {
    readiness_status = "informational_ready";
    reasons.push(
      "PROVEN: Failure Pattern Registry read model reports zero unguarded, zero recurring, and zero unknown_guardrail rows in this snapshot.",
    );
    reasons.push(
      "PROVEN: informational_ready means guardrail coverage looks complete for seeded/catalog rows only — it does **not** prove Layer 6 autonomy.",
    );
  }

  reasons.push(
    "PROVEN: Layer 6 (founder-only approval / quality judgment) remains NOT_PROVEN in-repo regardless of readiness_status.",
  );

  return {
    contract: LAYER_SIX_READINESS_SUMMARY_CONTRACT_V1,
    read_only: true,
    data_mutation: false,
    automation_input: false,
    informational_only: true,
    generated_at,
    readiness_status,
    reasons,
    required_before_layer_6,
    proven_facts,
    unknown_facts,
    failure_pattern_registry: fp,
    runner_context_present,
  };
}

export function formatLayerSixReadinessDigestMarkdownV1(summary: LayerSixReadinessSummaryV1): string {
  const statusLabel =
    summary.readiness_status === "blocked"
      ? "blocked (unsafe to expand autonomy)"
      : summary.readiness_status === "needs_review"
        ? "needs_review (founder/process review)"
        : "informational_ready (guardrails look complete in registry snapshot)";

  const lines = [
    `**PROVEN:** Contract \`${summary.contract}\` · read_only=\`${String(summary.read_only)}\` · data_mutation=\`${String(summary.data_mutation)}\` · automation_input=\`${String(summary.automation_input)}\` · informational_only=\`${String(summary.informational_only)}\`.`,
    `**PROVEN:** \`readiness_status\` = \`${summary.readiness_status}\` — ${statusLabel}.`,
    `**PROVEN:** Layer 6 remains **NOT_PROVEN** — this section does not authorize Cursor/Codex/OpenAI integration or closed-loop Runner expansion.`,
    "",
    "**Reasons:**",
    ...summary.reasons.map((r) => `- ${r}`),
    "",
    "**Required before Layer 6 (informational checklist):**",
    ...summary.required_before_layer_6.map((r) => `- ${r}`),
    "",
    "**Registry counts (source):**",
    `- guarded: \`${summary.failure_pattern_registry.guarded_count}\``,
    `- unguarded (observed): \`${summary.failure_pattern_registry.unguarded_count}\``,
    `- recurring: \`${summary.failure_pattern_registry.recurring_count}\``,
    `- unknown_guardrail: \`${summary.failure_pattern_registry.unknown_guardrail_count}\``,
    `- runner_context_present: \`${String(summary.runner_context_present)}\``,
    "",
    "**Facts (trimmed):**",
    ...summary.proven_facts.slice(-5).map((f) => `- ${f}`),
    ...(summary.unknown_facts.length > 0
      ? ["", "**Unknown / NOT_PROVEN:**", ...summary.unknown_facts.slice(0, 5).map((f) => `- ${f}`)]
      : []),
    "",
  ];
  return `${lines.join("\n")}\n`;
}
