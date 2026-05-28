/**
 * Contract: docs/BuckParts-HQ-HANDOFF.md must carry current Layer 6 / Codex / Runner control-plane
 * sections so HQ chats and audits do not rely on stale memory.
 * PROVEN: reads handoff markdown only; checks section/contract presence (not commit hashes).
 */

import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.join(path.dirname(fileURLToPath(import.meta.url)), ".."));
const HANDOFF_PATH = path.join(ROOT, "docs", "BuckParts-HQ-HANDOFF.md");

type RequiredTerm = { id: string; needle: string; describe: string };

/** Section headers and contract ids that must stay in the HQ handoff for Layer 6 audits. */
const REQUIRED_TERMS: RequiredTerm[] = [
  {
    id: "section_0b",
    needle: "## 0B) Layer 6 control-plane",
    describe: "Layer 6 control-plane handoff section",
  },
  {
    id: "active_lane_batch",
    needle: "Batch Production Lane v1",
    describe: "batch production lane reference",
  },
  {
    id: "stopping_point_block",
    needle: "Current stopping point / chat migration state",
    describe: "chat migration stopping point section",
  },
  {
    id: "cc_head_b85e90b",
    needle: "b85e90b",
    describe: "latest Command Center external measurement freshness HEAD reference",
  },
  {
    id: "external_measurement_freshness_v1",
    needle: "external_measurement_freshness_v1",
    describe: "Command Center GSC/GA4 artifact freshness lane",
  },
  {
    id: "cc_head_84fb4b3",
    needle: "84fb4b3",
    describe: "Command Center neuron map HEAD reference",
  },
  {
    id: "owner_command_center_neurons",
    needle: "owner_command_center_neurons",
    describe: "Command Center-owned neuron map field",
  },
  {
    id: "cc_not_hq_handoff_truth",
    needle: "HQ handoff is **not** the source of operating truth",
    describe: "HQ handoff vs Command Center doctrine",
  },
  {
    id: "batch_lane_head_93dcd3d",
    needle: "93dcd3d",
    describe: "batch production owner decisions lane HEAD reference",
  },
  {
    id: "batch_cc_lane_contract",
    needle: "batch_production_owner_decisions_lane_v1",
    describe: "Command Center v2 batch owner decisions lane",
  },
  {
    id: "reporting_not_single_surface",
    needle: "Owner dashboard is not yet a single report surface",
    describe: "reporting inventory NOT_PROVEN note",
  },
  {
    id: "hq_next_move_prompt_rule",
    needle:
      'Do not give Jared the "best next move" without giving the exact copy/paste prompt or command',
    describe: "HQ must include copy/paste prompt with next move",
  },
  {
    id: "batch_owner_review_report",
    needle: "report-batch-owner-review.ts",
    describe: "batch owner Markdown review report CLI",
  },
  {
    id: "batch_owner_approval_checklist",
    needle: "report-batch-owner-approval-checklist.ts",
    describe: "batch owner Markdown approval checklist CLI",
  },
  {
    id: "batch_owner_approval_gate",
    needle: "batch owner approval gate",
    describe: "owner approval gate stopping point",
  },
  {
    id: "begin_active_decision_sentinel",
    needle: "BEGIN_ACTIVE_DECISION",
    describe: "approval checklist active-block sentinel",
  },
  {
    id: "owner_review_markdown_primary",
    needle: "Owner-facing surfaces are Markdown-first",
    describe: "owner Markdown-first surface doctrine",
  },
  {
    id: "batch_lane_contract_doc",
    needle: "BuckParts-BATCH-PRODUCTION-LANE-V1.md",
    describe: "Batch Production Lane v1 contract doc pointer",
  },
  {
    id: "meta_system_warning",
    needle: "Do **not** keep expanding packets",
    describe: "meta-system expansion warning",
  },
  {
    id: "layer_six_summary",
    needle: "layer_six_readiness_summary_v1",
    describe: "Layer 6 readiness summary contract",
  },
  {
    id: "codex_review_packet",
    needle: "codex_output_review_packet_v1",
    describe: "Codex output review packet",
  },
  {
    id: "codex_proof_read_model",
    needle: "codex_packet_proof_read_model_v1",
    describe: "Codex packet proof read model",
  },
  {
    id: "codex_next_packet_contract",
    needle: "buckparts_codex_next_execution_packet_v1",
    describe: "Codex next execution packet contract",
  },
  {
    id: "founder_decision_registry",
    needle: "founder_decision_registry_v1",
    describe: "Founder Decision Registry",
  },
  {
    id: "codex_review_context",
    needle: "codex_output_review_context_v1",
    describe: "Codex review context on registry rows",
  },
  {
    id: "request_followup_readonly",
    needle: "request_followup_readonly",
    describe: "current owner decision option (not approval)",
  },
  {
    id: "owner_decision_row_path",
    needle:
      "data/owner-decisions/codex-output-review-queue-amazon-agent-request-followup-readonly-2026-05-16.json",
    describe: "current real owner decision row path",
  },
  {
    id: "layer6_not_proven",
    needle: "layer_6_founder_only_approval",
    describe: "Layer 6 founder-only approval field",
  },
  {
    id: "layer6_not_proven_label",
    needle: "NOT_PROVEN",
    describe: "explicit NOT_PROVEN labeling",
  },
  {
    id: "codex_readonly_role",
    needle: "read-only worker / investigator",
    describe: "Codex role (not autonomous code writer)",
  },
  {
    id: "external_validation",
    needle: "EXTERNAL REPO VALIDATION",
    describe: "lint/build/operator-proof outside Codex sandbox",
  },
  {
    id: "codex_task_outcome",
    needle: "codex_task_outcome_status",
    describe: "transport vs task outcome classifier",
  },
  {
    id: "founder_decision_recording_codex",
    needle: "founder_decision_recording_for_codex_review_v1",
    describe: "Layer 6 registry recording visibility field",
  },
  {
    id: "runner_step",
    needle: "buckparts-runner-step.ts",
    describe: "Runner Step script path",
  },
  {
    id: "json_stdout_contract_doc",
    needle: "BuckParts-JSON-STDOUT-CONTRACT.md",
    describe: "JSON stdout contract doc",
  },
  {
    id: "failure_pattern_registry",
    needle: "failure_pattern_registry",
    describe: "Failure Pattern Registry",
  },
  {
    id: "freshness_test_command",
    needle: "buckparts-hq-handoff-freshness.test.ts",
    describe: "handoff freshness guard command",
  },
  {
    id: "semi_cruise_milestone_section",
    needle: "## Semi-Cruise Readiness Milestone",
    describe: "Semi-Cruise read-only milestone handoff section",
  },
  {
    id: "semi_cruise_head_edfeeba",
    needle: "edfeeba",
    describe: "Semi-Cruise milestone HEAD reference",
  },
  {
    id: "semi_cruise_read_only_proven",
    needle: "Read-only Semi-Cruise is PROVEN operational",
    describe: "read-only Semi-Cruise PROVEN doctrine",
  },
  {
    id: "semi_cruise_mutation_not_proven",
    needle: "Mutation Semi-Cruise",
    describe: "mutation Semi-Cruise NOT_PROVEN label",
  },
  {
    id: "operator_away_ready_read_only",
    needle: "READY_FOR_AUTONOMOUS_READ_ONLY",
    describe: "operator away read-only ready status",
  },
  {
    id: "semi_cruise_runner_step_command",
    needle: "npm run buckparts:runner-step",
    describe: "Semi-Cruise Runner Step validation command",
  },
  {
    id: "semi_cruise_founder_digest_command",
    needle: "npm run buckparts:founder-digest",
    describe: "Semi-Cruise Founder Digest validation command",
  },
  {
    id: "waterdrop_head_a343464",
    needle: "a343464",
    describe: "Waterdrop DA29-00020B browser proof HEAD reference",
  },
  {
    id: "customer_language_doctrine_doc",
    needle: "BuckParts-CUSTOMER-LANGUAGE-AND-DEFINITIONS.md",
    describe: "customer language and definitions doctrine path",
  },
  {
    id: "no_oem_cold_rule",
    needle: "No OEM cold",
    describe: "no OEM cold public copy rule",
  },
  {
    id: "customer_language_cc_lane",
    needle: "customer_language_and_waterdrop_research_lane_v1",
    describe: "Command Center customer language + Waterdrop research lane",
  },
  {
    id: "waterdrop_live_cta_status",
    needle: "waterdrop_live_cta_status",
    describe: "Waterdrop live CTA status field in HQ handoff",
  },
  {
    id: "waterdrop_production_row_id",
    needle: "d4cbad0c-4bab-4854-89bf-59e6d6492c6b",
    describe: "Waterdrop production retailer_links row id",
  },
  {
    id: "waterdrop_insert_executed",
    needle: "EXECUTED",
    describe: "Waterdrop insert plan executed marker in HQ handoff",
  },
  {
    id: "waterdrop_research_draft_path",
    needle: "waterdrop-da29-00020b-oem-vs-compatible-trust-module-v1.md",
    describe: "Waterdrop OEM vs compatible research draft path",
  },
  {
    id: "fridge_truth_spine_head_7b09529",
    needle: "7b09529",
    describe: "Fridge truth spine Command Center HEAD reference",
  },
  {
    id: "fridge_truth_spine_v1",
    needle: "fridge_truth_spine_v1",
    describe: "Command Center fridge truth spine lane contract",
  },
  {
    id: "fridge_no_redo_products",
    needle: "Do not redo fridge products from scratch",
    describe: "fridge operating decision — no full rebuild",
  },
];

test("BuckParts HQ handoff includes Layer 6 control-plane terms", () => {
  const source = readFileSync(HANDOFF_PATH, "utf8");
  const missing: RequiredTerm[] = [];

  for (const term of REQUIRED_TERMS) {
    if (!source.includes(term.needle)) {
      missing.push(term);
    }
  }

  assert.equal(
    missing.length,
    0,
    `docs/BuckParts-HQ-HANDOFF.md is missing ${missing.length} required term(s):\n` +
      missing.map((m) => `  - [${m.id}] ${m.describe}: ${JSON.stringify(m.needle)}`).join("\n"),
  );
});
