/**
 * Read-only SAMSUNG_PASS_REPAIR_OWNER_APPROVAL_PACKET_V1.
 * Owner approval packet for the committed Samsung PASS compat apply plan — no CSV/Supabase apply.
 */

import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";

import { FOUNDER_DECISION_REGISTRY_CONTRACT_V1 } from "../../src/lib/owner-dashboard/founder-decision-registry-v1";
import { REFRIGERATOR_TRUTH_REPAIR_OWNER_REVIEW_CONTRACT_V1 } from "./refrigerator-truth-repair-owner-review-v1";
import {
  SAMSUNG_PASS_PLANNED_FRIDGE_SLUGS_V1,
  SAMSUNG_PASS_REPAIR_APPLY_PLAN_CONTRACT_V1,
  SAMSUNG_PASS_REPAIR_APPLY_PLAN_JSON_REL_V1,
  type ExpectedScoreboardDeltaV1,
  type SamsungPassRepairApplyPlanV1,
  type SamsungPassRepairPlannedRowV1,
} from "./samsung-pass-repair-apply-plan-v1";

export const SAMSUNG_PASS_REPAIR_OWNER_APPROVAL_PACKET_CONTRACT_V1 =
  "samsung_pass_repair_owner_approval_packet_v1" as const;

export const SAMSUNG_PASS_REPAIR_OWNER_APPROVAL_PACKET_JSON_REL_V1 =
  "data/fridge/batch-production/drafts/samsung-pass-repair-owner-approval-packet-v1.json" as const;

export const SAMSUNG_PASS_REPAIR_OWNER_APPROVAL_PACKET_MD_REL_V1 =
  "data/fridge/batch-production/drafts/samsung-pass-repair-owner-approval-packet-v1.md" as const;

export const SAMSUNG_PASS_REPAIR_OWNER_DECISION_TEMPLATE_JSON_REL_V1 =
  "data/fridge/batch-production/drafts/samsung-pass-repair-owner-decision-template-v1.json" as const;

export const SAMSUNG_PASS_REPAIR_OWNER_APPROVAL_PACKET_SOURCE_COMMAND_V1 =
  "npm run buckparts:samsung-pass-repair-owner-approval-packet" as const;

export const SAMSUNG_PASS_REPAIR_OWNER_APPROVAL_PACKET_ALLOWED_WRITE_REL_PATHS_V1 = [
  SAMSUNG_PASS_REPAIR_OWNER_APPROVAL_PACKET_JSON_REL_V1,
  SAMSUNG_PASS_REPAIR_OWNER_APPROVAL_PACKET_MD_REL_V1,
  SAMSUNG_PASS_REPAIR_OWNER_DECISION_TEMPLATE_JSON_REL_V1,
] as const;

export const FOUNDER_DECISION_REGISTRY_DOC_REL_V1 =
  "docs/BuckParts-FOUNDER-DECISION-REGISTRY.md" as const;

export const SAMSUNG_PASS_REPAIR_OWNER_APPROVAL_SOURCE_DECISION_PACKET_ID_V1 =
  "samsung_pass_repair_owner_approval_packet_v1" as const;

export const SAMSUNG_PASS_REPAIR_APPROVAL_OPTION_IDS_V1 = [
  "approve_apply_plan",
  "reject_apply_plan",
  "defer_apply_plan",
  "request_more_proof",
] as const;

export type SamsungPassRepairApprovalOptionIdV1 =
  (typeof SAMSUNG_PASS_REPAIR_APPROVAL_OPTION_IDS_V1)[number];

export const SAMSUNG_PASS_REPAIR_SEPARATE_APPLY_EXECUTOR_STATEMENT_V1 =
  "PROVEN: Approving this owner approval packet records founder intent only. It does not apply planned compatibility_mappings.csv changes, mutate filters.csv, fridge_models.csv, manual evidence, Supabase, pages, sitemap/robots, retailer links, or HQ handoff. A separate guarded apply executor with explicit owner_mutation_approved registry row and apply authorization is still required before any CSV or Supabase mutation." as const;

export const SAMSUNG_PASS_REPAIR_PROHIBITED_ACTIONS_V1 = [
  "Do not mutate compatibility_mappings.csv from this approval packet alone.",
  "Do not mutate filters.csv, fridge_models.csv, or filter_aliases.csv.",
  "Do not write or overwrite manual-evidence JSON under data/manual-evidence/.",
  "Do not mutate Supabase compatibility_mappings or other production database state.",
  "Do not mutate retailer_links.csv, public fridge pages, sitemap, or robots.",
  "Do not mutate HQ handoff artifacts.",
  "approve_apply_plan authorizes proceeding toward a guarded apply executor — not automatic CSV/Supabase apply.",
  "This approval packet is not automation_input for Runner Step, queues, or mutation gates.",
] as const;

export type SamsungPassRepairApprovalOptionV1 = {
  option_id: SamsungPassRepairApprovalOptionIdV1;
  label: string;
  description: string;
  founder_decision_registry_mapping: {
    decision_status: "approved" | "rejected" | "deferred" | "needs_more_evidence";
    allowed_next_scope: "none" | "read_only_agent" | "owner_mutation_approved";
    evidence_required_before_mutation: boolean;
  };
};

export type BeforeAfterMappingSummaryRowV1 = {
  fridge_slug: string;
  operation: string;
  before_mappings: string[];
  after_mappings: string[];
};

export type SamsungPassRepairOwnerApprovalPacketV1 = {
  contract: typeof SAMSUNG_PASS_REPAIR_OWNER_APPROVAL_PACKET_CONTRACT_V1;
  read_only: true;
  data_mutation: false;
  mutation_authorized: false;
  owner_approval_required: true;
  apply_authorized: false;
  csv_apply_authorized: false;
  supabase_mutation_authorized: false;
  generated_at: string;
  source_command: typeof SAMSUNG_PASS_REPAIR_OWNER_APPROVAL_PACKET_SOURCE_COMMAND_V1;
  apply_plan_rel_path: typeof SAMSUNG_PASS_REPAIR_APPLY_PLAN_JSON_REL_V1;
  source_owner_review_packet_rel_path: string;
  founder_decision_registry_doc_rel_path: typeof FOUNDER_DECISION_REGISTRY_DOC_REL_V1;
  source_decision_packet_id: typeof SAMSUNG_PASS_REPAIR_OWNER_APPROVAL_SOURCE_DECISION_PACKET_ID_V1;
  decision_needed: string;
  approval_options: SamsungPassRepairApprovalOptionV1[];
  planned_rows: SamsungPassRepairPlannedRowV1[];
  before_after_mapping_summary: BeforeAfterMappingSummaryRowV1[];
  removed_filter_slugs: string[];
  added_filter_slugs: string[];
  risk_notes: string[];
  expected_scoreboard_delta: ExpectedScoreboardDeltaV1;
  separate_apply_executor_required_statement: typeof SAMSUNG_PASS_REPAIR_SEPARATE_APPLY_EXECUTOR_STATEMENT_V1;
  prohibited_actions_still_apply: typeof SAMSUNG_PASS_REPAIR_PROHIBITED_ACTIONS_V1;
  exact_repo_paths_read: string[];
  proven_facts: string[];
  unknown_facts: string[];
};

export type SamsungPassRepairOwnerDecisionTemplateV1 = {
  contract: typeof FOUNDER_DECISION_REGISTRY_CONTRACT_V1;
  template_only: true;
  not_consumed_by_automation: true;
  mutation_authorized: false;
  read_only: true;
  data_mutation: false;
  template_for_packet_contract: typeof SAMSUNG_PASS_REPAIR_OWNER_APPROVAL_PACKET_CONTRACT_V1;
  source_decision_packet_id: typeof SAMSUNG_PASS_REPAIR_OWNER_APPROVAL_SOURCE_DECISION_PACKET_ID_V1;
  apply_plan_rel_path: typeof SAMSUNG_PASS_REPAIR_APPLY_PLAN_JSON_REL_V1;
  allowed_founder_option_ids: SamsungPassRepairApprovalOptionIdV1[];
  row_template: {
    decision_id: string;
    source_queue_row_id: string;
    source_decision_packet_id: typeof SAMSUNG_PASS_REPAIR_OWNER_APPROVAL_SOURCE_DECISION_PACKET_ID_V1;
    decided_at: string;
    decision_status: string;
    owner_note: string;
    allowed_next_scope: string;
    evidence_required_before_mutation: boolean;
    prohibited_actions_still_apply: string[];
    samsung_pass_repair_owner_approval_context_v1: {
      review_packet_contract: typeof SAMSUNG_PASS_REPAIR_OWNER_APPROVAL_PACKET_CONTRACT_V1;
      founder_option_id: string;
      apply_plan_rel_path: typeof SAMSUNG_PASS_REPAIR_APPLY_PLAN_JSON_REL_V1;
      planned_slug_count: number;
    };
  };
  notes: string[];
};

function readJsonFile<T>(rootDir: string, relPath: string): T {
  return JSON.parse(readFileSync(path.join(rootDir, relPath), "utf8")) as T;
}

function buildApprovalOptions(): SamsungPassRepairApprovalOptionV1[] {
  return [
    {
      option_id: "approve_apply_plan",
      label: "Approve apply plan",
      description:
        "Owner approves the 5-row Samsung PASS compatibility correction plan (HAF-QIN / da97-17376b). Proceed to a separate guarded apply executor — no automatic CSV/Supabase mutation from this packet.",
      founder_decision_registry_mapping: {
        decision_status: "approved",
        allowed_next_scope: "owner_mutation_approved",
        evidence_required_before_mutation: true,
      },
    },
    {
      option_id: "reject_apply_plan",
      label: "Reject apply plan",
      description: "Owner rejects the proposed compat corrections; hold all 5 slug rows unchanged.",
      founder_decision_registry_mapping: {
        decision_status: "rejected",
        allowed_next_scope: "none",
        evidence_required_before_mutation: false,
      },
    },
    {
      option_id: "defer_apply_plan",
      label: "Defer apply plan",
      description: "Owner defers decision; no planning or apply authority granted.",
      founder_decision_registry_mapping: {
        decision_status: "deferred",
        allowed_next_scope: "none",
        evidence_required_before_mutation: false,
      },
    },
    {
      option_id: "request_more_proof",
      label: "Request more proof",
      description:
        "Owner needs additional Tier-1 Samsung exact-model evidence before approving compat corrections.",
      founder_decision_registry_mapping: {
        decision_status: "needs_more_evidence",
        allowed_next_scope: "read_only_agent",
        evidence_required_before_mutation: false,
      },
    },
  ];
}

function loadApplyPlan(rootDir: string): SamsungPassRepairApplyPlanV1 {
  const plan = readJsonFile<SamsungPassRepairApplyPlanV1>(
    rootDir,
    SAMSUNG_PASS_REPAIR_APPLY_PLAN_JSON_REL_V1,
  );
  if (plan.contract !== SAMSUNG_PASS_REPAIR_APPLY_PLAN_CONTRACT_V1) {
    throw new Error("Samsung PASS apply plan contract mismatch");
  }
  if (plan.planned_rows.length !== SAMSUNG_PASS_PLANNED_FRIDGE_SLUGS_V1.length) {
    throw new Error(
      `apply plan planned_rows count must be ${String(SAMSUNG_PASS_PLANNED_FRIDGE_SLUGS_V1.length)}`,
    );
  }
  const slugs = plan.planned_rows.map((row) => row.fridge_slug).sort();
  const expected = [...SAMSUNG_PASS_PLANNED_FRIDGE_SLUGS_V1].sort();
  if (JSON.stringify(slugs) !== JSON.stringify(expected)) {
    throw new Error("apply plan slug set does not match samsung_pass_ready cohort");
  }
  if (plan.mutation_authorized !== false || plan.apply_authorized !== false) {
    throw new Error("apply plan must remain read-only with apply_authorized=false");
  }
  return plan;
}

function assertOwnerReviewAligns(rootDir: string, applyPlan: SamsungPassRepairApplyPlanV1): string {
  const ownerReview = readJsonFile<{
    contract?: string;
    repair_groups?: Array<{ repair_group?: string; slug_count?: number }>;
  }>(rootDir, applyPlan.source_owner_review_packet.rel_path);

  if (ownerReview.contract !== REFRIGERATOR_TRUTH_REPAIR_OWNER_REVIEW_CONTRACT_V1) {
    throw new Error("Owner review packet contract mismatch");
  }
  const passGroup = ownerReview.repair_groups?.find(
    (group) => group.repair_group === "samsung_pass_ready",
  );
  if (!passGroup || passGroup.slug_count !== applyPlan.planned_rows.length) {
    throw new Error("Owner review samsung_pass_ready count does not match apply plan");
  }
  return applyPlan.source_owner_review_packet.rel_path;
}

export function buildSamsungPassRepairOwnerDecisionTemplateV1(args: {
  applyPlan: SamsungPassRepairApplyPlanV1;
}): SamsungPassRepairOwnerDecisionTemplateV1 {
  return {
    contract: FOUNDER_DECISION_REGISTRY_CONTRACT_V1,
    template_only: true,
    not_consumed_by_automation: true,
    mutation_authorized: false,
    read_only: true,
    data_mutation: false,
    template_for_packet_contract: SAMSUNG_PASS_REPAIR_OWNER_APPROVAL_PACKET_CONTRACT_V1,
    source_decision_packet_id: SAMSUNG_PASS_REPAIR_OWNER_APPROVAL_SOURCE_DECISION_PACKET_ID_V1,
    apply_plan_rel_path: SAMSUNG_PASS_REPAIR_APPLY_PLAN_JSON_REL_V1,
    allowed_founder_option_ids: [...SAMSUNG_PASS_REPAIR_APPROVAL_OPTION_IDS_V1],
    row_template: {
      decision_id: "REPLACE_WITH_STABLE_ID",
      source_queue_row_id: "queue-samsung-pass-repair-compat",
      source_decision_packet_id: SAMSUNG_PASS_REPAIR_OWNER_APPROVAL_SOURCE_DECISION_PACKET_ID_V1,
      decided_at: "REPLACE_WITH_ISO8601",
      decision_status: "REPLACE_WITH approved|rejected|deferred|needs_more_evidence",
      owner_note: "REPLACE_WITH_FOUNDER_NOTE — required non-empty when allowed_next_scope is owner_mutation_approved",
      allowed_next_scope: "REPLACE_WITH none|read_only_agent|owner_mutation_approved",
      evidence_required_before_mutation: true,
      prohibited_actions_still_apply: [...SAMSUNG_PASS_REPAIR_PROHIBITED_ACTIONS_V1],
      samsung_pass_repair_owner_approval_context_v1: {
        review_packet_contract: SAMSUNG_PASS_REPAIR_OWNER_APPROVAL_PACKET_CONTRACT_V1,
        founder_option_id: "REPLACE_WITH approve_apply_plan|reject_apply_plan|defer_apply_plan|request_more_proof",
        apply_plan_rel_path: SAMSUNG_PASS_REPAIR_APPLY_PLAN_JSON_REL_V1,
        planned_slug_count: args.applyPlan.planned_rows.length,
      },
    },
    notes: [
      "Template only — not consumed by repo automation.",
      "Copy row_template into data/owner-decisions/*.json rows[] after filling REPLACE_WITH placeholders.",
      "See docs/BuckParts-FOUNDER-DECISION-REGISTRY.md for founder_decision_registry_v1 row semantics.",
      SAMSUNG_PASS_REPAIR_SEPARATE_APPLY_EXECUTOR_STATEMENT_V1,
    ],
  };
}

export function buildSamsungPassRepairOwnerApprovalPacketV1(args: {
  rootDir: string;
  now?: () => Date;
}): SamsungPassRepairOwnerApprovalPacketV1 {
  const now = args.now ?? (() => new Date());
  const generatedAt = now().toISOString();

  const applyPlan = loadApplyPlan(args.rootDir);
  const sourceOwnerReviewRelPath = assertOwnerReviewAligns(args.rootDir, applyPlan);

  const before_after_mapping_summary: BeforeAfterMappingSummaryRowV1[] = applyPlan.planned_rows.map(
    (row) => ({
      fridge_slug: row.fridge_slug,
      operation: row.operation,
      before_mappings: row.before_mappings,
      after_mappings: row.after_mappings,
    }),
  );

  const exact_repo_paths_read = [
    SAMSUNG_PASS_REPAIR_APPLY_PLAN_JSON_REL_V1,
    sourceOwnerReviewRelPath,
    FOUNDER_DECISION_REGISTRY_DOC_REL_V1,
  ].sort();

  return {
    contract: SAMSUNG_PASS_REPAIR_OWNER_APPROVAL_PACKET_CONTRACT_V1,
    read_only: true,
    data_mutation: false,
    mutation_authorized: false,
    owner_approval_required: true,
    apply_authorized: false,
    csv_apply_authorized: false,
    supabase_mutation_authorized: false,
    generated_at: generatedAt,
    source_command: SAMSUNG_PASS_REPAIR_OWNER_APPROVAL_PACKET_SOURCE_COMMAND_V1,
    apply_plan_rel_path: SAMSUNG_PASS_REPAIR_APPLY_PLAN_JSON_REL_V1,
    source_owner_review_packet_rel_path: sourceOwnerReviewRelPath,
    founder_decision_registry_doc_rel_path: FOUNDER_DECISION_REGISTRY_DOC_REL_V1,
    source_decision_packet_id: SAMSUNG_PASS_REPAIR_OWNER_APPROVAL_SOURCE_DECISION_PACKET_ID_V1,
    decision_needed:
      "Approve, reject, defer, or request more proof for the 5-row Samsung PASS compatibility_mappings.csv correction plan (wrong-family DA29 / phantom da29-10105j removals → da97-17376b HAF-QIN).",
    approval_options: buildApprovalOptions(),
    planned_rows: applyPlan.planned_rows,
    before_after_mapping_summary,
    removed_filter_slugs: applyPlan.removed_filter_slugs,
    added_filter_slugs: applyPlan.added_filter_slugs,
    risk_notes: applyPlan.risk_notes,
    expected_scoreboard_delta: applyPlan.expected_scoreboard_delta,
    separate_apply_executor_required_statement:
      SAMSUNG_PASS_REPAIR_SEPARATE_APPLY_EXECUTOR_STATEMENT_V1,
    prohibited_actions_still_apply: SAMSUNG_PASS_REPAIR_PROHIBITED_ACTIONS_V1,
    exact_repo_paths_read,
    proven_facts: [
      `PROVEN: Loaded committed apply plan from ${SAMSUNG_PASS_REPAIR_APPLY_PLAN_JSON_REL_V1} (${String(applyPlan.planned_rows.length)} planned rows).`,
      `PROVEN: Owner review samsung_pass_ready cohort aligned via ${sourceOwnerReviewRelPath}.`,
      "PROVEN: mutation_authorized=false; apply_authorized=false; csv_apply_authorized=false on this packet.",
      "PROVEN: All planned rows carry mutation_authorized=false and not_applied=true in source apply plan.",
      SAMSUNG_PASS_REPAIR_SEPARATE_APPLY_EXECUTOR_STATEMENT_V1,
      "PROVEN: Read-only owner approval packet — no compatibility_mappings.csv or Supabase mutation performed.",
    ],
    unknown_facts: [
      "UNKNOWN: Which approval option Jared will choose.",
      "UNKNOWN: Whether live Supabase compatibility_mappings matches committed CSV at apply time.",
      "UNKNOWN: When a guarded apply executor will be built or run after owner approval.",
      ...applyPlan.unknown_facts,
    ],
  };
}

export function buildSamsungPassRepairOwnerApprovalPacketMarkdownV1(
  packet: SamsungPassRepairOwnerApprovalPacketV1,
): string {
  const lines: string[] = [
    "# Samsung PASS repair owner approval packet v1",
    "",
    `Generated: ${packet.generated_at}`,
    "",
    "## Status",
    "",
    `- contract: \`${packet.contract}\``,
    `- read_only: **true**`,
    `- data_mutation: **false**`,
    `- mutation_authorized: **false**`,
    `- owner_approval_required: **true**`,
    `- apply_authorized: **false**`,
    "",
    "## Decision needed",
    "",
    packet.decision_needed,
    "",
    "## Apply plan source",
    "",
    `- apply_plan: \`${packet.apply_plan_rel_path}\``,
    `- owner_review: \`${packet.source_owner_review_packet_rel_path}\``,
    `- founder registry spec: \`${packet.founder_decision_registry_doc_rel_path}\``,
    `- source_decision_packet_id: \`${packet.source_decision_packet_id}\``,
    "",
    "## Separate apply executor required",
    "",
    packet.separate_apply_executor_required_statement,
    "",
    "## Approval options",
    "",
  ];

  for (const option of packet.approval_options) {
    lines.push(
      `### \`${option.option_id}\` — ${option.label}`,
      "",
      option.description,
      "",
      `- registry mapping: \`${option.founder_decision_registry_mapping.decision_status}\` + \`${option.founder_decision_registry_mapping.allowed_next_scope}\``,
      `- evidence_required_before_mutation: **${String(option.founder_decision_registry_mapping.evidence_required_before_mutation)}**`,
      "",
    );
  }

  lines.push(
    "## Before / after mapping summary",
    "",
    "| fridge_slug | operation | before | after |",
    "| --- | --- | --- | --- |",
  );
  for (const row of packet.before_after_mapping_summary) {
    lines.push(
      `| \`${row.fridge_slug}\` | \`${row.operation}\` | \`${row.before_mappings.join("|")}\` | \`${row.after_mappings.join("|")}\` |`,
    );
  }

  lines.push(
    "",
    "## Rollup",
    "",
    `- removed filter slugs: \`${packet.removed_filter_slugs.join("|")}\``,
    `- added filter slugs: \`${packet.added_filter_slugs.join("|")}\``,
    `- compat row removals: ${String(packet.expected_scoreboard_delta.planned_compat_row_removals)}`,
    `- compat row additions: ${String(packet.expected_scoreboard_delta.planned_compat_row_additions)}`,
    "",
    "## Expected scoreboard delta (if apply plan executed after separate approval)",
    "",
    `| Metric | Baseline | After apply | Reduction |`,
    `| --- | ---: | ---: | ---: |`,
    `| wrong_part_risk_count | ${String(packet.expected_scoreboard_delta.baseline_wrong_part_risk_count)} | ${String(packet.expected_scoreboard_delta.estimated_wrong_part_risk_count_after_apply)} | ${String(packet.expected_scoreboard_delta.estimated_wrong_part_risk_reduction_if_owner_approved)} |`,
    `| multi_mapped_count | ${String(packet.expected_scoreboard_delta.baseline_multi_mapped_count)} | ${String(packet.expected_scoreboard_delta.estimated_multi_mapped_count_after_apply)} | ${String(packet.expected_scoreboard_delta.estimated_multi_mapped_reduction_if_owner_approved)} |`,
    `| phantom_model_count | ${String(packet.expected_scoreboard_delta.baseline_phantom_model_count)} | ${String(packet.expected_scoreboard_delta.estimated_phantom_model_count_after_catalog_review)} | ${String(packet.expected_scoreboard_delta.estimated_phantom_model_reduction_if_owner_approved)} |`,
    "",
    "## Risk notes",
    "",
    ...packet.risk_notes.map((note) => `- ${note}`),
    "",
    "## Prohibited actions (still apply after approval)",
    "",
    ...packet.prohibited_actions_still_apply.map((note) => `- ${note}`),
    "",
    "## Planned rows (exact from apply plan)",
    "",
  );

  for (const row of packet.planned_rows) {
    lines.push(
      `- \`${row.fridge_slug}\` — ${row.operation}; \`${row.before_mappings.join("|")}\` → \`${row.after_mappings.join("|")}\`; remove \`${row.removed_filter_slugs.join("|")}\`; add \`${row.added_filter_slugs.join("|")}\`; mutation_authorized=false`,
    );
  }

  lines.push(
    "",
    "## Record your decision",
    "",
    "Fill `data/fridge/batch-production/drafts/samsung-pass-repair-owner-decision-template-v1.json` and copy the completed row into `data/owner-decisions/*.json` per the founder decision registry spec.",
    "",
  );

  return `${lines.join("\n")}\n`;
}

export function writeSamsungPassRepairOwnerApprovalPacketArtifactsV1(args: {
  rootDir: string;
  packet: SamsungPassRepairOwnerApprovalPacketV1;
  decisionTemplate: SamsungPassRepairOwnerDecisionTemplateV1;
}): {
  json_rel_path: string;
  md_rel_path: string;
  decision_template_rel_path: string;
} {
  const jsonAbs = path.join(args.rootDir, SAMSUNG_PASS_REPAIR_OWNER_APPROVAL_PACKET_JSON_REL_V1);
  const mdAbs = path.join(args.rootDir, SAMSUNG_PASS_REPAIR_OWNER_APPROVAL_PACKET_MD_REL_V1);
  const templateAbs = path.join(args.rootDir, SAMSUNG_PASS_REPAIR_OWNER_DECISION_TEMPLATE_JSON_REL_V1);

  mkdirSync(path.dirname(jsonAbs), { recursive: true });
  writeFileSync(jsonAbs, `${JSON.stringify(args.packet, null, 2)}\n`, "utf8");
  writeFileSync(mdAbs, buildSamsungPassRepairOwnerApprovalPacketMarkdownV1(args.packet), "utf8");
  writeFileSync(templateAbs, `${JSON.stringify(args.decisionTemplate, null, 2)}\n`, "utf8");

  return {
    json_rel_path: SAMSUNG_PASS_REPAIR_OWNER_APPROVAL_PACKET_JSON_REL_V1,
    md_rel_path: SAMSUNG_PASS_REPAIR_OWNER_APPROVAL_PACKET_MD_REL_V1,
    decision_template_rel_path: SAMSUNG_PASS_REPAIR_OWNER_DECISION_TEMPLATE_JSON_REL_V1,
  };
}
