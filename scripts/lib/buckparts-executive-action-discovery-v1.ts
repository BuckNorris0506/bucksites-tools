/**
 * Executive Action Discovery v1 — read-only lawful executable action set.
 *
 * Answers exactly: "What lawful executable actions exist right now?"
 * Not ranking. Not dispatch. Not an NBA. Not a worker registry.
 * Does not invent actions, infer authority, rebuild Command Center, or mutate.
 */

import { existsSync, readFileSync } from "node:fs";
import path from "node:path";

import { scanFounderDecisionRegistryJsonFilesV1 } from "../../src/lib/owner-dashboard/founder-decision-registry-scan-v1";
import { AGENT_DISPATCH_TEMPLATES_V1 } from "./buckparts-agent-contract-v1";
import {
  BUCKPARTS_RETAILER_LINK_PARITY_GUARDED_APPLY_WRITE_COMMAND_V1,
  DISPATCH_ALLOWLIST_ENTRIES_V1,
  lookupDispatchAllowlistEntryV1,
  type DispatchAllowlistEntryV1,
} from "./buckparts-command-center-dispatch-allowlist-v1";
import { RUNNER_EXECUTION_NPM_SCRIPT_ALLOWLIST_V1 } from "./buckparts-runner-safety-contract-v1";
import { SUPABASE_SERVICE_ROLE_INVENTORY_ENTRIES_V1 } from "./buckparts-supabase-service-role-inventory-v1";
import { AP_MODEL_FIRST_EVIDENCE_QUEUE_COMMAND_V1 } from "./ap-model-first-evidence-queue-v1";
import { BATCH_RUN_REGISTRY_INTAKE_SOURCE_COMMAND_V1 } from "./batch-run-registry-intake-command-center-v1";
import { FRIDGE_BUYER_PATH_BATCH_APPLY_PLAN_APPROVAL_SOURCE_COMMAND_V1 } from "./fridge-buyer-path-batch-apply-plan-approval-command-center-v1";
import { FRIDGE_BUYER_PATH_BATCH_APPLY_PLAN_PROPOSAL_SOURCE_COMMAND_V1 } from "./fridge-buyer-path-batch-apply-plan-proposal-command-center-v1";
import { REFRIGERATOR_MODEL_FIRST_BATCH_RESOLVER_COMMAND_V1 } from "./refrigerator-model-first-batch-resolver-v1";

export const EXECUTIVE_ACTION_DISCOVERY_CONTRACT_V1 =
  "buckparts_executive_action_discovery_v1" as const;

export const EXECUTIVE_ACTION_DISCOVERY_REPORT_NAME_V1 =
  "buckparts_executive_action_discovery_v1" as const;

/** Mirrors dispatch-runner `looksDangerousExactCommandV1` needles. Do not execute those commands. */
export const EXECUTIVE_ACTION_DISCOVERY_DANGEROUS_EXACT_COMMAND_NEEDLES_V1 = [
  "--apply",
  "git commit",
  "git push",
  "supabase db",
  "psql",
  "curl -X POST",
  "curl -X PATCH",
  "curl -X DELETE",
  "retailer_links.csv",
  "data/air-purifier/retailer_links.csv",
] as const;

export type EpistemicTagV1 = "PROVEN" | "INFERRED" | "UNKNOWN";

export type ExecutiveActionCatalogSourceV1 =
  | "dispatch_allowlist"
  | "agent_dispatch_template"
  | "explicitly_excluded_guarded_apply"
  | "canonical_source_command"
  | "runner_execution_npm_script_allowlist";

export type ExecutiveActionAuthorityRequiredV1 =
  | "dispatch_allowlist_metadata"
  | "agent_dispatch_template"
  | "explicitly_excluded_from_dispatch_allowlist"
  | "canonical_source_command_constant"
  | "runner_execution_npm_script_allowlist";

export type ExecutiveActionFounderGateV1 =
  | "not_required_for_read_only_dispatch"
  | "owner_review_required_dispatch_refused"
  | "founder_explicit_apply_required"
  | "dispatch_allowlist_required_for_executive_execution"
  | "not_applicable_no_exact_command";

export type ExecutiveDiscoveredActionV1 = {
  action_id: string;
  human_description: string;
  exact_command: string | null;
  authority_required: ExecutiveActionAuthorityRequiredV1;
  founder_gate: ExecutiveActionFounderGateV1;
  eligibility: boolean;
  ineligible_reason: string | null;
  evidence_used: string[];
  catalog_source: ExecutiveActionCatalogSourceV1;
  catalog_epistemic: EpistemicTagV1;
  eligibility_epistemic: EpistemicTagV1;
};

export type ExecutiveActionDiscoveryMissingSourceV1 = {
  source_id: string;
  epistemic: EpistemicTagV1;
  present_on_head: boolean | "UNKNOWN";
  why_missing: string;
  evidence_used: string[];
};

export type ExecutiveActionDiscoverySnapshotV1 = {
  contract: typeof EXECUTIVE_ACTION_DISCOVERY_CONTRACT_V1;
  report_name: typeof EXECUTIVE_ACTION_DISCOVERY_REPORT_NAME_V1;
  generated_at: string;
  observation_kind: "lawful_executable_action_set";
  read_only: true;
  data_mutation: false;
  mutation_authorized: false;
  nba_authority: false;
  dispatch_authority: false;
  dispatch_invoked: false;
  steering_authority: false;
  ranking_performed: false;
  command_center_rebuilt: false;
  outcome_join_consulted: false;
  catalog_epistemic: "PROVEN";
  completeness_epistemic: "PROVEN";
  completeness_status: "INCOMPLETE";
  executive_can_know_every_lawful_action_today: false;
  actions: ExecutiveDiscoveredActionV1[];
  executable_actions: ExecutiveDiscoveredActionV1[];
  missing_sources: ExecutiveActionDiscoveryMissingSourceV1[];
  founder_decision_registry: {
    json_file_count: number;
    structured_exact_command_count: number;
    structured_exact_command_epistemic: "PROVEN";
    owner_note_prose_not_scanned_for_commands: true;
  };
  scale_counts: {
    dispatch_allowlist_entries: number;
    agent_dispatch_templates: number;
    cataloged_actions: number;
    executable_actions: number;
    buckparts_npm_scripts: number;
    supabase_write_guarded_inventory_entries: number;
  };
};

type ClosedCatalogSeedV1 = {
  action_id: string;
  human_description: string;
  exact_command: string | null;
  catalog_source: ExecutiveActionCatalogSourceV1;
  authority_required: ExecutiveActionAuthorityRequiredV1;
};

const CANONICAL_SOURCE_COMMAND_SEEDS_V1: readonly ClosedCatalogSeedV1[] = [
  {
    action_id: "canonical_source:refrigerator_model_first_batch_resolver",
    human_description:
      "Read-only refrigerator model-first batch resolver (proven command constant; not on dispatch allowlist)",
    exact_command: REFRIGERATOR_MODEL_FIRST_BATCH_RESOLVER_COMMAND_V1,
    catalog_source: "canonical_source_command",
    authority_required: "canonical_source_command_constant",
  },
  {
    action_id: "canonical_source:ap_model_first_evidence_queue",
    human_description:
      "Read-only AP model-first evidence queue (proven command constant; not on dispatch allowlist)",
    exact_command: AP_MODEL_FIRST_EVIDENCE_QUEUE_COMMAND_V1,
    catalog_source: "canonical_source_command",
    authority_required: "canonical_source_command_constant",
  },
  {
    action_id: "canonical_source:batch_run_registry_intake",
    human_description:
      "Read-only batch run-registry intake (proven Command Center source command; not on dispatch allowlist)",
    exact_command: BATCH_RUN_REGISTRY_INTAKE_SOURCE_COMMAND_V1,
    catalog_source: "canonical_source_command",
    authority_required: "canonical_source_command_constant",
  },
  {
    action_id: "canonical_source:fridge_buyer_path_batch_apply_plan_proposal",
    human_description:
      "Read-only fridge buyer-path batch apply-plan proposal (proven source command; not on dispatch allowlist; not CSV apply)",
    exact_command: FRIDGE_BUYER_PATH_BATCH_APPLY_PLAN_PROPOSAL_SOURCE_COMMAND_V1,
    catalog_source: "canonical_source_command",
    authority_required: "canonical_source_command_constant",
  },
  {
    action_id: "canonical_source:fridge_buyer_path_batch_apply_plan_approval",
    human_description:
      "Read-only fridge buyer-path apply-plan approval bridge (proven source command; not on dispatch allowlist; not apply authority)",
    exact_command: FRIDGE_BUYER_PATH_BATCH_APPLY_PLAN_APPROVAL_SOURCE_COMMAND_V1,
    catalog_source: "canonical_source_command",
    authority_required: "canonical_source_command_constant",
  },
];

function isPlainObject(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}

function collectStructuredExactCommandsV1(value: unknown, out: string[]): void {
  if (Array.isArray(value)) {
    for (const item of value) collectStructuredExactCommandsV1(item, out);
    return;
  }
  if (!isPlainObject(value)) return;
  if (typeof value.exact_command === "string" && value.exact_command.trim().length > 0) {
    out.push(value.exact_command.trim());
  }
  for (const [key, child] of Object.entries(value)) {
    if (key === "owner_note") continue;
    collectStructuredExactCommandsV1(child, out);
  }
}

export function countStructuredExactCommandsInOwnerDecisionsV1(rootDir: string): {
  json_file_count: number;
  structured_exact_command_count: number;
} {
  const files = scanFounderDecisionRegistryJsonFilesV1(rootDir);
  const commands: string[] = [];
  for (const file of files) {
    if ("parsed" in file) {
      collectStructuredExactCommandsV1(file.parsed, commands);
    }
  }
  return {
    json_file_count: files.length,
    structured_exact_command_count: commands.length,
  };
}

export function dangerousExactCommandNeedlesV1(exact: string): string[] {
  return EXECUTIVE_ACTION_DISCOVERY_DANGEROUS_EXACT_COMMAND_NEEDLES_V1.filter((n) =>
    exact.includes(n),
  );
}

function loadPackageScriptsV1(rootDir: string): Record<string, string> {
  const pkgPath = path.join(rootDir, "package.json");
  if (!existsSync(pkgPath)) return {};
  try {
    const parsed = JSON.parse(readFileSync(pkgPath, "utf8")) as { scripts?: unknown };
    if (!isPlainObject(parsed.scripts)) return {};
    const out: Record<string, string> = {};
    for (const [key, value] of Object.entries(parsed.scripts)) {
      if (typeof value === "string") out[key] = value;
    }
    return out;
  } catch {
    return {};
  }
}

function npmRunScriptNameV1(exact: string): string | null {
  const m = exact.trim().match(/^npm run ([^\s]+)/);
  return m ? m[1] : null;
}

function tsEntrypointFromCommandV1(exact: string): string | null {
  const m = exact.match(/(?:npx tsx|node --import tsx)\s+(\S+\.ts)/);
  return m ? m[1] : null;
}

function referencedPlanPathsV1(exact: string): string[] {
  const out: string[] = [];
  const re = /--plan(?:-file)?\s+(\S+)/g;
  let match: RegExpExecArray | null;
  while ((match = re.exec(exact)) !== null) {
    const rel = match[1];
    if (rel.includes("<") || rel.includes(">")) continue;
    out.push(rel);
  }
  return out;
}

export type ExactCommandEligibilityV1 = {
  eligibility: boolean;
  ineligible_reason: string | null;
  founder_gate: ExecutiveActionFounderGateV1;
  evidence_used: string[];
  eligibility_epistemic: EpistemicTagV1;
};

export function evaluateExactCommandEligibilityV1(args: {
  rootDir: string;
  exact_command: string | null;
  allowlist_entry: DispatchAllowlistEntryV1 | null;
  catalog_source: ExecutiveActionCatalogSourceV1;
  package_scripts: Record<string, string>;
}): ExactCommandEligibilityV1 {
  const evidence: string[] = [];
  const { exact_command, allowlist_entry, catalog_source, package_scripts, rootDir } = args;

  if (exact_command === null || exact_command.trim() === "") {
    return {
      eligibility: false,
      ineligible_reason: "no_proven_exact_command",
      founder_gate: "not_applicable_no_exact_command",
      evidence_used: ["exact_command is null; Executive cannot execute a command that is not proven"],
      eligibility_epistemic: "PROVEN",
    };
  }

  evidence.push(`exact_command=${JSON.stringify(exact_command)}`);

  if (/<[^>]+>/.test(exact_command)) {
    return {
      eligibility: false,
      ineligible_reason: "exact_command_has_unresolved_placeholder",
      founder_gate: "founder_explicit_apply_required",
      evidence_used: [...evidence, "placeholder tokens such as <plan.json> are not a runnable command"],
      eligibility_epistemic: "PROVEN",
    };
  }

  const danger = dangerousExactCommandNeedlesV1(exact_command);
  if (danger.length > 0) {
    return {
      eligibility: false,
      ineligible_reason: "exact_command_contains_apply_or_mutation_needle",
      founder_gate: "founder_explicit_apply_required",
      evidence_used: [
        ...evidence,
        `dispatch_runner_dangerous_needles=${JSON.stringify(danger)}`,
      ],
      eligibility_epistemic: "PROVEN",
    };
  }

  if (catalog_source === "explicitly_excluded_guarded_apply") {
    return {
      eligibility: false,
      ineligible_reason: "guarded_apply_explicitly_excluded_from_dispatch_allowlist",
      founder_gate: "founder_explicit_apply_required",
      evidence_used: [
        ...evidence,
        "scripts/lib/buckparts-command-center-dispatch-allowlist-v1.ts:BUCKPARTS_RETAILER_LINK_PARITY_GUARDED_APPLY_WRITE_COMMAND_V1",
      ],
      eligibility_epistemic: "PROVEN",
    };
  }

  if (!allowlist_entry) {
    return {
      eligibility: false,
      ineligible_reason: "exact_command_not_on_dispatch_allowlist",
      founder_gate: "dispatch_allowlist_required_for_executive_execution",
      evidence_used: [
        ...evidence,
        "lookupDispatchAllowlistEntryV1 returned null",
        "Executive dispatch runner only executes DISPATCH_ALLOWLIST_ENTRIES_V1 exact_command values",
      ],
      eligibility_epistemic: "PROVEN",
    };
  }

  evidence.push(
    `allowlist.selected_subsystem=${allowlist_entry.selected_subsystem}`,
    `allowlist.command_kind=${allowlist_entry.command_kind}`,
    `allowlist.owner_review_required=${String(allowlist_entry.owner_review_required)}`,
    `allowlist.mutation_allowed=${String(allowlist_entry.mutation_posture.mutation_allowed)}`,
  );

  if (allowlist_entry.owner_review_required === true) {
    return {
      eligibility: false,
      ineligible_reason: "dispatch_runner_refuses_owner_review_required",
      founder_gate: "owner_review_required_dispatch_refused",
      evidence_used: [
        ...evidence,
        "scripts/lib/buckparts-command-center-dispatch-runner-v1.ts refuses owner_review_required=true subprocesses",
      ],
      eligibility_epistemic: "PROVEN",
    };
  }

  if (allowlist_entry.mutation_posture.mutation_allowed !== false) {
    return {
      eligibility: false,
      ineligible_reason: "allowlist_mutation_allowed_not_false",
      founder_gate: "founder_explicit_apply_required",
      evidence_used: [...evidence],
      eligibility_epistemic: "PROVEN",
    };
  }

  const tsEntry = tsEntrypointFromCommandV1(exact_command);
  if (tsEntry) {
    const abs = path.join(rootDir, tsEntry);
    evidence.push(`entrypoint=${tsEntry} exists=${String(existsSync(abs))}`);
    if (!existsSync(abs)) {
      return {
        eligibility: false,
        ineligible_reason: "entrypoint_missing",
        founder_gate: "not_required_for_read_only_dispatch",
        evidence_used: evidence,
        eligibility_epistemic: "PROVEN",
      };
    }
  }

  const npmName = npmRunScriptNameV1(exact_command);
  if (npmName) {
    const scriptBody = package_scripts[npmName];
    evidence.push(
      `package.json scripts[${JSON.stringify(npmName)}] ${scriptBody ? "present" : "missing"}`,
    );
    if (!scriptBody) {
      return {
        eligibility: false,
        ineligible_reason: "entrypoint_missing",
        founder_gate: "not_required_for_read_only_dispatch",
        evidence_used: evidence,
        eligibility_epistemic: "PROVEN",
      };
    }
    const fromBody = scriptBody.match(/(?:npx tsx|tsx|node --import tsx)\s+(\S+\.ts)/);
    if (fromBody) {
      const abs = path.join(rootDir, fromBody[1]);
      evidence.push(`npm_script_entrypoint=${fromBody[1]} exists=${String(existsSync(abs))}`);
      if (!existsSync(abs)) {
        return {
          eligibility: false,
          ineligible_reason: "entrypoint_missing",
          founder_gate: "not_required_for_read_only_dispatch",
          evidence_used: evidence,
          eligibility_epistemic: "PROVEN",
        };
      }
    }
  }

  for (const rel of referencedPlanPathsV1(exact_command)) {
    const abs = path.join(rootDir, rel);
    evidence.push(`referenced_plan=${rel} exists=${String(existsSync(abs))}`);
    if (!existsSync(abs)) {
      return {
        eligibility: false,
        ineligible_reason: "required_plan_file_missing",
        founder_gate: "not_required_for_read_only_dispatch",
        evidence_used: evidence,
        eligibility_epistemic: "PROVEN",
      };
    }
  }

  return {
    eligibility: true,
    ineligible_reason: null,
    founder_gate: "not_required_for_read_only_dispatch",
    evidence_used: [
      ...evidence,
      "eligible_for_dispatch_runner_subprocess: allowlisted, owner_review_required=false, mutation_allowed=false, no mutation needles, entrypoint present",
    ],
    eligibility_epistemic: "PROVEN",
  };
}

function closedCatalogSeedsV1(): ClosedCatalogSeedV1[] {
  const seeds: ClosedCatalogSeedV1[] = [];
  const seenCommands = new Set<string>();

  for (const entry of DISPATCH_ALLOWLIST_ENTRIES_V1) {
    seenCommands.add(entry.exact_command);
    seeds.push({
      action_id: `dispatch_allowlist:${entry.selected_subsystem}`,
      human_description: `${entry.command_kind} for ${entry.selected_subsystem}`,
      exact_command: entry.exact_command,
      catalog_source: "dispatch_allowlist",
      authority_required: "dispatch_allowlist_metadata",
    });
  }

  for (const template of Object.values(AGENT_DISPATCH_TEMPLATES_V1)) {
    seeds.push({
      action_id: `agent_dispatch_template:${template.template_id}`,
      human_description: `${template.title} (${template.execution_surface}; no proven exact_command)`,
      exact_command: null,
      catalog_source: "agent_dispatch_template",
      authority_required: "agent_dispatch_template",
    });
  }

  seenCommands.add(BUCKPARTS_RETAILER_LINK_PARITY_GUARDED_APPLY_WRITE_COMMAND_V1);
  seeds.push({
    action_id: "explicitly_excluded_guarded_apply:retailer_link_parity",
    human_description:
      "Guarded retailer-link parity apply write command (proven excluded from dispatch allowlist)",
    exact_command: BUCKPARTS_RETAILER_LINK_PARITY_GUARDED_APPLY_WRITE_COMMAND_V1,
    catalog_source: "explicitly_excluded_guarded_apply",
    authority_required: "explicitly_excluded_from_dispatch_allowlist",
  });

  for (const seed of CANONICAL_SOURCE_COMMAND_SEEDS_V1) {
    if (seed.exact_command && seenCommands.has(seed.exact_command)) continue;
    if (seed.exact_command) seenCommands.add(seed.exact_command);
    seeds.push(seed);
  }

  for (const script of RUNNER_EXECUTION_NPM_SCRIPT_ALLOWLIST_V1) {
    const exact = `npm run ${script}`;
    if (seenCommands.has(exact)) continue;
    seenCommands.add(exact);
    seeds.push({
      action_id: `runner_execution_npm_script_allowlist:${script}`,
      human_description: `Runner Step v1 npm allowlist target ${script} (not on Command Center dispatch allowlist)`,
      exact_command: exact,
      catalog_source: "runner_execution_npm_script_allowlist",
      authority_required: "runner_execution_npm_script_allowlist",
    });
  }

  return seeds;
}

function filePresentOnHeadV1(rootDir: string, rel: string): boolean {
  return existsSync(path.join(rootDir, rel));
}

function missingSourcesV1(args: {
  rootDir: string;
  package_scripts: Record<string, string>;
  oar: { json_file_count: number; structured_exact_command_count: number };
}): ExecutiveActionDiscoveryMissingSourceV1[] {
  const { rootDir, package_scripts, oar } = args;
  const buckpartsNpm = Object.keys(package_scripts).filter((k) => k.startsWith("buckparts:")).length;
  const writeGuarded = SUPABASE_SERVICE_ROLE_INVENTORY_ENTRIES_V1.filter(
    (e) => e.access_class === "write_guarded",
  ).length;
  const workerRegistryPresent = filePresentOnHeadV1(
    rootDir,
    "scripts/lib/buckparts-executive-worker-registry-v1.ts",
  );
  const fridgeWorkerPresent = filePresentOnHeadV1(
    rootDir,
    "scripts/run-buckparts-fridge-expansion-worker-v1.ts",
  );

  return [
    {
      source_id: "package_json_buckparts_scripts",
      epistemic: "PROVEN",
      present_on_head: true,
      why_missing:
        "package.json buckparts:* scripts are not a lawful Executive catalog. Scraping them would invent actions. v1 only emits closed allowlists and imported command constants.",
      evidence_used: [
        `package.json buckparts:* count=${String(buckpartsNpm)}`,
        "data/ops/control-plane-audit/buckparts-control-plane-capability-audit-v1.json scale_counts_proven.buckparts_npm_scripts (audit-time count; live count used here)",
      ],
    },
    {
      source_id: "canonical_final_operating_decision_v1_live_winner",
      epistemic: "UNKNOWN",
      present_on_head: "UNKNOWN",
      why_missing:
        "Live Command Center / canonical NBA winner is a dynamic exact_command. This slice does not rebuild Command Center and does not observe the current dispatch winner.",
      evidence_used: [
        "command_center_rebuilt=false",
        "scripts/report-buckparts-command-center.ts is cataloged as an allowlisted report, not executed",
      ],
    },
    {
      source_id: "executive_worker_registry",
      epistemic: "PROVEN",
      present_on_head: workerRegistryPresent,
      why_missing: workerRegistryPresent
        ? "Worker registry module exists on HEAD but is not imported into this closed catalog (this slice is not a worker registry)."
        : "No scripts/lib/buckparts-executive-worker-registry-v1.ts on this HEAD. Workers registered only on other unmerged branches are UNKNOWN here.",
      evidence_used: [
        `scripts/lib/buckparts-executive-worker-registry-v1.ts exists=${String(workerRegistryPresent)}`,
      ],
    },
    {
      source_id: "fridge_expansion_worker_v1",
      epistemic: "PROVEN",
      present_on_head: fridgeWorkerPresent,
      why_missing: fridgeWorkerPresent
        ? "Fridge Expansion Worker v1 exists on HEAD but is not dispatch-allowlisted and is not imported as an invented Executive action."
        : "No scripts/run-buckparts-fridge-expansion-worker-v1.ts on this HEAD. That worker is not a lawful action in this world state.",
      evidence_used: ["scripts/run-buckparts-fridge-expansion-worker-v1.ts"],
    },
    {
      source_id: "supabase_write_guarded_inventory_exact_commands",
      epistemic: "PROVEN",
      present_on_head: true,
      why_missing: `SUPABASE_SERVICE_ROLE_INVENTORY_ENTRIES_V1 lists ${String(writeGuarded)} write_guarded rel_path rows without proven exact_command. Emitting them as actions would invent commands.`,
      evidence_used: [
        "scripts/lib/buckparts-supabase-service-role-inventory-v1.ts",
        `write_guarded_count=${String(writeGuarded)}`,
      ],
    },
    {
      source_id: "founder_decision_registry_structured_exact_command",
      epistemic: "PROVEN",
      present_on_head: true,
      why_missing: `data/owner-decisions/*.json has ${String(oar.structured_exact_command_count)} structured exact_command fields (owner_note prose is not scanned; that would infer authority). Founder-authorized apply paths therefore have no proven command binding in this catalog.`,
      evidence_used: [
        "src/lib/owner-dashboard/founder-decision-registry-scan-v1.ts",
        `json_file_count=${String(oar.json_file_count)}`,
        `structured_exact_command_count=${String(oar.structured_exact_command_count)}`,
      ],
    },
    {
      source_id: "buckparts_runner_mission_step_commands",
      epistemic: "PROVEN",
      present_on_head: true,
      why_missing:
        "BUCKPARTS_RUNNER_MISSIONS_V1 is a separate orchestration graph of tsx_report steps. Flattening it here would turn Action Discovery into a worker/mission registry. Only RUNNER_EXECUTION_NPM_SCRIPT_ALLOWLIST_V1 npm targets are cataloged.",
      evidence_used: [
        "scripts/lib/buckparts-runner-v1.ts:BUCKPARTS_RUNNER_MISSIONS_V1",
        "scripts/lib/buckparts-runner-safety-contract-v1.ts:RUNNER_EXECUTION_NPM_SCRIPT_ALLOWLIST_V1",
      ],
    },
    {
      source_id: "control_plane_capability_islands",
      epistemic: "INFERRED",
      present_on_head: true,
      why_missing:
        "The control-plane capability audit names additional islands (GE stage scripts, manufacturer-rescue boards, factory/orchestrator scripts) that are not closed command constants in this catalog.",
      evidence_used: ["data/ops/control-plane-audit/buckparts-control-plane-capability-audit-v1.json"],
    },
    {
      source_id: "batch_dispatch_and_root_resolve_dynamic_commands",
      epistemic: "UNKNOWN",
      present_on_head: "UNKNOWN",
      why_missing:
        "batch_dispatch / root_resolve exact_commands are produced at Command Center compose time. Observing them requires rebuilding or reading a live CC snapshot, which this slice does not do.",
      evidence_used: ["command_center_rebuilt=false"],
    },
  ];
}

export function discoverExecutiveActionsV1(
  rootDir: string = process.cwd(),
  nowIso: string = new Date().toISOString(),
): ExecutiveActionDiscoverySnapshotV1 {
  const package_scripts = loadPackageScriptsV1(rootDir);
  const oar = countStructuredExactCommandsInOwnerDecisionsV1(rootDir);
  const actions: ExecutiveDiscoveredActionV1[] = [];

  for (const seed of closedCatalogSeedsV1()) {
    const allowlist_entry =
      seed.exact_command !== null ? lookupDispatchAllowlistEntryV1(seed.exact_command) : null;
    const judged = evaluateExactCommandEligibilityV1({
      rootDir,
      exact_command: seed.exact_command,
      allowlist_entry,
      catalog_source: seed.catalog_source,
      package_scripts,
    });
    actions.push({
      action_id: seed.action_id,
      human_description: seed.human_description,
      exact_command: seed.exact_command,
      authority_required: seed.authority_required,
      founder_gate: judged.founder_gate,
      eligibility: judged.eligibility,
      ineligible_reason: judged.ineligible_reason,
      evidence_used: judged.evidence_used,
      catalog_source: seed.catalog_source,
      catalog_epistemic: "PROVEN",
      eligibility_epistemic: judged.eligibility_epistemic,
    });
  }

  const executable_actions = actions.filter((a) => a.eligibility === true);
  const buckpartsNpm = Object.keys(package_scripts).filter((k) => k.startsWith("buckparts:")).length;
  const writeGuarded = SUPABASE_SERVICE_ROLE_INVENTORY_ENTRIES_V1.filter(
    (e) => e.access_class === "write_guarded",
  ).length;

  return {
    contract: EXECUTIVE_ACTION_DISCOVERY_CONTRACT_V1,
    report_name: EXECUTIVE_ACTION_DISCOVERY_REPORT_NAME_V1,
    generated_at: nowIso,
    observation_kind: "lawful_executable_action_set",
    read_only: true,
    data_mutation: false,
    mutation_authorized: false,
    nba_authority: false,
    dispatch_authority: false,
    dispatch_invoked: false,
    steering_authority: false,
    ranking_performed: false,
    command_center_rebuilt: false,
    outcome_join_consulted: false,
    catalog_epistemic: "PROVEN",
    completeness_epistemic: "PROVEN",
    completeness_status: "INCOMPLETE",
    executive_can_know_every_lawful_action_today: false,
    actions,
    executable_actions,
    missing_sources: missingSourcesV1({ rootDir, package_scripts, oar }),
    founder_decision_registry: {
      json_file_count: oar.json_file_count,
      structured_exact_command_count: oar.structured_exact_command_count,
      structured_exact_command_epistemic: "PROVEN",
      owner_note_prose_not_scanned_for_commands: true,
    },
    scale_counts: {
      dispatch_allowlist_entries: DISPATCH_ALLOWLIST_ENTRIES_V1.length,
      agent_dispatch_templates: Object.keys(AGENT_DISPATCH_TEMPLATES_V1).length,
      cataloged_actions: actions.length,
      executable_actions: executable_actions.length,
      buckparts_npm_scripts: buckpartsNpm,
      supabase_write_guarded_inventory_entries: writeGuarded,
    },
  };
}
