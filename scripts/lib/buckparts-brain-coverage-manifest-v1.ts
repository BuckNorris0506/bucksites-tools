/**
 * Read-only map of BuckParts operating systems vs Command Center JSON ownership.
 * PROVEN: no Supabase, retailer_links, or evidence writes.
 */

import { existsSync, readFileSync } from "node:fs";
import path from "node:path";

import type {
  BrainCoverageManifestEntryV1,
  BrainCoverageVerdictCountsV1,
  BrainCoverageVerdictV1,
  CommandCenterBrainCoverageManifestV1,
} from "./buckparts-command-center-v2-types";

export type BuildBrainCoverageManifestArgs = {
  rootDir: string;
  now: () => Date;
  fileExists?: (absolutePath: string) => boolean;
  readTextFile?: (absolutePath: string) => string;
};

type EntrySeed = Omit<BrainCoverageManifestEntryV1, "system_id"> & { system_id: string };

const VERDICTS: BrainCoverageVerdictV1[] = [
  "CONNECTED",
  "PARTIAL",
  "BYPASSING",
  "DUPLICATE",
  "DEPRECATED",
  "MISSING",
];

function entry(
  seed: EntrySeed,
): BrainCoverageManifestEntryV1 {
  const row: BrainCoverageManifestEntryV1 = {
    system_id: seed.system_id,
    npm_script_or_path: seed.npm_script_or_path,
    cc_json_path: seed.cc_json_path,
    dashboard_only: seed.dashboard_only,
    verdict: seed.verdict,
    blocks_lane_work: seed.blocks_lane_work,
    validation_command: seed.validation_command,
    reason: seed.reason,
  };
  if (seed.source !== undefined) row.source = seed.source;
  if (seed.role !== undefined) row.role = seed.role;
  if (seed.owner !== undefined) row.owner = seed.owner;
  if (seed.mutation_authority !== undefined) row.mutation_authority = seed.mutation_authority;
  if (seed.steering_authority !== undefined) row.steering_authority = seed.steering_authority;
  if (seed.notes !== undefined) row.notes = seed.notes;
  return row;
}

/** Curated systems beyond package.json script enumeration. */
const CURATED_ENTRIES: EntrySeed[] = [
  {
    system_id: "canonical_final_operating_decision",
    npm_script_or_path: "scripts/lib/buckparts-canonical-final-operating-decision-v1.ts",
    cc_json_path: "command_center_v2.canonical_final_operating_decision_v1",
    dashboard_only: false,
    verdict: "CONNECTED",
    blocks_lane_work: false,
    validation_command: "npm run buckparts:command-center",
    reason: "Authoritative owner-facing next-best-action and dispatch decision under documented precedence.",
    role: "authoritative owner-facing NBA",
    mutation_authority: false,
    steering_authority: true,
    notes: "canonical_final is the sole owner-facing NBA authority.",
  },
  {
    system_id: "credit_control_canonical",
    npm_script_or_path: "scripts/lib/buckparts-phase1-operating-circuit-v1.ts",
    cc_json_path: "command_center_v2.phase1_operating_circuit_v1.credit_control_canonical_v1",
    dashboard_only: false,
    verdict: "CONNECTED",
    blocks_lane_work: false,
    validation_command: "npm run buckparts:credit-control",
    reason: "Authoritative deploy-credit control projected through the Phase 1 operating circuit.",
    role: "authoritative deploy-credit",
    mutation_authority: false,
    steering_authority: true,
    notes: "Credit Control, not Semi-Cruise, is deploy-credit authority.",
  },
  {
    system_id: "semi_cruise",
    npm_script_or_path: "src/lib/owner-dashboard/semi-cruise-status-summary-v1.ts",
    cc_json_path: "command_center_v2.semi_cruise_status_summary_v1",
    dashboard_only: false,
    verdict: "CONNECTED",
    blocks_lane_work: false,
    validation_command: "npm run buckparts:command-center",
    reason: "Read-only advisory status summary; it cannot set an independent owner-facing NBA or deploy-credit outcome.",
    role: "advisory status summary",
    mutation_authority: false,
    steering_authority: false,
    notes: "advisory_only=true; non_authoritative=true; canonical_source=.command_center_v2.phase1_operating_circuit_v1.credit_control_canonical_v1",
  },
  {
    system_id: "control_graph",
    npm_script_or_path: "scripts/lib/command-center-control-graph-rollup-v1.ts",
    cc_json_path: "command_center_v2.command_center_control_graph_rollup_v1",
    dashboard_only: false,
    verdict: "CONNECTED",
    blocks_lane_work: false,
    validation_command: "npm run buckparts:command-center",
    reason: "Read-only control-plane diagnostic; canonical final operating decision retains NBA authority.",
    role: "advisory control-plane diagnostic",
    mutation_authority: false,
    steering_authority: false,
    notes: "advisory_only=true; non_authoritative=true; canonical_source=.command_center_v2.canonical_final_operating_decision_v1",
  },
  {
    system_id: "customer_steering_comparison",
    npm_script_or_path: "scripts/lib/customer-steering-comparison-v1.ts",
    cc_json_path: "command_center_v2.customer_steering_comparison_v1",
    dashboard_only: false,
    verdict: "CONNECTED",
    blocks_lane_work: false,
    validation_command: "npm run buckparts:command-center",
    reason: "Read-only customer-versus-factory comparison that does not replace canonical next-best-action.",
    role: "advisory steering comparison",
    mutation_authority: false,
    steering_authority: false,
    notes: "advisory_only=true; non_authoritative=true; canonical_source=.command_center_v2.canonical_final_operating_decision_v1",
  },
  {
    system_id: "retailer_link_parity_correction",
    npm_script_or_path: "npm run buckparts:retailer-link-parity-correction",
    cc_json_path: "command_center_v2.buckparts_retailer_link_parity_correction_v1",
    dashboard_only: false,
    verdict: "CONNECTED",
    blocks_lane_work: false,
    validation_command: "npm run buckparts:retailer-link-parity-correction",
    reason: "Read-only operational parity projection; it does not independently steer the NBA or authorize guarded apply.",
    role: "operational parity projection",
    mutation_authority: false,
    steering_authority: false,
    notes: "issue_registry remains steering; canonical_final remains NBA; credit_control remains credit.",
  },
  {
    system_id: "phase4_coverage_scoreboard",
    npm_script_or_path:
      "scripts/lib/buckparts-phase4-coverage-scoreboard-v1.ts + docs/BuckParts-PHASE4-COVERAGE-CONTRACT-V1.md",
    cc_json_path: "command_center_v2.phase4_coverage_scoreboard_v1",
    dashboard_only: false,
    verdict: "CONNECTED",
    blocks_lane_work: false,
    validation_command: "npm run buckparts:phase4-p4-entry",
    reason:
      "Read-only Phase 4 P4-ENTRY coverage scoreboard; prefers census safe-buyer-path truth; no mutation or NBA authority.",
    role: "operational coverage projection",
    mutation_authority: false,
    steering_authority: false,
    notes:
      "Census is canonical for SAFE_BUYER_PATH_PROVEN; demand safe_cta_count is not interchangeable; issue_registry remains steering; canonical_final remains NBA.",
  },
  {
    system_id: "phase4_decision_capture",
    npm_script_or_path:
      "scripts/lib/buckparts-phase4-decision-capture-v1.ts + docs/BuckParts-PHASE4-DECISION-CAPTURE-CONTRACT-V1.md",
    cc_json_path: "command_center_v2.phase4_decision_capture_v1",
    dashboard_only: false,
    verdict: "CONNECTED",
    blocks_lane_work: false,
    validation_command: "npm run buckparts:phase4-decision-capture",
    reason:
      "Read-only Phase 4 Decision-Capture sibling; evidence-entered BUY/DO-NOT-BUY/UNKNOWN; raw inventory excluded from denominator; no mutation or NBA authority.",
    role: "operational decision-capture projection",
    mutation_authority: false,
    steering_authority: false,
    notes:
      "Sibling to phase4_coverage_scoreboard only; census remains canonical for SAFE_BUYER_PATH_* page counts; issue_registry remains steering; canonical_final remains NBA.",
  },
  {
    system_id: "universal_coverage_factory_v1",
    npm_script_or_path:
      "src/lib/coverage-factory/universal-coverage-factory-v1.ts (read-only factory; not yet a Command Center lane)",
    cc_json_path: "NONE — ucf_decision_authority_cutover_v1 report via test harness",
    dashboard_only: false,
    verdict: "CONNECTED",
    blocks_lane_work: false,
    validation_command:
      "node --import tsx --test src/lib/coverage-factory/ucf-decision-authority-cutover-phase2-v1.test.ts",
    reason:
      "Universal Coverage Factory is the canonical coverage disposition authority for 60/60 registered homekeep subjects; cutover phase2 wires UCF provenance into operator lanes without CC redesign.",
    source: "src/lib/coverage-factory/universal-coverage-factory-v1.ts",
    role: "coverage disposition decision authority (registered subjects)",
    owner: "Coverage Factory / UCF",
    mutation_authority: false,
    steering_authority: false,
    notes: "ucf_decision_authority_cutover_v1 inventory + snapshot builder",
  },
  {
    system_id: "buckparts_command_center",
    npm_script_or_path: "npm run buckparts:command-center → scripts/report-buckparts-command-center.ts",
    cc_json_path: "report_name=buckparts_command_center_v1; command_center_v2",
    dashboard_only: false,
    verdict: "CONNECTED",
    blocks_lane_work: false,
    validation_command: "npm run buckparts:command-center",
    reason: "Primary Command Center JSON builder; aggregates v1 summaries, command_center_v2 lanes, and owner_command_center_neurons.",
  },
  {
    system_id: "owner_command_center_neurons",
    npm_script_or_path: "src/lib/owner-dashboard/owner-command-center-neurons-v1.ts",
    cc_json_path: "owner_command_center_neurons",
    dashboard_only: false,
    verdict: "CONNECTED",
    blocks_lane_work: false,
    validation_command:
      "node --import tsx scripts/report-buckparts-command-center.ts | jq '.owner_command_center_neurons.data_mutation'",
    reason: "Eight neurons built during Command Center report generation (not dashboard-only).",
  },
  {
    system_id: "command_center_issue_reaudit",
    npm_script_or_path: "scripts/lib/command-center-issue-reaudit-v1.ts",
    cc_json_path: "command_center_v2.command_center_issue_reaudit_v1",
    dashboard_only: false,
    verdict: "CONNECTED",
    blocks_lane_work: false,
    validation_command:
      "node --import tsx --test scripts/lib/command-center-issue-reaudit-v1.test.ts",
    reason:
      "Read-only re-audit plan for DEPLOYED issues awaiting live RE_AUDIT; feeds HyperAgent prompts.",
  },
  {
    system_id: "command_center_issue_registry",
    npm_script_or_path: "data/command-center/issues/*.json + scripts/lib/command-center-issue-registry-command-center-v1.ts",
    cc_json_path: "command_center_v2.command_center_issue_registry_v1",
    dashboard_only: false,
    verdict: "CONNECTED",
    blocks_lane_work: false,
    validation_command:
      "node --import tsx --test scripts/lib/command-center-issue-registry-v1.test.ts",
    reason:
      "Read-only issue lifecycle registry loaded from data/command-center/issues; steers TIER_0 next_best_action when open.",
  },
  {
    system_id: "truth_integrity_registry_v1",
    npm_script_or_path:
      "data/truth-integrity/truth-integrity-registry-v1.json + scripts/lib/command-center-truth-integrity-registry-v1.ts",
    cc_json_path: "command_center_v2.truth_integrity_registry_v1",
    dashboard_only: false,
    verdict: "CONNECTED",
    blocks_lane_work: false,
    validation_command:
      "node --import tsx --test scripts/lib/command-center-truth-integrity-registry-v1.test.ts",
    reason:
      "Truth Integrity Department read-only truth debt ledger projected into Command Center during report generation.",
    source: "data/truth-integrity/truth-integrity-registry-v1.json",
    role: "truth debt / integrity finding ledger",
    owner: "Truth Integrity Department",
    mutation_authority: false,
    steering_authority: false,
    notes: "visible to Brain/Command Center, no NBA override",
  },
  {
    system_id: "manufacturer_rescue_owner_approval_packet_factory_v1",
    npm_script_or_path: "npm run buckparts:manufacturer-rescue-owner-approval-packet-factory",
    cc_json_path: "command_center_v2.manufacturer_rescue_owner_approval_packet_factory_v1",
    dashboard_only: false,
    verdict: "CONNECTED",
    blocks_lane_work: false,
    validation_command:
      "node --import tsx --test scripts/lib/manufacturer-rescue-owner-approval-packet-factory-v1.test.ts",
    reason:
      "Read-only owner approval cohort packets from READY_FOR_OWNER_REVIEW apply plans; never auto-approves; feeds readiness gate owner_approval_exists.",
    source:
      "data/fridge/batch-production/drafts/manufacturer-rescue-owner-approval-packet-factory-v1.json",
    role: "manufacturer rescue owner approval packet factory",
    owner: "Manufacturer Safe Link Rescue",
    mutation_authority: false,
    steering_authority: false,
    notes: "Founder decision with owner_mutation_approved required before readiness gate promotion",
  },
  {
    system_id: "manufacturer_browser_proof_execution_factory_v1",
    npm_script_or_path: "npm run buckparts:manufacturer-browser-proof-execution-factory",
    cc_json_path: "command_center_v2.manufacturer_browser_proof_execution_factory_v1",
    dashboard_only: false,
    verdict: "CONNECTED",
    blocks_lane_work: false,
    validation_command:
      "node --import tsx --test scripts/lib/manufacturer-browser-proof-execution-factory-v1.test.ts",
    reason:
      "Read-only execution packet factory from committed refresh-orchestrator and browser-proof-factory artifacts; never auto-grants PASS_BROWSER_PROOF.",
    source: "data/fridge/batch-production/drafts/manufacturer-browser-proof-execution-factory-v1.json",
    role: "manufacturer browser proof execution factory",
    owner: "Manufacturer Safe Link Rescue",
    mutation_authority: false,
    steering_authority: false,
    notes: "Reduces repetitive browser-proof preparation; owner confirmation required before PASS",
  },
  {
    system_id: "manufacturer_rescue_throughput_analytics_v1",
    npm_script_or_path: "npm run buckparts:manufacturer-rescue-throughput-analytics",
    cc_json_path: "command_center_v2.manufacturer_rescue_throughput_analytics_v1",
    dashboard_only: false,
    verdict: "CONNECTED",
    blocks_lane_work: false,
    validation_command:
      "node --import tsx --test scripts/lib/manufacturer-rescue-throughput-analytics-v1.test.ts",
    reason:
      "Read-only Manufacturer Rescue KPI dashboard — funnel metrics, bottlenecks, and weekly unlock estimate from committed upstream artifacts only.",
    source: "data/fridge/batch-production/drafts/manufacturer-rescue-throughput-analytics-v1.json",
    role: "manufacturer rescue throughput analytics",
    owner: "Manufacturer Safe Link Rescue",
    mutation_authority: false,
    steering_authority: false,
    notes: "Production KPI dashboard; does not rebuild upstream systems",
  },
  {
    system_id: "manufacturer_browser_proof_refresh_orchestrator_v1",
    npm_script_or_path: "npm run buckparts:manufacturer-browser-proof-refresh-orchestrator",
    cc_json_path: "command_center_v2.manufacturer_browser_proof_refresh_orchestrator_v1",
    dashboard_only: false,
    verdict: "CONNECTED",
    blocks_lane_work: false,
    validation_command:
      "node --import tsx --test scripts/lib/manufacturer-browser-proof-refresh-orchestrator-v1.test.ts",
    reason:
      "Read-only refresh scheduling from manufacturer_browser_proof_factory_v1; never auto-grants PASS browser proof.",
    source:
      "data/fridge/batch-production/drafts/manufacturer-browser-proof-refresh-orchestrator-v1.json",
    role: "manufacturer browser proof refresh orchestrator",
    owner: "Manufacturer Safe Link Rescue",
    mutation_authority: false,
    steering_authority: false,
    notes: "Schedules manufacturer-level refresh batches; GE produces normalization drafts only",
  },
  {
    system_id: "manufacturer_browser_proof_factory_v1",
    npm_script_or_path: "npm run buckparts:manufacturer-browser-proof-factory",
    cc_json_path: "command_center_v2.manufacturer_browser_proof_factory_v1",
    dashboard_only: false,
    verdict: "CONNECTED",
    blocks_lane_work: false,
    validation_command:
      "node --import tsx --test scripts/lib/manufacturer-browser-proof-factory-v1.test.ts",
    reason:
      "Read-only batched browser proof capture planning; never auto-grants PASS_BROWSER_PROOF; feeds readiness gate and apply-plan factory.",
    source: "data/fridge/batch-production/drafts/manufacturer-browser-proof-factory-v1.json",
    role: "manufacturer rescue browser proof evidence factory",
    owner: "Manufacturer Safe Link Rescue",
    mutation_authority: false,
    steering_authority: false,
    notes: "Batches capture by manufacturer/strategy; owner review required for PASS verdicts",
  },
  {
    system_id: "manufacturer_safe_link_rescue_readiness_gate_v1",
    npm_script_or_path: "npm run buckparts:manufacturer-safe-link-rescue-readiness-gate",
    cc_json_path:
      "command_center_v2.manufacturer_safe_link_rescue_runner_v1.readiness_gate_artifact; data/fridge/batch-production/drafts/manufacturer-safe-link-rescue-readiness-gate-v1.json",
    dashboard_only: false,
    verdict: "CONNECTED",
    blocks_lane_work: false,
    validation_command:
      "node --import tsx --test scripts/lib/manufacturer-safe-link-rescue-readiness-gate-v1.test.ts",
    reason:
      "Sole promotion authority for manufacturer rescue READY_FOR_APPLY; Runner/CC/MCP fail closed without committed fresh gate artifact.",
    source:
      "data/fridge/batch-production/drafts/manufacturer-safe-link-rescue-readiness-gate-v1.json",
    role: "manufacturer rescue apply promotion gate",
    owner: "Manufacturer Safe Link Rescue",
    mutation_authority: false,
    steering_authority: true,
    notes: "Director guarded_apply_queue is nomination only; readiness gate grants READY_FOR_APPLY",
  },
  {
    system_id: "manufacturer_safe_link_rescue_runner_v1",
    npm_script_or_path: "npm run buckparts:manufacturer-safe-link-rescue-runner",
    cc_json_path: "command_center_v2.manufacturer_safe_link_rescue_runner_v1",
    dashboard_only: false,
    verdict: "CONNECTED",
    blocks_lane_work: false,
    validation_command:
      "node --import tsx --test scripts/lib/manufacturer-safe-link-rescue-runner-v1.test.ts",
    reason:
      "Read-only runner projection; consumes committed readiness gate for READY_FOR_APPLY slot only.",
    mutation_authority: false,
    steering_authority: false,
  },
  {
    system_id: "manufacturer_safe_link_rescue_director_v1",
    npm_script_or_path: "npm run buckparts:manufacturer-safe-link-rescue-director",
    cc_json_path: "command_center_v2.manufacturer_safe_link_rescue_director_v1",
    dashboard_only: false,
    verdict: "CONNECTED",
    blocks_lane_work: false,
    validation_command:
      "node --import tsx --test scripts/lib/manufacturer-safe-link-rescue-director-v1.test.ts",
    reason:
      "Ranks nominated apply candidates; readiness_gate_required_before_apply=true; does not grant apply promotion.",
    mutation_authority: false,
    steering_authority: false,
  },
  {
    system_id: "manufacturer_safe_link_rescue_orchestrator_v1",
    npm_script_or_path: "npm run buckparts:manufacturer-safe-link-rescue-orchestrator",
    cc_json_path: "NONE — feeds director/runner via draft artifacts",
    dashboard_only: false,
    verdict: "CONNECTED",
    blocks_lane_work: false,
    validation_command:
      "node --import tsx --test scripts/lib/manufacturer-safe-link-rescue-orchestrator-v1.test.ts",
    reason: "Unified manufacturer rescue queue facts; shared browser proof evidence helpers.",
    mutation_authority: false,
    steering_authority: false,
  },
  {
    system_id: "seo_opportunity_registry",
    npm_script_or_path:
      "data/command-center/opportunities/seo/*.json + scripts/lib/command-center-seo-opportunity-registry-v1.ts",
    cc_json_path: "command_center_v2.seo_opportunity_registry_v1",
    dashboard_only: false,
    verdict: "CONNECTED",
    blocks_lane_work: false,
    validation_command:
      "node --import tsx --test scripts/lib/command-center-opportunity-registries-v1.test.ts",
    reason:
      "Read-only planning-only SEO opportunities; seeded starter examples; does not steer next_best_action.",
  },
  {
    system_id: "revenue_opportunity_registry",
    npm_script_or_path:
      "data/command-center/opportunities/revenue/*.json + scripts/lib/command-center-revenue-opportunity-registry-v1.ts",
    cc_json_path: "command_center_v2.revenue_opportunity_registry_v1",
    dashboard_only: false,
    verdict: "CONNECTED",
    blocks_lane_work: false,
    validation_command:
      "node --import tsx --test scripts/lib/command-center-opportunity-registries-v1.test.ts",
    reason:
      "Read-only planning-only revenue opportunities; seeded starter examples; does not steer next_best_action.",
  },
  {
    system_id: "distribution_opportunity_registry",
    npm_script_or_path:
      "data/command-center/opportunities/distribution/*.json + scripts/lib/command-center-distribution-opportunity-registry-v1.ts",
    cc_json_path: "command_center_v2.distribution_opportunity_registry_v1",
    dashboard_only: false,
    verdict: "CONNECTED",
    blocks_lane_work: false,
    validation_command:
      "node --import tsx --test scripts/lib/command-center-opportunity-registries-v1.test.ts",
    reason:
      "Read-only planning-only distribution opportunities; seeded starter examples; does not steer next_best_action.",
  },
  {
    system_id: "owner_quarantined_fridge_models",
    npm_script_or_path: "src/lib/owner-dashboard/owner-quarantined-fridge-models-v1.ts",
    cc_json_path: "command_center_v2.owner_quarantined_fridge_models_v1",
    dashboard_only: false,
    verdict: "CONNECTED",
    blocks_lane_work: false,
    validation_command:
      "node --import tsx scripts/report-buckparts-command-center.ts | jq '.command_center_v2.owner_quarantined_fridge_models_v1.data_mutation'",
    reason: "Quarantined fridge model summary built during Command Center report generation (read-only).",
  },
  {
    system_id: "owner_vertical_launch_policy",
    npm_script_or_path: "src/lib/owner-dashboard/owner-vertical-launch-policy-v1.ts",
    cc_json_path: "command_center_v2.owner_vertical_launch_policy_v1",
    dashboard_only: false,
    verdict: "CONNECTED",
    blocks_lane_work: false,
    validation_command:
      "node --import tsx scripts/report-buckparts-command-center.ts | jq '.command_center_v2.owner_vertical_launch_policy_v1.data_mutation'",
    reason: "Vertical launch policy built during Command Center report generation (read-only).",
  },
  {
    system_id: "owner_integrity_sentinel",
    npm_script_or_path: "src/lib/owner-dashboard/owner-integrity-sentinel-v1.ts",
    cc_json_path: "command_center_v2.owner_integrity_sentinel_v1",
    dashboard_only: false,
    verdict: "CONNECTED",
    blocks_lane_work: false,
    validation_command:
      "node --import tsx scripts/report-buckparts-command-center.ts | jq '.command_center_v2.owner_integrity_sentinel_v1.data_mutation'",
    reason: "Truth-quality sentinel built during Command Center report generation (read-only).",
  },
  {
    system_id: "universal_batch_lifecycle_apply_execution_plan",
    npm_script_or_path: "npm run buckparts:universal-batch-lifecycle-apply-execution-plan",
    cc_json_path: "command_center_v2.universal_batch_lifecycle_apply_execution_plan_v1",
    dashboard_only: false,
    verdict: "CONNECTED",
    blocks_lane_work: false,
    validation_command:
      "node --import tsx scripts/report-buckparts-command-center.ts | jq '.command_center_v2.universal_batch_lifecycle_apply_execution_plan_v1.data_mutation'",
    reason:
      "Read-only lifecycle-owned apply execution plan preview for refrigerator_water when apply-readiness is PROVEN; no mutation authority.",
  },
  {
    system_id: "universal_batch_lifecycle_mutation_authorization_review",
    npm_script_or_path: "npm run buckparts:universal-batch-lifecycle-mutation-authorization-review",
    cc_json_path: "command_center_v2.universal_batch_lifecycle_mutation_authorization_review_v1",
    dashboard_only: false,
    verdict: "CONNECTED",
    blocks_lane_work: false,
    validation_command:
      "node --import tsx scripts/report-buckparts-command-center.ts | jq '.command_center_v2.universal_batch_lifecycle_mutation_authorization_review_v1.data_mutation'",
    reason:
      "Read-only lifecycle-owned mutation authorization review using founder decision registry active owner_mutation_approved rows; no automatic apply authority.",
  },
  {
    system_id: "universal_batch_lifecycle_apply_readiness",
    npm_script_or_path: "npm run buckparts:universal-batch-lifecycle-apply-readiness",
    cc_json_path: "command_center_v2.universal_batch_lifecycle_apply_readiness_v1",
    dashboard_only: false,
    verdict: "CONNECTED",
    blocks_lane_work: false,
    validation_command:
      "node --import tsx scripts/report-buckparts-command-center.ts | jq '.command_center_v2.universal_batch_lifecycle_apply_readiness_v1.data_mutation'",
    reason:
      "Read-only lifecycle-owned post-approval apply-readiness discovery for refrigerator_water; proves or blocks readiness without mutation authority.",
  },
  {
    system_id: "universal_batch_lifecycle_truth_table",
    npm_script_or_path:
      "scripts/lib/universal-batch-lifecycle-truth-table-v1.ts (projected during Command Center build)",
    cc_json_path: "command_center_v2.universal_batch_lifecycle_truth_table_v1",
    dashboard_only: false,
    verdict: "CONNECTED",
    blocks_lane_work: false,
    validation_command:
      "node --import tsx scripts/report-buckparts-command-center.ts | jq '.command_center_v2.universal_batch_lifecycle_truth_table_v1.data_mutation'",
    reason:
      "Read-only universal batch lifecycle consolidation blueprint projected into Command Center JSON; diagnostic only — not an operational gate or apply authority.",
  },
  {
    system_id: "command_center_efficiency_truth_table",
    npm_script_or_path:
      "scripts/lib/command-center-efficiency-truth-table-v1.ts (projected during Command Center build)",
    cc_json_path: "command_center_v2.command_center_efficiency_truth_table_v1",
    dashboard_only: false,
    verdict: "CONNECTED",
    blocks_lane_work: false,
    validation_command:
      "node --import tsx scripts/report-buckparts-command-center.ts | jq '.command_center_v2.command_center_efficiency_truth_table_v1.data_mutation'",
    reason:
      "Read-only efficiency / SOP truth table projected into Command Center JSON during report generation; diagnostic consolidation guidance only — not an operational gate.",
  },
  {
    system_id: "owner_gsc_external_demand",
    npm_script_or_path: "src/lib/owner-dashboard/load-command-center-report.ts",
    cc_json_path: null,
    dashboard_only: true,
    verdict: "DUPLICATE",
    blocks_lane_work: false,
    validation_command:
      "node --import tsx scripts/report-buckparts-command-center.ts | jq '.owner_command_center_neurons.neurons[] | select(.neuron_key==\"gsc_search_discovery\")'",
    reason: "Dashboard re-builds GSC demand neuron; CC already exposes gsc_search_discovery neuron and external_measurement_freshness_v1.",
  },
  {
    system_id: "owner_search_demand_and_gaps",
    npm_script_or_path: "src/lib/owner-dashboard/load-command-center-report.ts",
    cc_json_path: null,
    dashboard_only: true,
    verdict: "DUPLICATE",
    blocks_lane_work: false,
    validation_command:
      "node --import tsx scripts/report-buckparts-command-center.ts | jq '.owner_command_center_neurons.neurons[] | select(.neuron_key==\"search_demand_and_gaps\")'",
    reason: "Dashboard attachment duplicates search_and_click_intelligence_summary and search_demand_and_gaps neuron.",
  },
  {
    system_id: "hq_handoff_doc",
    npm_script_or_path: "docs/BuckParts-HQ-HANDOFF.md",
    cc_json_path: null,
    dashboard_only: false,
    verdict: "DEPRECATED",
    blocks_lane_work: false,
    validation_command: "test -f docs/BuckParts-HQ-HANDOFF.md",
    reason:
      "advisory_only; non_authoritative; canonical_source=.command_center_v2.canonical_final_operating_decision_v1 — HQ handoff is migration/context only, never operational NBA/credit truth.",
    steering_authority: false,
    mutation_authority: false,
    notes:
      "advisory_only=true; non_authoritative=true; do not ask owner to reconcile HQ handoff vs Command Center",
  },
  {
    system_id: "sentry_error_monitoring",
    npm_script_or_path: "sentry.server.config.ts; src/lib/monitoring/error-monitoring.ts",
    cc_json_path: null,
    dashboard_only: false,
    verdict: "MISSING",
    blocks_lane_work: false,
    validation_command: "test -f sentry.server.config.ts",
    reason: "Runtime errors go to Sentry; no CC lane aggregates incident or stuck-agent state.",
  },
  {
    system_id: "github_actions_live_status",
    npm_script_or_path: ".github/workflows/buckparts-daily-operator.yml; .github/workflows/buckparts-founder-digest.yml; .github/workflows/buckparts-runner-step.yml",
    cc_json_path: null,
    dashboard_only: false,
    verdict: "MISSING",
    blocks_lane_work: false,
    validation_command: "ls .github/workflows",
    reason: "Workflow files exist in repo; last-run pass/fail status is not ingested into Command Center JSON.",
  },
];

/** Per npm script overrides (package.json keys starting with buckparts:). */
const NPM_SCRIPT_OVERRIDES: Record<string, Partial<EntrySeed>> = {
  "buckparts:command-center": {
    system_id: "buckparts_command_center",
    cc_json_path: "report_name=buckparts_command_center_v1; command_center_v2.deploy_publish_queue_v1",
    verdict: "CONNECTED",
    validation_command:
      "node --import tsx scripts/report-buckparts-command-center.ts | jq '.command_center_v2.deploy_publish_queue_v1.netlify_api_call_authorized'",
    reason:
      "Canonical Command Center JSON stdout; includes read-only deploy_publish_queue_v1 Netlify API budget gate (never executes Netlify).",
  },
  "buckparts:command-surface": {
    cc_json_path: "ingested via buildBuckpartsCommandCenterReport → coverage_health, v1 summaries",
    verdict: "PARTIAL",
    validation_command: "npm run buckparts:command-surface",
    reason: "Consumed during CC build; also runnable as standalone CLI JSON.",
  },
  "buckparts:affiliate-tracker": {
    cc_json_path: "affiliate_readiness_summary; command_center_v2.affiliate_readiness",
    verdict: "CONNECTED",
    validation_command: "npm run buckparts:affiliate-tracker",
    reason: "Tracker JSON ingested once per CC build.",
  },
  "buckparts:blocked-link-queue": {
    cc_json_path: "blocked_link_summary",
    verdict: "CONNECTED",
    validation_command: "npm run buckparts:blocked-link-queue",
    reason: "Blocked link rollup is a v1 CC field.",
  },
  "buckparts:amazon-first-blocked-queue": {
    cc_json_path: "amazon_first_blocked_queue_summary; command_center_v2.amazon_rescue",
    verdict: "PARTIAL",
    validation_command: "npm run buckparts:amazon-first-blocked-queue",
    reason: "Ingested by CC build and available as standalone queue JSON (drift risk).",
  },
  "buckparts:frigidaire-dead-oem-link-ids": {
    cc_json_path: "recent_learning_outcomes.frigidaire_dead_oem_outcome",
    verdict: "CONNECTED",
    validation_command: "npm run buckparts:frigidaire-dead-oem-link-ids",
    reason: "Frigidaire dead OEM outcome embedded in CC v1.",
  },
  "buckparts:frigidaire-next-candidates": {
    cc_json_path: "top_money_queue",
    verdict: "PARTIAL",
    validation_command: "npm run buckparts:frigidaire-next-candidates",
    reason: "Feeds top_money_queue lane inside CC.",
  },
  "buckparts:oem-next-money-cohort": {
    cc_json_path: "top_money_queue",
    verdict: "PARTIAL",
    validation_command: "npm run buckparts:oem-next-money-cohort",
    reason: "Feeds top_money_queue lane inside CC.",
  },
  "buckparts:gsc:fetch": {
    cc_json_path: "command_center_v2.external_measurement_freshness_v1.gsc",
    verdict: "PARTIAL",
    validation_command: "npm run buckparts:gsc:fetch",
    reason: "Writes artifact only; CC reads artifact via external_measurement_freshness_v1 (no live fetch in CC).",
  },
  "buckparts:ga4:fetch": {
    cc_json_path: "command_center_v2.external_measurement_freshness_v1.ga4",
    verdict: "PARTIAL",
    validation_command: "npm run buckparts:ga4:fetch",
    reason: "Writes artifact only; CC reads artifact via external_measurement_freshness_v1.",
  },
  "buckparts:live-site-smoke:check": {
    cc_json_path: "command_center_v2.deploy_live_site_monitor_v1.inspect_summary",
    verdict: "CONNECTED",
    validation_command: "npm run buckparts:live",
    reason: "Read-only check feeds deploy_live_site_monitor_v1 lane (inline on CLI when artifact missing).",
  },
  "buckparts:daily": {
    cc_json_path: "command_center_v2.daily_operator_summary_v1",
    verdict: "CONNECTED",
    validation_command:
      "node --import tsx scripts/report-buckparts-command-center.ts | jq '.command_center_v2.daily_operator_summary_v1.data_mutation'",
    reason:
      "Daily operator decision summary projected into Command Center JSON during report generation (read-only); full buckparts_daily_operator_v1 remains on npm run buckparts:daily.",
  },
  "buckparts:demand-work-queue": {
    cc_json_path: "command_center_v2.demand_work_queue_summary_v1",
    verdict: "CONNECTED",
    validation_command:
      "node --import tsx scripts/report-buckparts-command-center.ts | jq '.command_center_v2.demand_work_queue_summary_v1.data_mutation'",
    reason:
      "Demand work queue summary projected into Command Center JSON during report generation (read-only); full buckparts_demand_work_queue_v1 remains on npm run buckparts:demand-work-queue.",
  },
  "buckparts:large-batch-coverage-factory": {
    cc_json_path: "command_center_v2.large_batch_coverage_factory_summary_v1",
    verdict: "CONNECTED",
    validation_command:
      "node --import tsx scripts/report-buckparts-command-center.ts | jq '.command_center_v2.large_batch_coverage_factory_summary_v1.data_mutation'",
    reason:
      "Large Batch Coverage Factory summary projected into Command Center JSON during report generation (read-only); full buckparts_large_batch_coverage_factory_v1 remains on npm run buckparts:large-batch-coverage-factory.",
  },
  "buckparts:fridge-buyer-path-owner-review-bridge": {
    cc_json_path: "command_center_v2.fridge_buyer_path_owner_review_bridge_v1",
    verdict: "CONNECTED",
    validation_command:
      "node --import tsx scripts/report-buckparts-command-center.ts | jq '.command_center_v2.fridge_buyer_path_owner_review_bridge_v1.data_mutation'",
    reason:
      "Fridge buyer-path owner-review bridge projected into Command Center JSON during report generation (read-only); full fridge_buyer_path_owner_review_bridge_v1 remains on npm run buckparts:fridge-buyer-path-owner-review-bridge.",
  },
  "buckparts:fridge-buyer-path-owner-review-packet": {
    cc_json_path: "command_center_v2.fridge_buyer_path_owner_review_packet_v1",
    verdict: "CONNECTED",
    validation_command:
      "node --import tsx scripts/report-buckparts-command-center.ts | jq '.command_center_v2.fridge_buyer_path_owner_review_packet_v1.data_mutation'",
    reason:
      "Fridge buyer-path owner review packet projected into Command Center JSON during report generation (read-only); full fridge_buyer_path_owner_review_packet_v1 with normalized committed_live_row rows remains on npm run buckparts:fridge-buyer-path-owner-review-packet.",
  },
  "buckparts:fridge-buyer-path-batch-proposal": {
    cc_json_path: "command_center_v2.fridge_buyer_path_batch_proposal_v1",
    verdict: "CONNECTED",
    validation_command:
      "node --import tsx scripts/report-buckparts-command-center.ts | jq '.command_center_v2.fridge_buyer_path_batch_proposal_v1.data_mutation'",
    reason:
      "Fridge buyer-path batch proposal projected into Command Center JSON during report generation (read-only); full fridge_buyer_path_batch_proposal_v1 with proposed_rows remains on npm run buckparts:fridge-buyer-path-batch-proposal.",
  },
  "buckparts:fridge-buyer-path-batch-approval": {
    cc_json_path: "command_center_v2.fridge_buyer_path_batch_approval_v1",
    verdict: "CONNECTED",
    validation_command:
      "node --import tsx scripts/report-buckparts-command-center.ts | jq '.command_center_v2.fridge_buyer_path_batch_approval_v1.data_mutation'",
    reason:
      "Fridge buyer-path batch approval bridge projected into Command Center JSON (read-only); checklist and optional founder registry export via npm run buckparts:fridge-buyer-path-batch-approval.",
  },
  "buckparts:owner-drift-detector": {
    cc_json_path: "command_center_v2.owner_drift_detector_v1",
    verdict: "CONNECTED",
    validation_command:
      "node --import tsx scripts/report-buckparts-command-center.ts | jq '.command_center_v2.owner_drift_detector_v1.data_mutation'",
    reason:
      "Owner drift detector projected into Command Center JSON during report generation (read-only); classify arbitrary ideas via npm run buckparts:owner-drift-detector -- --idea \"...\".",
  },
  "buckparts:batch-run-registry-intake": {
    cc_json_path: "command_center_v2.batch_run_registry_intake_v1",
    verdict: "CONNECTED",
    validation_command:
      "node --import tsx scripts/report-buckparts-command-center.ts | jq '.command_center_v2.batch_run_registry_intake_v1.data_mutation'",
    reason:
      "Universal batch run-registry intake projected into Command Center JSON (read-only); AP proven run + fridge planning gap via npm run buckparts:batch-run-registry-intake.",
  },
  "buckparts:fridge-buyer-path-batch-run-registry": {
    cc_json_path: null,
    verdict: "PARTIAL",
    validation_command: "npm run buckparts:fridge-buyer-path-batch-run-registry",
    reason:
      "Authors fridge_buyer_path_batch_planning_run_registry_v1 to stdout; explicit --registry-out writes under data/fridge/batch-production/run-registry/ only. Intake visibility via batch_run_registry_intake_v1.",
  },
  "buckparts:fridge-buyer-path-batch-apply-plan-proposal": {
    cc_json_path: "command_center_v2.fridge_buyer_path_batch_apply_plan_proposal_v1",
    verdict: "CONNECTED",
    validation_command:
      "node --import tsx scripts/report-buckparts-command-center.ts | jq '.command_center_v2.fridge_buyer_path_batch_apply_plan_proposal_v1.data_mutation'",
    reason:
      "Read-only fridge buyer-path batch apply-plan proposal projected into Command Center JSON; full planned_changes on npm run buckparts:fridge-buyer-path-batch-apply-plan-proposal.",
  },
  "buckparts:fridge-buyer-path-batch-apply-plan-approval": {
    cc_json_path: "command_center_v2.fridge_buyer_path_batch_apply_plan_approval_v1",
    verdict: "CONNECTED",
    validation_command:
      "node --import tsx scripts/report-buckparts-command-center.ts | jq '.command_center_v2.fridge_buyer_path_batch_apply_plan_approval_v1.data_mutation'",
    reason:
      "Fridge buyer-path apply-plan approval bridge projected into Command Center JSON (read-only); checklist and optional founder registry export via npm run buckparts:fridge-buyer-path-batch-apply-plan-approval.",
  },
  "buckparts:audit": {
    cc_json_path: "command_center_v2.system_contract_audit_summary_v1",
    verdict: "CONNECTED",
    validation_command:
      "node --import tsx scripts/report-buckparts-command-center.ts | jq '.command_center_v2.system_contract_audit_summary_v1.data_mutation'",
    reason:
      "System contract audit summary projected into Command Center JSON during report generation (read-only); full buckparts_system_contract_audit_v1 remains on npm run buckparts:audit.",
  },
  "buckparts:founder-digest": {
    cc_json_path: null,
    verdict: "BYPASSING",
    validation_command: "npm run buckparts:founder-digest",
    reason:
      "Markdown downstream digest; intentionally standalone. Reformats Command Center JSON plus optional CI/artifact inputs for founder copy/paste; not Command Center operating truth.",
  },
  "buckparts:next-execution-packet": {
    cc_json_path: "command_center_v2.next_execution_packet_summary_v1",
    verdict: "CONNECTED",
    validation_command:
      "node --import tsx scripts/report-buckparts-command-center.ts | jq '.command_center_v2.next_execution_packet_summary_v1.data_mutation'",
    reason:
      "Next execution packet summary projected into Command Center JSON during report generation (read-only); full snapshot remains on npm run buckparts:next-execution-packet.",
  },
  "buckparts:operating-map": {
    cc_json_path: "command_center_v2.operating_map_summary_v1",
    verdict: "CONNECTED",
    validation_command:
      "node --import tsx scripts/report-buckparts-command-center.ts | jq '.command_center_v2.operating_map_summary_v1.data_mutation'",
    reason:
      "Operating map summary projected into Command Center JSON during report generation (read-only); full buckparts_operating_map_v1 remains on npm run buckparts:operating-map.",
  },
  "buckparts:precheck:amazon-refrigerator-tokens": {
    cc_json_path: null,
    verdict: "BYPASSING",
    validation_command: "npm run buckparts:precheck:amazon-refrigerator-tokens -- --tokens GSWF",
    reason:
      "On-demand Amazon refrigerator insert-safety precheck; intentionally standalone. Cohort-level token priority lives in command_center_v2.amazon_rescue / amazon_first_blocked_queue_summary; run this CLI with --tokens from the CC Amazon rescue cohort only when insert planning or ASIN reuse proof is needed.",
  },
  "buckparts:founder-decision-registry": {
    cc_json_path: "command_center_v2.founder_decision_registry_summary_v1",
    verdict: "CONNECTED",
    validation_command:
      "node --import tsx scripts/report-buckparts-command-center.ts | jq '.command_center_v2.founder_decision_registry_summary_v1.data_mutation'",
    reason:
      "Founder decision registry summary projected into Command Center JSON during report generation (read-only); full founder_decision_registry_read_model_v1 remains on npm run buckparts:founder-decision-registry.",
  },
  "buckparts:runner-step": {
    cc_json_path: null,
    verdict: "BYPASSING",
    validation_command: "npm run buckparts:runner-step",
    reason:
      "Runner Step v1 validation harness; intentionally standalone — must not run inside Command Center. Packet/orientation truth lives in command_center_v2.next_execution_packet_summary_v1; run npm run buckparts:runner-step, CI artifact buckparts-runner-step, or npm run buckparts:runner-step:gh for validation capture; founder digest may embed optional runner JSON via FOUNDER_DIGEST_RUNNER_STEP_JSON_PATH when artifact exists.",
  },
  "buckparts:learning-outcomes-approved-insert:mutate": {
    cc_json_path: null,
    verdict: "BYPASSING",
    blocks_lane_work: true,
    validation_command: "npm run buckparts:learning-outcomes-approved-insert:mutate",
    reason: "Mutating executor; must never be classified as CC read-only truth.",
  },
};

function scriptPathFromPackageValue(value: string): string {
  const trimmed = value.trim();
  const match = trimmed.match(/^tsx\s+(\S+)/);
  if (match?.[1]) return match[1];
  return trimmed;
}

function systemIdFromScriptName(scriptName: string): string {
  return scriptName.replace(/^buckparts:/, "buckparts_").replace(/[:.]/g, "_");
}

function parseBuckpartsScripts(packageJsonText: string): Array<{ scriptName: string; scriptPath: string }> {
  let parsed: unknown;
  try {
    parsed = JSON.parse(packageJsonText);
  } catch {
    return [];
  }
  if (typeof parsed !== "object" || parsed === null) return [];
  const scripts = (parsed as { scripts?: Record<string, string> }).scripts;
  if (!scripts) return [];
  const out: Array<{ scriptName: string; scriptPath: string }> = [];
  for (const [scriptName, value] of Object.entries(scripts)) {
    if (!scriptName.startsWith("buckparts:")) continue;
    out.push({ scriptName, scriptPath: scriptPathFromPackageValue(value) });
  }
  out.sort((a, b) => a.scriptName.localeCompare(b.scriptName));
  return out;
}

export function buildBrainCoverageVerdictCountsV1(
  entries: BrainCoverageManifestEntryV1[],
): BrainCoverageVerdictCountsV1 {
  const counts = Object.fromEntries(VERDICTS.map((v) => [v, 0])) as BrainCoverageVerdictCountsV1;
  for (const row of entries) {
    counts[row.verdict] += 1;
  }
  return counts;
}

export function buildCommandCenterBrainCoverageManifestV1(
  args: BuildBrainCoverageManifestArgs,
): CommandCenterBrainCoverageManifestV1 {
  const fileExists = args.fileExists ?? existsSync;
  const readTextFile = args.readTextFile ?? ((p: string) => readFileSync(p, "utf8"));
  const packagePath = path.join(args.rootDir, "package.json");
  const packageJsonText = fileExists(packagePath) ? readTextFile(packagePath) : "{}";
  const buckpartsScripts = parseBuckpartsScripts(packageJsonText);

  const entries: BrainCoverageManifestEntryV1[] = [];
  const seenIds = new Set<string>();

  const pushEntry = (seed: EntrySeed) => {
    if (seenIds.has(seed.system_id)) return;
    seenIds.add(seed.system_id);
    entries.push(entry(seed));
  };

  for (const curated of CURATED_ENTRIES) {
    pushEntry(curated);
  }

  for (const { scriptName, scriptPath } of buckpartsScripts) {
    const override = NPM_SCRIPT_OVERRIDES[scriptName];
    const system_id = override?.system_id ?? systemIdFromScriptName(scriptName);
    pushEntry({
      system_id,
      npm_script_or_path: `npm run ${scriptName} → ${scriptPath}`,
      cc_json_path: override?.cc_json_path ?? null,
      dashboard_only: override?.dashboard_only ?? false,
      verdict: override?.verdict ?? "BYPASSING",
      blocks_lane_work: override?.blocks_lane_work ?? false,
      validation_command: override?.validation_command ?? `npm run ${scriptName}`,
      reason:
        override?.reason ??
        "buckparts:* CLI emits a separate report contract; not embedded in Command Center JSON stdout.",
    });
  }

  const workflowDir = path.join(args.rootDir, ".github/workflows");
  const workflowPartial =
    fileExists(path.join(workflowDir, "buckparts-daily-operator.yml")) &&
    fileExists(path.join(workflowDir, "buckparts-founder-digest.yml")) &&
    fileExists(path.join(workflowDir, "buckparts-runner-step.yml"));

  const proven_facts = [
    "command_center_brain_coverage_manifest_v1 is read-only metadata; it does not mutate Supabase, retailer_links, or evidence.",
    `Enumerated ${buckpartsScripts.length} package.json scripts with prefix buckparts:.`,
    `Curated ${CURATED_ENTRIES.length} non-script systems (dashboard attachments, HQ handoff, Sentry, GitHub workflows).`,
    workflowPartial
      ? "PROVEN: .github/workflows/buckparts-*.yml files exist on disk."
      : "UNKNOWN: one or more expected .github/workflows/buckparts-*.yml files missing.",
  ];

  const unknown_facts = [
    "Last GitHub Actions run status (pass/fail/timing) is not proven from workflow files alone.",
    "Sentry incident counts and agent stuck-loop state are not proven in Command Center JSON.",
    "Individual buckparts:* scripts without explicit override default to BYPASSING unless ingested by report-buckparts-command-center.ts.",
  ];

  const sortedEntries = entries.sort((a, b) => a.system_id.localeCompare(b.system_id));
  const verdict_counts = buildBrainCoverageVerdictCountsV1(sortedEntries);
  const summary = {
    total_entries: sortedEntries.length,
    verdict_counts,
  };

  return {
    contract: "command_center_brain_coverage_manifest_v1",
    generated_at: args.now().toISOString(),
    read_only: true,
    data_mutation: false,
    total_entries: sortedEntries.length,
    entries: sortedEntries,
    verdict_counts,
    summary,
    summary_by_verdict: verdict_counts,
    proven_facts,
    unknown_facts,
  };
}
