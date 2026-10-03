/**
 * Fridge Expansion Worker v1.
 * Product-lane sequencer for one already-proven refrigerator model that is not
 * yet in the Page Factory registry. Uses existing generators only.
 *
 * Not an Executive organ. Does not dispatch, mint NBA, or mutate production.
 */

import { spawnSync } from "node:child_process";
import { existsSync, mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";

import {
  buildPageFactoryEvidenceCloneReportV1,
  type PageFactoryEvidenceCloneReportV1,
} from "./buckparts-page-factory-evidence-clone-v1";
import {
  buildPageQualityGateReportV1,
  type PageQualityGateReportV1,
} from "./buckparts-page-quality-gate-v1";
import {
  PROVEN_COHORT_CLONE_ANCHOR_SLUG_V1,
  buildProvenCohortPageFactoryManifestV1,
  type ProvenCohortManifestRowV1,
  type ProvenCohortPageFactoryManifestV1,
  type RecommendedRegistryRowProposalV1,
} from "./proven-cohort-page-factory-manifest-v1";
import {
  REFRIGERATOR_MODEL_FIRST_DEFAULT_MANIFEST_REL_V1,
  buildRefrigeratorModelFirstBatchResolverV1,
  type RefrigeratorModelFirstBatchModelRowV1,
  type RefrigeratorModelFirstBatchResolverV1,
} from "./refrigerator-model-first-batch-resolver-v1";
import { SAMSUNG_REFRIGERATOR_MARKETING_TOKEN_FAMILIES_V1 } from "./refrigerator-model-first-samsung-marketing-token-cross-reference-v1";

export const FRIDGE_EXPANSION_WORKER_CONTRACT_V1 =
  "buckparts_fridge_expansion_worker_v1" as const;

export const FRIDGE_EXPANSION_WORKER_SOURCE_COMMAND_V1 =
  "node --import tsx scripts/run-buckparts-fridge-expansion-worker-v1.ts" as const;

export const FRIDGE_EXPANSION_WORKER_ALLOWED_WRITE_PREFIX_V1 =
  "data/fridge/batch-production/drafts/" as const;

export const FRIDGE_EXPANSION_WORKER_DEFAULT_DRAFT_JSON_REL_V1 =
  `${FRIDGE_EXPANSION_WORKER_ALLOWED_WRITE_PREFIX_V1}fridge-expansion-worker-v1.json` as const;

export const FRIDGE_EXPANSION_WORKER_DEFAULT_DRAFT_MD_REL_V1 =
  `${FRIDGE_EXPANSION_WORKER_ALLOWED_WRITE_PREFIX_V1}fridge-expansion-worker-v1.md` as const;

export const FRIDGE_EXPANSION_WORKER_PIPELINE_STEPS_V1 = [
  "discover",
  "determine_filters",
  "build_integration",
  "validate_and_test",
  "owner_review_packet",
  "record_evidence",
  "stop",
] as const;

export type FridgeExpansionPipelineStepIdV1 =
  (typeof FRIDGE_EXPANSION_WORKER_PIPELINE_STEPS_V1)[number];

/**
 * Current manual refrigerator page-factory expansion playbook for models that
 * are already in fridge_models.csv with PROVEN_CORRECT audit evidence.
 * Net-new catalog scraping is listed separately as a missing capability.
 */
export const FRIDGE_EXPANSION_CURRENT_MANUAL_WORKFLOW_STEPS_V1 = [
  {
    id: "discover_eligible_unregistered_model",
    description: "Select one PROVEN_CORRECT model not yet in page-factory-targets-v1.csv",
  },
  {
    id: "determine_compatible_filters_from_existing_evidence",
    description: "Read mapped filters from the correctness audit / model-first resolver",
  },
  {
    id: "generate_registry_row_proposal",
    description: "Emit the existing proven-cohort registry CSV row proposal",
  },
  {
    id: "evidence_clone_owner_review",
    description: "Run page-factory evidence clone (samsung::HAFQIN only today)",
  },
  {
    id: "page_quality_gate",
    description: "Run page quality gate when inferred HAF-QIN target is valid",
  },
  {
    id: "page_factory_preflight",
    description: "Run page-factory preflight (requires an existing registry row)",
  },
  {
    id: "owner_review_packet",
    description: "Assemble founder-gated owner-review packet",
  },
  {
    id: "founder_approval_and_registry_apply",
    description: "Founder approves and applies page-factory-targets CSV (no executor)",
  },
  {
    id: "run_existing_validation_tests",
    description: "Run existing tests for the generators this worker invoked",
  },
  {
    id: "record_evidence_and_stop",
    description: "Record the run packet and stop (no dispatch, no apply)",
  },
] as const;

export const FRIDGE_EXPANSION_PRODUCTION_MUTATION_PATHS_V1 = [
  "data/filters.csv",
  "data/retailer_links.csv",
  "data/fridge_models.csv",
  "data/compatibility_mappings.csv",
  "data/filter_aliases.csv",
  "data/fridge/batch-production/page-factory-targets-v1.csv",
] as const;

export type HonestyLabelV1 = "PROVEN" | "INFERRED" | "UNKNOWN";

export type FridgeExpansionStepStatusV1 =
  | "COMPLETED"
  | "SKIPPED"
  | "BLOCKED"
  | "FAILED"
  | "NOT_APPLICABLE";

export type FridgeExpansionStepRecordV1 = {
  step_id: FridgeExpansionPipelineStepIdV1;
  status: FridgeExpansionStepStatusV1;
  existing_generator: string | null;
  summary: string;
  artifact_contract: string | null;
};

export type FridgeExpansionSelectedModelV1 = {
  fridge_slug: string;
  model_number: string;
  brand_slug: string;
  already_in_fridge_models_csv: true;
  already_in_page_factory_registry: false;
  eligible_for_owner_review: true;
  selection_rule: "first_eligible_unregistered_proven_cohort_slug_asc";
  not_yet_integrated_means: "not_in_page_factory_targets_csv";
};

export type FridgeExpansionFilterDeterminationV1 = {
  mapped_filter_slugs: string[];
  official_marketing_token: string;
  evidence_source: "model_filter_correctness_audit_via_proven_cohort";
  model_first_confidence: RefrigeratorModelFirstBatchModelRowV1["confidence"] | null;
  official_filter_token_or_name: string | null;
  samsung_haf_qin_family: boolean;
};

export type FridgeExpansionTestRunV1 = {
  ran: boolean;
  status: "PASSED" | "FAILED" | "SKIPPED";
  command: string | null;
  test_files: string[];
  exit_code: number | null;
  honesty: HonestyLabelV1;
};

export type FridgeExpansionWorkflowCoverageV1 = {
  denominator: number;
  executable_count: number;
  percent: number;
  step_results: Array<{
    id: string;
    executable_this_run: boolean;
    reason: string;
  }>;
};

export type FridgeExpansionOwnerReviewPacketV1 = {
  founder_approval_required: true;
  founder_approval_status: "pending";
  csv_apply_authorized: false;
  supabase_update_authorized: false;
  buy_link_mutation_authorized: false;
  public_page_change_authorized: false;
  page_factory_registry_apply_authorized: false;
  recommended_registry_row_proposal: RecommendedRegistryRowProposalV1;
  markdown: string;
};

export type FridgeExpansionWorkerSnapshotV1 = {
  contract: typeof FRIDGE_EXPANSION_WORKER_CONTRACT_V1;
  source_command: typeof FRIDGE_EXPANSION_WORKER_SOURCE_COMMAND_V1;
  generated_at: string;
  cycle_status: "COMPLETED_STOP" | "FAIL_CLOSED";
  question: "Can BuckParts expand one refrigerator page-factory integration without Jared orchestrating every step?";
  read_only: true;
  data_mutation: false;
  mutation_authorized: false;
  dispatch_invoked: false;
  dispatch_authority: false;
  nba_authority: false;
  steering_authority: false;
  executive_organ: false;
  selected_model: FridgeExpansionSelectedModelV1 | null;
  filters: FridgeExpansionFilterDeterminationV1 | null;
  pipeline: FridgeExpansionStepRecordV1[];
  evidence_clone: {
    ran: boolean;
    status: PageFactoryEvidenceCloneReportV1["clone_status"] | "SKIPPED" | "FAILED";
    family_key: "samsung::HAFQIN" | null;
    source_slug: typeof PROVEN_COHORT_CLONE_ANCHOR_SLUG_V1 | null;
    blockers: string[];
  };
  quality_gate: {
    ran: boolean;
    quality_classification: PageQualityGateReportV1["quality_classification"] | null;
    publication_authorized: boolean | null;
    skipped_reason: string | null;
  };
  tests: FridgeExpansionTestRunV1;
  owner_review_packet: FridgeExpansionOwnerReviewPacketV1 | null;
  evidence_recorded: {
    stdout_json: true;
    draft_json_rel: string | null;
    draft_md_rel: string | null;
  };
  workflow_coverage: FridgeExpansionWorkflowCoverageV1;
  missing_capabilities: string[];
  blocked_reasons: string[];
  proven_facts: string[];
  inferred_facts: string[];
  unknown_facts: string[];
};

export type FridgeExpansionWorkerDepsV1 = {
  rootDir: string;
  now?: () => Date;
  writeArtifacts?: boolean;
  skipTests?: boolean;
  buildCohort?: (rootDir: string) => ProvenCohortPageFactoryManifestV1;
  buildResolver?: (rootDir: string) => RefrigeratorModelFirstBatchResolverV1;
  buildClone?: (args: {
    rootDir: string;
    sourceSlug: string;
    targetSlug: string;
    familyKey: string;
  }) => PageFactoryEvidenceCloneReportV1;
  buildQualityGate?: (args: {
    rootDir: string;
    fridgeSlug: string;
  }) => Promise<PageQualityGateReportV1>;
  runExistingTests?: (args: {
    rootDir: string;
    testFiles: string[];
  }) => FridgeExpansionTestRunV1;
};

export class FridgeExpansionDraftPathErrorV1 extends Error {
  constructor(message: string) {
    super(message);
    this.name = "FridgeExpansionDraftPathErrorV1";
  }
}

function isSamsungHafQinFamily(mappedFilterSlugs: readonly string[]): boolean {
  const allowed = SAMSUNG_REFRIGERATOR_MARKETING_TOKEN_FAMILIES_V1.HAFQIN.allowed_filter_slugs;
  return mappedFilterSlugs.some((slug) => allowed.includes(slug));
}

export function selectNextEligibleUnintegratedFridgeModelV1(
  cohort: ProvenCohortPageFactoryManifestV1,
): ProvenCohortManifestRowV1 | null {
  const eligible = cohort.cohort_rows
    .filter((row) => row.eligible_for_owner_review && !row.already_in_page_factory_registry)
    .slice()
    .sort((a, b) => a.fridge_slug.localeCompare(b.fridge_slug));
  return eligible[0] ?? null;
}

export function validateFridgeExpansionDraftOutputPathV1(args: {
  rootDir: string;
  relPath: string;
}): { absolutePath: string; repoRelativePosix: string } {
  const rel = args.relPath.replaceAll("\\", "/").replace(/^\.\/+/, "");
  if (!rel.startsWith(FRIDGE_EXPANSION_WORKER_ALLOWED_WRITE_PREFIX_V1)) {
    throw new FridgeExpansionDraftPathErrorV1(
      `draft path must start with ${FRIDGE_EXPANSION_WORKER_ALLOWED_WRITE_PREFIX_V1}: ${rel}`,
    );
  }
  if (rel.includes("..")) {
    throw new FridgeExpansionDraftPathErrorV1(`draft path must not contain ..: ${rel}`);
  }
  return {
    absolutePath: path.join(args.rootDir, rel),
    repoRelativePosix: rel,
  };
}

function step(
  step_id: FridgeExpansionPipelineStepIdV1,
  status: FridgeExpansionStepStatusV1,
  summary: string,
  existing_generator: string | null,
  artifact_contract: string | null,
): FridgeExpansionStepRecordV1 {
  return { step_id, status, existing_generator, summary, artifact_contract };
}

function defaultRunExistingTests(args: {
  rootDir: string;
  testFiles: string[];
}): FridgeExpansionTestRunV1 {
  const command =
    `BUCKPARTS_TEST_FILES='${args.testFiles.join(" ")}' bash scripts/npm-test-v1.sh`;
  const result = spawnSync("bash", ["scripts/npm-test-v1.sh"], {
    cwd: args.rootDir,
    env: { ...process.env, BUCKPARTS_TEST_FILES: args.testFiles.join(" ") },
    encoding: "utf8",
  });
  const exit_code = result.status;
  return {
    ran: true,
    status: exit_code === 0 ? "PASSED" : "FAILED",
    command,
    test_files: args.testFiles,
    exit_code,
    honesty: "PROVEN",
  };
}

function renderOwnerReviewMarkdown(args: {
  selected: FridgeExpansionSelectedModelV1;
  filters: FridgeExpansionFilterDeterminationV1;
  proposal: RecommendedRegistryRowProposalV1;
  cloneStatus: string;
  qualityGate: FridgeExpansionWorkerSnapshotV1["quality_gate"];
  tests: FridgeExpansionTestRunV1;
}): string {
  const lines = [
    "# Fridge Expansion Worker v1 — owner-review packet",
    "",
    "This packet is a **Quality Assurance / page-factory expansion review**. It does not apply CSV, Supabase, buy links, or public pages.",
    "",
    `- fridge_slug: \`${args.selected.fridge_slug}\``,
    `- model_number: **${args.selected.model_number}**`,
    `- brand_slug: \`${args.selected.brand_slug}\``,
    `- not_yet_integrated_means: **${args.selected.not_yet_integrated_means}**`,
    `- mapped_filter_slugs: \`${args.filters.mapped_filter_slugs.join("|")}\``,
    `- official_marketing_token: **${args.filters.official_marketing_token}**`,
    `- model_first_confidence: **${args.filters.model_first_confidence ?? "not_in_qa_batch"}**`,
    `- evidence_clone: **${args.cloneStatus}**`,
    `- quality_gate: **${args.qualityGate.quality_classification ?? args.qualityGate.skipped_reason ?? "not_run"}**`,
    `- tests: **${args.tests.status}**`,
    "",
    "## Recommended page-factory registry row (not applied)",
    "",
    "```",
    [
      args.proposal.fridge_slug,
      args.proposal.expected_filter_slugs,
      args.proposal.forbidden_filter_slugs,
      args.proposal.official_marketing_token,
      args.proposal.draft_md_relpath,
      args.proposal.evidence_json_relpath,
    ].join(","),
    "```",
    "",
    "Founder must approve adding this row to `data/fridge/batch-production/page-factory-targets-v1.csv`. No guarded apply executor exists for that CSV. This worker does not write it.",
    "",
    "## Hard gates",
    "",
    "- csv_apply_authorized: **false**",
    "- page_factory_registry_apply_authorized: **false**",
    "- supabase_update_authorized: **false**",
    "- buy_link_mutation_authorized: **false**",
    "- public_page_change_authorized: **false**",
    "- dispatch_invoked: **false**",
    "",
  ];
  return `${lines.join("\n")}\n`;
}

function coverageForRun(args: {
  discovered: boolean;
  cloneRan: boolean;
  qualityGateRan: boolean;
  testsRan: boolean;
  ownerReview: boolean;
}): FridgeExpansionWorkflowCoverageV1 {
  const step_results = FRIDGE_EXPANSION_CURRENT_MANUAL_WORKFLOW_STEPS_V1.map((row) => {
    switch (row.id) {
      case "discover_eligible_unregistered_model":
        return {
          id: row.id,
          executable_this_run: args.discovered,
          reason: args.discovered
            ? "Selected from proven-cohort eligible unregistered rows"
            : "No eligible unregistered PROVEN_CORRECT model",
        };
      case "determine_compatible_filters_from_existing_evidence":
        return {
          id: row.id,
          executable_this_run: args.discovered,
          reason: args.discovered
            ? "Mapped slugs from model-filter correctness audit via proven cohort"
            : "Skipped because discover failed closed",
        };
      case "generate_registry_row_proposal":
        return {
          id: row.id,
          executable_this_run: args.discovered,
          reason: args.discovered
            ? "Existing proven-cohort recommended_registry_row_proposal"
            : "Skipped because discover failed closed",
        };
      case "evidence_clone_owner_review":
        return {
          id: row.id,
          executable_this_run: args.cloneRan,
          reason: args.cloneRan
            ? "Existing samsung::HAFQIN evidence-clone generator"
            : "Existing clone generator supports samsung::HAFQIN only",
        };
      case "page_quality_gate":
        return {
          id: row.id,
          executable_this_run: args.qualityGateRan,
          reason: args.qualityGateRan
            ? "Existing page quality gate with inferred HAF-QIN target"
            : "Skipped: inferred quality-gate target is HAF-QIN-only and would invent the wrong family",
        };
      case "page_factory_preflight":
        return {
          id: row.id,
          executable_this_run: false,
          reason: "Existing preflight requires a page-factory-targets CSV row; selected model is unregistered by design",
        };
      case "owner_review_packet":
        return {
          id: row.id,
          executable_this_run: args.ownerReview,
          reason: args.ownerReview
            ? "Worker-assembled founder-gated packet from existing generator outputs"
            : "No model selected",
        };
      case "founder_approval_and_registry_apply":
        return {
          id: row.id,
          executable_this_run: false,
          reason: "Founder gate; no page-factory-targets guarded-apply executor exists",
        };
      case "run_existing_validation_tests":
        return {
          id: row.id,
          executable_this_run: args.testsRan,
          reason: args.testsRan
            ? "Existing generator test files via npm-test-v1.sh"
            : "Tests skipped or not run",
        };
      case "record_evidence_and_stop":
        return {
          id: row.id,
          executable_this_run: true,
          reason: "Stdout JSON always; optional drafts write under allowed prefix; then stop",
        };
      default:
        return { id: row.id, executable_this_run: false, reason: "UNKNOWN" };
    }
  });
  const executable_count = step_results.filter((row) => row.executable_this_run).length;
  return {
    denominator: FRIDGE_EXPANSION_CURRENT_MANUAL_WORKFLOW_STEPS_V1.length,
    executable_count,
    percent: Math.round((100 * executable_count) / FRIDGE_EXPANSION_CURRENT_MANUAL_WORKFLOW_STEPS_V1.length),
    step_results,
  };
}

const MISSING_CAPABILITIES_V1 = [
  "No selector exists for refrigerator models that are not already in data/fridge_models.csv (net-new catalog discovery is operator/Exa/search-gap, not this worker).",
  "No autonomous official-manufacturer evidence capture; this worker reads committed audit/manual-evidence only.",
  "Page-factory evidence clone v1 supports samsung::HAFQIN only.",
  "Page quality gate inferred targets assume HAF-QIN; non-HAF-QIN models cannot safely use that generator.",
  "Page-factory preflight requires an existing page-factory-targets-v1.csv row.",
  "No guarded apply executor exists for page-factory-targets-v1.csv.",
  "Founder approval and production CSV/Supabase/buy-path mutation remain outside this worker.",
] as const;

export async function buildFridgeExpansionWorkerV1(
  deps: FridgeExpansionWorkerDepsV1,
): Promise<FridgeExpansionWorkerSnapshotV1> {
  const generated_at = (deps.now ?? (() => new Date()))().toISOString();
  const rootDir = deps.rootDir;
  const buildCohort =
    deps.buildCohort ?? ((dir) => buildProvenCohortPageFactoryManifestV1({ rootDir: dir }));
  const buildResolver =
    deps.buildResolver ??
    ((dir) =>
      buildRefrigeratorModelFirstBatchResolverV1({
        rootDir: dir,
        manifestRelPath: REFRIGERATOR_MODEL_FIRST_DEFAULT_MANIFEST_REL_V1,
      }));
  const buildClone = deps.buildClone ?? buildPageFactoryEvidenceCloneReportV1;
  const buildQualityGate = deps.buildQualityGate ?? buildPageQualityGateReportV1;
  const runExistingTests = deps.runExistingTests ?? defaultRunExistingTests;

  const pipeline: FridgeExpansionStepRecordV1[] = [];
  const blocked_reasons: string[] = [];
  const proven_facts: string[] = [
    "PROVEN: this worker is a product-lane sequencer, not an Executive organ.",
    "PROVEN: dispatch_invoked=false; mutation_authorized=false; nba_authority=false.",
    "PROVEN: not_yet_integrated means not in data/fridge/batch-production/page-factory-targets-v1.csv.",
    "PROVEN: selected models are already in data/fridge_models.csv; net-new catalog rows are not invented.",
  ];
  const inferred_facts: string[] = [];
  const unknown_facts: string[] = [
    "UNKNOWN: whether founder will approve the proposed page-factory registry row.",
  ];

  const cohort = buildCohort(rootDir);
  const selectedRow = selectNextEligibleUnintegratedFridgeModelV1(cohort);

  if (!selectedRow) {
    pipeline.push(
      step(
        "discover",
        "BLOCKED",
        "No eligible_for_owner_review model remains outside page-factory-targets-v1.csv",
        "proven_cohort_page_factory_manifest_v1",
        cohort.contract,
      ),
      step("determine_filters", "NOT_APPLICABLE", "Discover failed closed", null, null),
      step("build_integration", "NOT_APPLICABLE", "Discover failed closed", null, null),
      step("validate_and_test", "NOT_APPLICABLE", "Discover failed closed", null, null),
      step("owner_review_packet", "NOT_APPLICABLE", "Discover failed closed", null, null),
      step("record_evidence", "COMPLETED", "Fail-closed snapshot emitted; no production writes", null, null),
      step("stop", "COMPLETED", "Stopped. No dispatch. No apply.", null, null),
    );
    blocked_reasons.push("no_eligible_unintegrated_model");
    const tests: FridgeExpansionTestRunV1 = {
      ran: false,
      status: "SKIPPED",
      command: null,
      test_files: [],
      exit_code: null,
      honesty: "PROVEN",
    };
    return {
      contract: FRIDGE_EXPANSION_WORKER_CONTRACT_V1,
      source_command: FRIDGE_EXPANSION_WORKER_SOURCE_COMMAND_V1,
      generated_at,
      cycle_status: "FAIL_CLOSED",
      question:
        "Can BuckParts expand one refrigerator page-factory integration without Jared orchestrating every step?",
      read_only: true,
      data_mutation: false,
      mutation_authorized: false,
      dispatch_invoked: false,
      dispatch_authority: false,
      nba_authority: false,
      steering_authority: false,
      executive_organ: false,
      selected_model: null,
      filters: null,
      pipeline,
      evidence_clone: {
        ran: false,
        status: "SKIPPED",
        family_key: null,
        source_slug: null,
        blockers: ["discover_blocked"],
      },
      quality_gate: {
        ran: false,
        quality_classification: null,
        publication_authorized: null,
        skipped_reason: "discover_blocked",
      },
      tests,
      owner_review_packet: null,
      evidence_recorded: {
        stdout_json: true,
        draft_json_rel: null,
        draft_md_rel: null,
      },
      workflow_coverage: coverageForRun({
        discovered: false,
        cloneRan: false,
        qualityGateRan: false,
        testsRan: false,
        ownerReview: false,
      }),
      missing_capabilities: [...MISSING_CAPABILITIES_V1],
      blocked_reasons,
      proven_facts,
      inferred_facts,
      unknown_facts,
    };
  }

  const selected_model: FridgeExpansionSelectedModelV1 = {
    fridge_slug: selectedRow.fridge_slug,
    model_number: selectedRow.model_number,
    brand_slug: selectedRow.brand_slug,
    already_in_fridge_models_csv: true,
    already_in_page_factory_registry: false,
    eligible_for_owner_review: true,
    selection_rule: "first_eligible_unregistered_proven_cohort_slug_asc",
    not_yet_integrated_means: "not_in_page_factory_targets_csv",
  };

  pipeline.push(
    step(
      "discover",
      "COMPLETED",
      `Selected ${selected_model.fridge_slug} (eligible, unregistered, slug-asc)`,
      "proven_cohort_page_factory_manifest_v1",
      cohort.contract,
    ),
  );
  proven_facts.push(
    `PROVEN: selected_model=${selected_model.fridge_slug} already_in_page_factory_registry=false eligible_for_owner_review=true.`,
  );

  const resolver = buildResolver(rootDir);
  const resolverRow =
    resolver.model_rows.find((row) => row.fridge_slug === selected_model.fridge_slug) ?? null;
  const samsung_haf_qin_family = isSamsungHafQinFamily(selectedRow.mapped_filter_slugs);
  const filters: FridgeExpansionFilterDeterminationV1 = {
    mapped_filter_slugs: [...selectedRow.mapped_filter_slugs],
    official_marketing_token: selectedRow.recommended_registry_row_proposal.official_marketing_token,
    evidence_source: "model_filter_correctness_audit_via_proven_cohort",
    model_first_confidence: resolverRow?.confidence ?? null,
    official_filter_token_or_name: resolverRow?.official_filter_token_or_name ?? null,
    samsung_haf_qin_family,
  };
  pipeline.push(
    step(
      "determine_filters",
      "COMPLETED",
      `Filters ${filters.mapped_filter_slugs.join("|")} token=${filters.official_marketing_token}`,
      "model_filter_correctness_audit_v1 + refrigerator_model_first_batch_resolver_v1",
      "model_filter_correctness_audit_v1",
    ),
  );
  proven_facts.push(
    `PROVEN: mapped_filter_slugs=${filters.mapped_filter_slugs.join("|")} from committed audit via proven cohort.`,
  );
  if (!resolverRow) {
    inferred_facts.push(
      `INFERRED: ${selected_model.fridge_slug} is not in the 20-model QA batch; filter proof is audit-mapped slugs only.`,
    );
  }

  let cloneReport: PageFactoryEvidenceCloneReportV1 | null = null;
  let cloneStatus: FridgeExpansionWorkerSnapshotV1["evidence_clone"]["status"] = "SKIPPED";
  let cloneBlockers: string[] = [];
  let qualityGateReport: PageQualityGateReportV1 | null = null;
  let qualitySkipped: string | null = null;

  if (samsung_haf_qin_family) {
    try {
      cloneReport = buildClone({
        rootDir,
        sourceSlug: PROVEN_COHORT_CLONE_ANCHOR_SLUG_V1,
        targetSlug: selected_model.fridge_slug,
        familyKey: "samsung::HAFQIN",
      });
      cloneStatus = cloneReport.clone_status;
      cloneBlockers = [...cloneReport.blockers];
    } catch (error) {
      cloneStatus = "FAILED";
      cloneBlockers = [error instanceof Error ? error.message : String(error)];
      blocked_reasons.push(`evidence_clone_failed:${cloneBlockers[0]}`);
    }
    try {
      qualityGateReport = await buildQualityGate({
        rootDir,
        fridgeSlug: selected_model.fridge_slug,
      });
    } catch (error) {
      qualitySkipped = error instanceof Error ? error.message : String(error);
      blocked_reasons.push(`quality_gate_failed:${qualitySkipped}`);
    }
  } else {
    cloneBlockers = ["unsupported_family:evidence_clone_v1 supports samsung::HAFQIN only"];
    qualitySkipped =
      "quality_gate inferred target assumes HAF-QIN; running it would invent the wrong filter family";
  }

  const cloneRan = cloneReport != null;
  const qualityGateRan = qualityGateReport != null;
  pipeline.push(
    step(
      "build_integration",
      cloneRan || qualityGateRan ? "COMPLETED" : "SKIPPED",
      samsung_haf_qin_family
        ? `HAF-QIN path: clone=${cloneStatus}; quality_gate=${qualityGateReport?.quality_classification ?? "FAILED"}`
        : `Non-HAF-QIN path: registry proposal only (clone/quality-gate skipped to avoid inventing HAF-QIN)`,
      samsung_haf_qin_family
        ? "buckparts_page_factory_evidence_clone_v1 + buckparts_page_quality_gate_v1 + proven_cohort registry proposal"
        : "proven_cohort_page_factory_manifest_v1.recommended_registry_row_proposal",
      samsung_haf_qin_family ? "buckparts_page_factory_evidence_clone_v1" : cohort.contract,
    ),
  );

  const testFiles = [
    "scripts/lib/proven-cohort-page-factory-manifest-v1.test.ts",
    "scripts/lib/refrigerator-model-first-batch-resolver-v1.test.ts",
  ];
  if (cloneRan) testFiles.push("scripts/lib/buckparts-page-factory-evidence-clone-v1.test.ts");
  if (qualityGateRan) testFiles.push("scripts/lib/buckparts-page-quality-gate-v1.test.ts");

  let tests: FridgeExpansionTestRunV1;
  if (deps.skipTests) {
    tests = {
      ran: false,
      status: "SKIPPED",
      command: `BUCKPARTS_TEST_FILES='${testFiles.join(" ")}' bash scripts/npm-test-v1.sh`,
      test_files: testFiles,
      exit_code: null,
      honesty: "PROVEN",
    };
  } else {
    tests = runExistingTests({ rootDir, testFiles });
  }
  pipeline.push(
    step(
      "validate_and_test",
      tests.status === "PASSED" ? "COMPLETED" : tests.status === "SKIPPED" ? "SKIPPED" : "FAILED",
      tests.command ?? "tests not run",
      "scripts/npm-test-v1.sh",
      null,
    ),
  );
  if (tests.status === "FAILED") {
    blocked_reasons.push("existing_generator_tests_failed");
  }

  const owner_review_packet: FridgeExpansionOwnerReviewPacketV1 = {
    founder_approval_required: true,
    founder_approval_status: "pending",
    csv_apply_authorized: false,
    supabase_update_authorized: false,
    buy_link_mutation_authorized: false,
    public_page_change_authorized: false,
    page_factory_registry_apply_authorized: false,
    recommended_registry_row_proposal: selectedRow.recommended_registry_row_proposal,
    markdown: renderOwnerReviewMarkdown({
      selected: selected_model,
      filters,
      proposal: selectedRow.recommended_registry_row_proposal,
      cloneStatus,
      qualityGate: {
        ran: qualityGateRan,
        quality_classification: qualityGateReport?.quality_classification ?? null,
        publication_authorized: qualityGateReport?.publication_authorized ?? null,
        skipped_reason: qualitySkipped,
      },
      tests,
    }),
  };
  pipeline.push(
    step(
      "owner_review_packet",
      "COMPLETED",
      "Founder-gated packet emitted; registry CSV not applied",
      "proven_cohort recommended_registry_row_proposal",
      FRIDGE_EXPANSION_WORKER_CONTRACT_V1,
    ),
  );

  let draft_json_rel: string | null = null;
  let draft_md_rel: string | null = null;

  pipeline.push(
    step(
      "record_evidence",
      "COMPLETED",
      deps.writeArtifacts
        ? "Draft JSON/MD under data/fridge/batch-production/drafts/"
        : "Stdout JSON only (pass --write-artifacts to persist drafts)",
      null,
      null,
    ),
  );
  pipeline.push(
    step("stop", "COMPLETED", "Stopped. No dispatch. No production apply.", null, null),
  );

  const snapshot: FridgeExpansionWorkerSnapshotV1 = {
    contract: FRIDGE_EXPANSION_WORKER_CONTRACT_V1,
    source_command: FRIDGE_EXPANSION_WORKER_SOURCE_COMMAND_V1,
    generated_at,
    cycle_status: blocked_reasons.length === 0 ? "COMPLETED_STOP" : "FAIL_CLOSED",
    question:
      "Can BuckParts expand one refrigerator page-factory integration without Jared orchestrating every step?",
    read_only: true,
    data_mutation: false,
    mutation_authorized: false,
    dispatch_invoked: false,
    dispatch_authority: false,
    nba_authority: false,
    steering_authority: false,
    executive_organ: false,
    selected_model,
    filters,
    pipeline,
    evidence_clone: {
      ran: cloneRan,
      status: cloneStatus,
      family_key: samsung_haf_qin_family ? "samsung::HAFQIN" : null,
      source_slug: samsung_haf_qin_family ? PROVEN_COHORT_CLONE_ANCHOR_SLUG_V1 : null,
      blockers: cloneBlockers,
    },
    quality_gate: {
      ran: qualityGateRan,
      quality_classification: qualityGateReport?.quality_classification ?? null,
      publication_authorized: qualityGateReport?.publication_authorized ?? null,
      skipped_reason: qualitySkipped,
    },
    tests,
    owner_review_packet,
    evidence_recorded: {
      stdout_json: true,
      draft_json_rel,
      draft_md_rel,
    },
    workflow_coverage: coverageForRun({
      discovered: true,
      cloneRan,
      qualityGateRan,
      testsRan: tests.ran && tests.status === "PASSED",
      ownerReview: true,
    }),
    missing_capabilities: [...MISSING_CAPABILITIES_V1],
    blocked_reasons,
    proven_facts,
    inferred_facts,
    unknown_facts,
  };

  if (deps.writeArtifacts) {
    snapshot.evidence_recorded.draft_json_rel =
      FRIDGE_EXPANSION_WORKER_DEFAULT_DRAFT_JSON_REL_V1;
    snapshot.evidence_recorded.draft_md_rel = FRIDGE_EXPANSION_WORKER_DEFAULT_DRAFT_MD_REL_V1;
    writeFridgeExpansionWorkerDraftsV1({ rootDir, snapshot });
  }

  return snapshot;
}

export function writeFridgeExpansionWorkerDraftsV1(args: {
  rootDir: string;
  snapshot: FridgeExpansionWorkerSnapshotV1;
}): { jsonRel: string; mdRel: string } {
  const jsonPath = validateFridgeExpansionDraftOutputPathV1({
    rootDir: args.rootDir,
    relPath: FRIDGE_EXPANSION_WORKER_DEFAULT_DRAFT_JSON_REL_V1,
  });
  const mdPath = validateFridgeExpansionDraftOutputPathV1({
    rootDir: args.rootDir,
    relPath: FRIDGE_EXPANSION_WORKER_DEFAULT_DRAFT_MD_REL_V1,
  });
  mkdirSync(path.dirname(jsonPath.absolutePath), { recursive: true });
  writeFileSync(jsonPath.absolutePath, `${JSON.stringify(args.snapshot, null, 2)}\n`, "utf8");
  writeFileSync(
    mdPath.absolutePath,
    args.snapshot.owner_review_packet?.markdown ??
      `# Fridge Expansion Worker v1\n\ncycle_status: ${args.snapshot.cycle_status}\n`,
    "utf8",
  );
  return {
    jsonRel: jsonPath.repoRelativePosix,
    mdRel: mdPath.repoRelativePosix,
  };
}

export function fridgeExpansionWorkerSucceededV1(
  snapshot: FridgeExpansionWorkerSnapshotV1,
): boolean {
  return (
    snapshot.cycle_status === "COMPLETED_STOP" &&
    snapshot.blocked_reasons.length === 0 &&
    snapshot.mutation_authorized === false &&
    snapshot.dispatch_invoked === false
  );
}

export function fridgeExpansionDraftsExistV1(rootDir: string): boolean {
  return (
    existsSync(path.join(rootDir, FRIDGE_EXPANSION_WORKER_DEFAULT_DRAFT_JSON_REL_V1)) ||
    existsSync(path.join(rootDir, FRIDGE_EXPANSION_WORKER_DEFAULT_DRAFT_MD_REL_V1))
  );
}
