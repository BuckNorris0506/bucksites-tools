/**
 * BuckParts Operating Map v1 — static topology + repo-path references.
 * Built from discoverable repo files and `package.json` `buckparts:*` scripts (no runtime Supabase).
 */

import { existsSync, readFileSync } from "node:fs";
import path from "node:path";

export const OPERATING_MAP_REPORT_NAME = "buckparts_operating_map_v1" as const;

/** Single-line simplification theme shared with owner dashboard Founder Control Plane. */
export const FOUNDER_PRIMARY_SIMPLIFICATION_TARGET =
  "Consolidate founder-facing JSON: extend `buckparts:operator-proof` (or a single `buckparts:daily --json` alias) so Command Center + daily operator summaries are one stdout artifact, reducing duplicate copy/paste of large JSON blobs.";

export type OperatingMapCategory =
  | "truth_source"
  | "proof"
  | "command_center"
  | "customer_trust"
  | "monetization"
  | "evidence"
  | "learning"
  | "deployment"
  | "operator_workflow"
  | "ui"
  | "unknown";

export type MutationAuthority = "read_only" | "local_files" | "database_write" | "external_system" | "unknown";

export type CurrentOwner = "system" | "agent" | "jared" | "external" | "unknown";

export type FounderBurden = "low" | "medium" | "high" | "unknown";

export type AutonomyReadiness = "auto_safe_now" | "auto_safe_after_guardrail" | "owner_decision_required" | "blocked" | "unknown";

export type OperatingSystemV1 = {
  id: string;
  label: string;
  category: OperatingMapCategory;
  purpose: string;
  repo_paths: string[];
  inputs: string[];
  outputs: string[];
  mutation_authority: MutationAuthority;
  current_owner: CurrentOwner;
  founder_burden: FounderBurden;
  autonomy_readiness: AutonomyReadiness;
  proof_command: string | null;
  risks: string[];
  should_keep: boolean;
  merge_or_delete_candidate: boolean;
  notes: string;
};

export type OperatingMapEdgeV1 = {
  from: string;
  to: string;
  relationship: string;
  proof_path_or_script: string;
};

export type FounderBurdenSummaryV1 = {
  systems_total: number;
  high_burden_systems: string[];
  owner_decision_required_count: number;
  auto_safe_now_count: number;
  blocked_count: number;
  top_5_copy_paste_sources: string[];
  first_process_to_simplify: string;
};

export type SimplificationCandidateV1 = {
  kind: string;
  detail: string;
  related_system_ids: string[];
};

export type BuckpartsOperatingMapV1 = {
  report_name: typeof OPERATING_MAP_REPORT_NAME;
  generated_at: string;
  read_only: true;
  data_mutation: false;
  buckparts_npm_script_count: number | "unknown";
  systems: OperatingSystemV1[];
  edges: OperatingMapEdgeV1[];
  founder_burden_summary: FounderBurdenSummaryV1;
  simplification_candidates: SimplificationCandidateV1[];
  autonomy_candidates: string[];
  owner_only_decisions: string[];
  unknowns: string[];
  recommended_next_move: string;
  mermaid_graph: string;
};

const VALID_CATEGORY = new Set<string>([
  "truth_source",
  "proof",
  "command_center",
  "customer_trust",
  "monetization",
  "evidence",
  "learning",
  "deployment",
  "operator_workflow",
  "ui",
  "unknown",
]);

/** Curated from repo layout and `package.json` script names (inspected 2026-05-14). */
export const OPERATING_MAP_SYSTEMS_V1: OperatingSystemV1[] = [
  {
    id: "operator_proof_stack",
    label: "Operator proof stack",
    category: "operator_workflow",
    purpose:
      "Single local command chaining git, build, live-site read-only check, and Command Center JSON summary (`buckparts:operator-proof`).",
    repo_paths: ["scripts/buckparts-operator-proof.ts", "scripts/lib/buckparts-operator-proof.ts"],
    inputs: ["local git", "npm run build", "live-site-smoke-check", "report-buckparts-command-center"],
    outputs: ["stdout human-readable proof summary"],
    mutation_authority: "read_only",
    current_owner: "agent",
    founder_burden: "low",
    autonomy_readiness: "auto_safe_now",
    proof_command: "npm run buckparts:operator-proof",
    risks: ["Does not run mutating live-site-smoke; durable_write truth still separate."],
    should_keep: true,
    merge_or_delete_candidate: false,
    notes: "Wraps other scripts via spawn; reduces nested npm JSON corruption for CC.",
  },
  {
    id: "command_center_report",
    label: "Command Center report",
    category: "command_center",
    purpose: "Aggregates read-only lanes (Amazon rescue, learning outcomes, deploy, revenue ledger contract, etc.) to JSON.",
    repo_paths: ["scripts/report-buckparts-command-center.ts", "scripts/lib/buckparts-command-center-v2.ts"],
    inputs: ["local files under data/", "Supabase read models where configured", "provider mocks in tests"],
    outputs: ["JSON on stdout (stripEvidenceUncappedCandidatesForStdout)"],
    mutation_authority: "read_only",
    current_owner: "agent",
    founder_burden: "high",
    autonomy_readiness: "auto_safe_after_guardrail",
    proof_command: "npm run buckparts:command-center",
    risks: ["Large JSON; founder copy/paste fatigue if used outside operator-proof."],
    should_keep: true,
    merge_or_delete_candidate: false,
    notes: "Central decision surface for operator; overlaps partially with buckparts:daily.",
  },
  {
    id: "top_of_game_foundation_scorecard",
    label: "Top-of-game foundation scorecard",
    category: "proof",
    purpose: "Lane-based foundation maturity inside `command_center_v2.top_of_game_foundation_scorecard_v1`.",
    repo_paths: ["scripts/lib/top-of-game-foundation-scorecard-v1.ts", "scripts/lib/buckparts-command-center-v2-types.ts"],
    inputs: ["Command Center build inputs", "owner dashboard marker proof"],
    outputs: ["Scorecard object embedded in Command Center JSON"],
    mutation_authority: "read_only",
    current_owner: "system",
    founder_burden: "medium",
    autonomy_readiness: "auto_safe_now",
    proof_command: "npm run buckparts:command-center (extract scorecard lane)",
    risks: ["Lanes use score_contribution/max_contribution — wrong field names break summaries."],
    should_keep: true,
    merge_or_delete_candidate: false,
    notes: "Consumed by operator-proof extractor.",
  },
  {
    id: "live_site_smoke",
    label: "Live site smoke (artifact + optional durable write)",
    category: "proof",
    purpose: "HTTP monitor artifact; `live-site-smoke-artifact.ts` may persist to Supabase when configured.",
    repo_paths: ["scripts/live-site-smoke-artifact.ts", "scripts/live-site-smoke-check.ts", "scripts/lib/live-site-smoke.ts"],
    inputs: ["SITE_URL", "fetch", "optional Supabase service role"],
    outputs: ["JSON artifact", "optional DB owner_report_artifacts"],
    mutation_authority: "database_write",
    current_owner: "jared",
    founder_burden: "medium",
    autonomy_readiness: "owner_decision_required",
    proof_command: "npm run buckparts:live-site-smoke (mutating path) or npm run buckparts:live-site-smoke:check",
    risks: ["Mutating path violates read-only operator rituals if mis-invoked."],
    should_keep: true,
    merge_or_delete_candidate: false,
    notes: "Operator-proof uses check variant for read-only.",
  },
  {
    id: "owner_dashboard",
    label: "Owner dashboard (secret route)",
    category: "ui",
    purpose: "Internal owner UI including Top-of-game panel markers evaluated by readiness proof.",
    repo_paths: ["src/app/ownerdashboard", "scripts/lib/owner-dashboard-top-of-game-panel-readiness-v1.ts"],
    inputs: ["Next.js app", "dashboard source files"],
    outputs: ["Rendered pages", "marker presence signals for scorecard"],
    mutation_authority: "read_only",
    current_owner: "jared",
    founder_burden: "medium",
    autonomy_readiness: "owner_decision_required",
    proof_command: "npm run buckparts:command-center (owner_dashboard_ready lane)",
    risks: ["Human edits to dashboard affect scorecard without DB changes."],
    should_keep: true,
    merge_or_delete_candidate: false,
    notes: "Not customer-facing storefront routes.",
  },
  {
    id: "customer_ux_doctrine",
    label: "Customer UX / trust doctrine",
    category: "customer_trust",
    purpose: "Copy and doctrine helpers governing public trust language.",
    repo_paths: ["src/lib/copy/customer-ux-doctrine.ts", "src/lib/copy/public-trust.ts"],
    inputs: ["product copy requirements"],
    outputs: ["typed doctrine constants / helpers"],
    mutation_authority: "read_only",
    current_owner: "jared",
    founder_burden: "low",
    autonomy_readiness: "owner_decision_required",
    proof_command: null,
    risks: ["Drift vs live PDP claims if doctrine not aligned with evidence pipeline."],
    should_keep: true,
    merge_or_delete_candidate: false,
    notes: "Referenced by Command Center public trust contract builders.",
  },
  {
    id: "buy_link_and_go_redirect_gates",
    label: "Buy-link gate and /go redirect gate",
    category: "monetization",
    purpose: "Runtime gating for monetized links and go-route redirects.",
    repo_paths: [
      "src/lib/retailers/launch-buy-links.ts",
      "src/lib/retailers/go-redirect-gate.ts",
      "src/app/**/go/",
    ],
    inputs: ["retailer_links browser_truth fields", "link id routes"],
    outputs: ["allow/deny redirect", "gate failure kinds"],
    mutation_authority: "read_only",
    current_owner: "system",
    founder_burden: "low",
    autonomy_readiness: "blocked",
    proof_command: "npm test -- src/lib/retailers/go-redirect-gate.test.ts (and related)",
    risks: ["Weakening gates is out of scope for automation proposals."],
    should_keep: true,
    merge_or_delete_candidate: false,
    notes: "Multiple route tests under src/lib/retailers/*.test.ts.",
  },
  {
    id: "retailer_evidence_amazon_rescue",
    label: "Retailer evidence + Amazon rescue scripts",
    category: "evidence",
    purpose: "Local `data/evidence/amazon-*.json`, token precheck, audit/stage/preflight Amazon rescue, OEM queues.",
    repo_paths: [
      "data/evidence/",
      "scripts/report-amazon-refrigerator-token-precheck.ts",
      "scripts/audit-amazon-false-negative-rescue.ts",
      "scripts/stage-amazon-false-negative-rescue.ts",
      "scripts/preflight-amazon-false-negative-rescue.ts",
    ],
    inputs: ["human browser captures", "Supabase reads for filters/retailer_links"],
    outputs: ["evidence JSON", "reports JSON stdout", "staging JSON (stage script)"],
    mutation_authority: "local_files",
    current_owner: "jared",
    founder_burden: "high",
    autonomy_readiness: "owner_decision_required",
    proof_command: "npm run buckparts:precheck:amazon-refrigerator-tokens -- --tokens …",
    risks: ["Stage/mutate scripts must not be run under read-only map assumptions."],
    should_keep: true,
    merge_or_delete_candidate: true,
    notes: "Many overlapping `buckparts:report:*` / `buckparts:audit:*` entries in package.json increase surface area.",
  },
  {
    id: "learning_outcomes_pipeline",
    label: "Learning outcomes pipeline",
    category: "learning",
    purpose: "Read models, insert plans, writer-ready batches, approved insert executor (dry-run vs mutate).",
    repo_paths: [
      "scripts/lib/learning-outcomes-read-model-v1.ts",
      "scripts/lib/learning-outcomes-insert-plan-v1.ts",
      "scripts/execute-learning-outcomes-approved-insert-v1.ts",
    ],
    inputs: ["Supabase learning_outcomes reads", "data/evidence JSON", "confidence registry files"],
    outputs: ["Command Center lanes", "optional DB inserts when mutate flag"],
    mutation_authority: "database_write",
    current_owner: "jared",
    founder_burden: "high",
    autonomy_readiness: "owner_decision_required",
    proof_command: "npm run buckparts:learning-outcomes-approved-insert:dry-run",
    risks: ["Mutate script performs DB writes — owner-gated."],
    should_keep: true,
    merge_or_delete_candidate: false,
    notes: "Appears as multiple Command Center v2 contracts.",
  },
  {
    id: "revenue_truth_ledger",
    label: "Revenue truth ledger (file contract)",
    category: "truth_source",
    purpose: "Read-only owner ledger JSON — explicit not click_events revenue.",
    repo_paths: ["scripts/lib/revenue-truth-ledger-contract-v1.ts", "data/ops/revenue-ledger-v1.json"],
    inputs: ["data/ops/revenue-ledger-v1.json file presence and parse"],
    outputs: ["revenue_truth_ledger_contract_v1 in Command Center"],
    mutation_authority: "local_files",
    current_owner: "jared",
    founder_burden: "medium",
    autonomy_readiness: "auto_safe_after_guardrail",
    proof_command: null,
    risks: ["Stale ledger JSON vs actual payouts — external truth."],
    should_keep: true,
    merge_or_delete_candidate: false,
    notes: "REVENUE_LEDGER_FILE_RELATIVE_V1 constant in revenue-truth-ledger-contract-v1.ts.",
  },
  {
    id: "search_click_intelligence",
    label: "Search / click intelligence",
    category: "proof",
    purpose: "Click snapshot + command surface rollup feeding Command Center `search_and_click_intelligence_summary`.",
    repo_paths: ["scripts/lib/buckparts-click-events-snapshot.ts", "scripts/report-buckparts-command-surface.ts"],
    inputs: ["click event exports", "command surface builders"],
    outputs: ["summary object in Command Center root"],
    mutation_authority: "read_only",
    current_owner: "system",
    founder_burden: "medium",
    autonomy_readiness: "auto_safe_after_guardrail",
    proof_command: "npm run buckparts:command-surface",
    risks: ["UNKNOWN totals when artifacts missing."],
    should_keep: true,
    merge_or_delete_candidate: true,
    notes: "Overlaps with GA4/GSC fetch scripts for other wedges.",
  },
  {
    id: "visual_foundation_globals",
    label: "Global styles / visual foundation",
    category: "ui",
    purpose: "App-wide CSS variables and Tailwind layer (design surface).",
    repo_paths: ["src/app/globals.css"],
    inputs: ["CSS tokens", "Tailwind config"],
    outputs: ["rendered UI styles"],
    mutation_authority: "read_only",
    current_owner: "jared",
    founder_burden: "low",
    autonomy_readiness: "owner_decision_required",
    proof_command: "npm run build",
    risks: ["No separate design-tokens package in repo — single globals.css is discoverable anchor."],
    should_keep: true,
    merge_or_delete_candidate: false,
    notes: "UNKNOWN if additional token packages exist outside this path; not found via glob for tokens*.ts.",
  },
  {
    id: "supabase_migrations_schema",
    label: "Supabase migrations / schema",
    category: "deployment",
    purpose: "SQL migrations defining production schema (e.g. retailer_links, owner artifacts).",
    repo_paths: ["supabase/migrations/"],
    inputs: ["SQL migration authors", "Supabase CLI deploy"],
    outputs: ["applied schema on Supabase project"],
    mutation_authority: "database_write",
    current_owner: "jared",
    founder_burden: "high",
    autonomy_readiness: "blocked",
    proof_command: null,
    risks: ["Migration drift between envs not visible from repo alone."],
    should_keep: true,
    merge_or_delete_candidate: false,
    notes: "Read-only inspection: list migrations; applying is deploy-time mutation.",
  },
  {
    id: "nextjs_build_and_deploy",
    label: "Next.js build / deploy proof",
    category: "deployment",
    purpose: "Production Next build and platform deploy (Vercel or host — host file not pinned in repo).",
    repo_paths: ["package.json", "next.config.mjs", "src/app/"],
    inputs: ["source tree", "env vars"],
    outputs: [".next build output", "hosted site"],
    mutation_authority: "external_system",
    current_owner: "external",
    founder_burden: "medium",
    autonomy_readiness: "auto_safe_now",
    proof_command: "npm run build",
    risks: ["Deploy host specifics UNKNOWN from repo files alone."],
    should_keep: true,
    merge_or_delete_candidate: false,
    notes: "Operator-proof already runs build locally.",
  },
  {
    id: "buckparts_daily_operator",
    label: "Daily operator report",
    category: "operator_workflow",
    purpose: "Separate consolidated operator JSON (`buckparts:daily`) — overlaps Command Center outputs.",
    repo_paths: ["scripts/report-buckparts-daily-operator.ts"],
    inputs: ["similar providers as Command Center / surface"],
    outputs: ["JSON stdout"],
    mutation_authority: "read_only",
    current_owner: "agent",
    founder_burden: "high",
    autonomy_readiness: "auto_safe_after_guardrail",
    proof_command: "npm run buckparts:daily",
    risks: ["Duplicate mental model vs buckparts:command-center for founders."],
    should_keep: true,
    merge_or_delete_candidate: true,
    notes: "Listed as simplification: fold or cross-link in operator-proof output.",
  },
];

export const OPERATING_MAP_EDGES_V1: OperatingMapEdgeV1[] = [
  {
    from: "operator_proof_stack",
    to: "command_center_report",
    relationship: "spawns_read_only",
    proof_path_or_script: "scripts/buckparts-operator-proof.ts → report-buckparts-command-center.ts",
  },
  {
    from: "command_center_report",
    to: "top_of_game_foundation_scorecard",
    relationship: "embeds",
    proof_path_or_script: "command_center_v2.top_of_game_foundation_scorecard_v1",
  },
  {
    from: "live_site_smoke",
    to: "command_center_report",
    relationship: "feeds_deploy_lane_monitor",
    proof_path_or_script: "scripts/lib/live-site-smoke.ts → buildBuckpartsCommandCenterReport",
  },
  {
    from: "owner_dashboard",
    to: "top_of_game_foundation_scorecard",
    relationship: "marker_readiness_input",
    proof_path_or_script: "scripts/lib/owner-dashboard-top-of-game-panel-readiness-v1.ts",
  },
  {
    from: "retailer_evidence_amazon_rescue",
    to: "command_center_report",
    relationship: "evidence_files_and_db_reads",
    proof_path_or_script: "data/evidence + report-buckparts-command-center providers",
  },
  {
    from: "learning_outcomes_pipeline",
    to: "command_center_report",
    relationship: "embeds_lanes",
    proof_path_or_script: "scripts/lib/learning-outcomes-*.ts",
  },
  {
    from: "revenue_truth_ledger",
    to: "command_center_report",
    relationship: "embeds_contract",
    proof_path_or_script: "scripts/lib/revenue-truth-ledger-contract-v1.ts",
  },
  {
    from: "search_click_intelligence",
    to: "command_center_report",
    relationship: "rollup_into_root",
    proof_path_or_script: "scripts/report-buckparts-command-surface.ts",
  },
  {
    from: "buy_link_and_go_redirect_gates",
    to: "command_center_report",
    relationship: "enforces_runtime_policy_for_linked_ctas",
    proof_path_or_script: "src/lib/retailers/launch-buy-links.ts + go-redirect-gate.ts",
  },
  {
    from: "supabase_migrations_schema",
    to: "learning_outcomes_pipeline",
    relationship: "schema_enables_tables",
    proof_path_or_script: "supabase/migrations → public.learning_outcomes",
  },
  {
    from: "nextjs_build_and_deploy",
    to: "live_site_smoke",
    relationship: "deploy_target_for_http_smoke",
    proof_path_or_script: "npm run build + SITE_URL fetch",
  },
  {
    from: "customer_ux_doctrine",
    to: "command_center_report",
    relationship: "informs_public_trust_contracts",
    proof_path_or_script: "public_trust_unification_backend_contract_v1 builders",
  },
];

function summarizeFoundersBurden(systems: OperatingSystemV1[]): FounderBurdenSummaryV1 {
  const high = systems.filter((s) => s.founder_burden === "high").map((s) => s.id);
  const ownerDec = systems.filter((s) => s.autonomy_readiness === "owner_decision_required").length;
  const autoNow = systems.filter((s) => s.autonomy_readiness === "auto_safe_now").length;
  const blocked = systems.filter((s) => s.autonomy_readiness === "blocked").length;
  return {
    systems_total: systems.length,
    high_burden_systems: high,
    owner_decision_required_count: ownerDec,
    auto_safe_now_count: autoNow,
    blocked_count: blocked,
    top_5_copy_paste_sources: [
      "Command Center full JSON (`npm run buckparts:command-center`) when not using operator-proof",
      "Daily operator JSON (`npm run buckparts:daily`) overlapping Command Center facts",
      "Git status / HEAD blocks pasted into chat for merge readiness",
      "Live-site smoke JSON or monitor fields pasted for deploy truth",
      "Amazon evidence filenames / ASIN snippets pasted from `data/evidence/` without operator-proof wrapper",
    ],
    first_process_to_simplify: FOUNDER_PRIMARY_SIMPLIFICATION_TARGET,
  };
}

function buildSimplificationCandidates(): SimplificationCandidateV1[] {
  return [
    {
      kind: "duplicate_reports",
      detail: "`buckparts:daily` and `buckparts:command-center` both emit large operator JSON families.",
      related_system_ids: ["buckparts_daily_operator", "command_center_report"],
    },
    {
      kind: "operator_proof_fold",
      detail: "Operator proof already chains build + smoke check + CC; daily / demand-queue / affiliate tracker still separate npm entries.",
      related_system_ids: ["operator_proof_stack", "buckparts_daily_operator"],
    },
    {
      kind: "many_buckparts_scripts",
      detail: "`package.json` lists dozens of `buckparts:*` scripts (vertical runbooks, OEM, Amazon) increasing discovery cost.",
      related_system_ids: ["retailer_evidence_amazon_rescue"],
    },
    {
      kind: "unclear_owner_value",
      detail: "Cross-wedge ops + multiple guardrail reports — value real but navigation cost for founder UNKNOWN without usage metrics.",
      related_system_ids: ["command_center_report"],
    },
    {
      kind: "manual_paste",
      detail: "Any workflow that runs nested `npm run` JSON tools without `node --import tsx` risks stdout noise (previously fixed for CC in operator-proof).",
      related_system_ids: ["operator_proof_stack", "command_center_report"],
    },
  ];
}

function buildAutonomyCandidates(systems: OperatingSystemV1[]): string[] {
  return systems
    .filter((s) => s.autonomy_readiness === "auto_safe_now" || s.autonomy_readiness === "auto_safe_after_guardrail")
    .map((s) => `${s.id} (${s.autonomy_readiness})`);
}

function buildOwnerOnlyDecisions(systems: OperatingSystemV1[]): string[] {
  return systems
    .filter((s) => s.autonomy_readiness === "owner_decision_required")
    .map((s) => `${s.label} (${s.id}): ${s.mutation_authority === "database_write" ? "DB writes + approvals" : "owner content / policy"}`);
}

function escapeMermaidLabel(s: string): string {
  return s.replace(/"/g, "'").replace(/\n/g, " ");
}

function buildMermaidGraph(systems: OperatingSystemV1[], edges: OperatingMapEdgeV1[]): string {
  const lines: string[] = ["flowchart TD"];
  lines.push('  classDef readOnly fill:#e8f5e9;');
  lines.push('  classDef mutate fill:#ffebee;');
  lines.push('  classDef owner fill:#fff3e0;');
  lines.push('  classDef external fill:#e3f2fd;');

  lines.push(`  founder["Founder / Jared (owner decisions)"]:::owner`);
  lines.push(`  agent["Read-only automation (CI / agent)"]:::readOnly`);

  const byCat = new Map<string, OperatingSystemV1[]>();
  for (const s of systems) {
    const k = s.category;
    if (!byCat.has(k)) byCat.set(k, []);
    byCat.get(k)!.push(s);
  }

  for (const [cat, list] of Array.from(byCat.entries())) {
    const sg = `subgraph SG_${cat.replace(/[^a-z0-9]/gi, "_")}["${escapeMermaidLabel(cat)}"`;
    lines.push(`  ${sg}]`);
    for (const s of list) {
      const nid = `sys_${s.id}`;
      const cls =
        s.mutation_authority === "database_write" || s.mutation_authority === "local_files"
          ? "mutate"
          : s.current_owner === "external"
            ? "external"
            : "readOnly";
      lines.push(`    ${nid}["${escapeMermaidLabel(s.label)}"]:::${cls}`);
    }
    lines.push("  end");
  }

  for (const e of edges) {
    if (!systems.some((s) => s.id === e.from) || !systems.some((s) => s.id === e.to)) continue;
    lines.push(`  sys_${e.from} -->|"${escapeMermaidLabel(e.relationship)}"| sys_${e.to}`);
  }

  lines.push("  agent --> sys_operator_proof_stack");
  lines.push("  founder --> sys_learning_outcomes_pipeline");
  lines.push("  founder --> sys_live_site_smoke");
  lines.push("  founder --> sys_retailer_evidence_amazon_rescue");
  lines.push("  founder --> sys_supabase_migrations_schema");

  return lines.join("\n");
}

export function countBuckpartsScriptsFromPackageJson(text: string): number | "unknown" {
  try {
    const j = JSON.parse(text) as { scripts?: Record<string, string> };
    const scripts = j.scripts ?? {};
    return Object.keys(scripts).filter((k) => k.startsWith("buckparts:")).length;
  } catch {
    return "unknown";
  }
}

export function validateOperatingSystem(s: OperatingSystemV1): string[] {
  const errs: string[] = [];
  if (!VALID_CATEGORY.has(s.category)) errs.push(`bad category: ${s.id}`);
  if (!s.repo_paths.length) errs.push(`empty repo_paths: ${s.id}`);
  return errs;
}

export function buildBuckpartsOperatingMapV1(args: {
  generated_at: string;
  packageJsonText: string;
  repoRoot: string;
}): BuckpartsOperatingMapV1 {
  const systems = [...OPERATING_MAP_SYSTEMS_V1];
  const edges = [...OPERATING_MAP_EDGES_V1];
  const buckpartsCount = countBuckpartsScriptsFromPackageJson(args.packageJsonText);

  const unknowns: string[] = [];
  if (!existsSync(path.join(args.repoRoot, "supabase", "migrations"))) {
    unknowns.push("supabase/migrations path missing on disk — schema topology UNKNOWN");
  }
  if (!existsSync(path.join(args.repoRoot, "src", "app", "globals.css"))) {
    unknowns.push("src/app/globals.css missing — visual foundation path UNKNOWN");
  }

  const founder_burden_summary = summarizeFoundersBurden(systems);
  const simplification_candidates = buildSimplificationCandidates();
  const autonomy_candidates = buildAutonomyCandidates(systems);
  const owner_only_decisions = buildOwnerOnlyDecisions(systems);
  const recommended_next_move =
    "Ship one founder-facing JSON bundle by extending `buckparts:operator-proof` (or a thin wrapper) to optionally append `buckparts:daily` / demand-queue excerpts so Command Center is not copy/pasted twice.";

  return {
    report_name: OPERATING_MAP_REPORT_NAME,
    generated_at: args.generated_at,
    read_only: true,
    data_mutation: false,
    buckparts_npm_script_count: buckpartsCount,
    systems,
    edges,
    founder_burden_summary,
    simplification_candidates,
    autonomy_candidates,
    owner_only_decisions,
    unknowns,
    recommended_next_move,
    mermaid_graph: buildMermaidGraph(systems, edges),
  };
}

/** Test helper: load package.json from disk when present. */
export function readPackageJsonForOperatingMap(repoRoot: string): string {
  const p = path.join(repoRoot, "package.json");
  if (!existsSync(p)) return "{}";
  return readFileSync(p, "utf8");
}
