/**
 * BuckParts OS Milestone Tracker v1 — company-level and engineering milestones (read-only).
 * Separates operating-system milestones from git/engineering commit markers.
 */

import { existsSync } from "node:fs";
import path from "node:path";

import {
  buildUcfReplacementProofReportV1,
  committedUcfRegisteredSubjectCountV1,
} from "@/lib/coverage-factory";

export const BUCKPARTS_OS_MILESTONE_TRACKER_CONTRACT_V1 =
  "buckparts_os_milestone_tracker_v1" as const;

export const BUCKPARTS_OS_MILESTONE_TRACKER_REPORT_NAME_V1 =
  "buckparts_os_milestone_tracker_v1" as const;

export const BUCKPARTS_OS_MILESTONE_CATEGORIES_V1 = [
  "Engineering",
  "Company",
  "Revenue",
  "Autonomy",
  "Customer",
  "Trust",
] as const;

export type BuckPartsOsMilestoneCategoryV1 = (typeof BUCKPARTS_OS_MILESTONE_CATEGORIES_V1)[number];

export const BUCKPARTS_OS_MILESTONE_CELEBRATION_LEVELS_V1 = [
  "minor",
  "team",
  "company",
] as const;

export type BuckPartsOsMilestoneCelebrationLevelV1 =
  (typeof BUCKPARTS_OS_MILESTONE_CELEBRATION_LEVELS_V1)[number];

export const BUCKPARTS_OS_MILESTONE_STATUSES_V1 = ["completed", "pending"] as const;

export type BuckPartsOsMilestoneStatusV1 = (typeof BUCKPARTS_OS_MILESTONE_STATUSES_V1)[number];

export type BuckPartsOsMilestoneV1 = {
  milestone_id: string;
  title: string;
  category: BuckPartsOsMilestoneCategoryV1;
  status: BuckPartsOsMilestoneStatusV1;
  completed_at: string | null;
  /** Lower values appear earlier on the OS roadmap (not git chronology). */
  roadmap_sequence: number;
  objective_completion_criteria: string;
  repo_evidence: readonly string[];
  validation_evidence: readonly string[];
  business_significance: string;
  celebration_level: BuckPartsOsMilestoneCelebrationLevelV1;
  prerequisite_milestone_ids: readonly string[];
};

export type BuckPartsOsMilestoneDistanceToCompanyCelebrationV1 = {
  pending_company_milestones_count: number;
  pending_team_or_company_milestones_count: number;
  blocking_milestone_ids: readonly string[];
  estimated_summary: string;
};

export type BuckPartsOsMilestoneRuntimeVerificationV1 = {
  ucf_registered_subject_count: number;
  ucf_registry_full: boolean;
  ucf_replacement_simulation_passed: boolean;
};

export type BuckPartsOsMilestoneTrackerReportV1 = {
  contract: typeof BUCKPARTS_OS_MILESTONE_TRACKER_CONTRACT_V1;
  report_name: typeof BUCKPARTS_OS_MILESTONE_TRACKER_REPORT_NAME_V1;
  read_only: true;
  data_mutation: false;
  mutation_authorized: false;
  generated_at: string;
  milestone_inventory: BuckPartsOsMilestoneV1[];
  chronological_completed_milestones: BuckPartsOsMilestoneV1[];
  counts_by_category: Record<BuckPartsOsMilestoneCategoryV1, { completed: number; pending: number }>;
  next_unlocked_milestone: BuckPartsOsMilestoneV1 | null;
  next_company_milestone: BuckPartsOsMilestoneV1 | null;
  distance_to_first_company_celebration: BuckPartsOsMilestoneDistanceToCompanyCelebrationV1;
  runtime_verification: BuckPartsOsMilestoneRuntimeVerificationV1;
  proven_facts: string[];
  validation_commands: string[];
};

/** Curated completed + pending milestones — repo truth SSOT for OS milestone history. */
export const BUCKPARTS_OS_MILESTONE_SEED_V1: readonly BuckPartsOsMilestoneV1[] = [
  {
    milestone_id: "strategic_identity_codified_v1",
    title: "Strategic identity codified (utility engine, not affiliate site)",
    category: "Company",
    status: "completed",
    completed_at: "2025-12-15T00:00:00.000Z",
    objective_completion_criteria:
      "HQ handoff documents ad-supported trusted search-intent utility model, first-wedge doctrine, and authority-to-act abstraction.",
    repo_evidence: ["docs/BuckParts-HQ-HANDOFF.md"],
    validation_evidence: ["node --import tsx --test scripts/buckparts-hq-handoff-freshness.test.ts"],
    business_significance:
      "Aligns engineering and GTM on utility-first monetization with gated affiliate paths — prevents pivot drift.",
    celebration_level: "team",
    roadmap_sequence: 10,
    prerequisite_milestone_ids: [],
  },
  {
    milestone_id: "public_trust_pages_v1",
    title: "Public trust policy pages live in repo",
    category: "Trust",
    status: "completed",
    completed_at: "2026-01-10T00:00:00.000Z",
    objective_completion_criteria:
      "truth-policy and wrong-part-prevention routes exist; pages state affiliate links are secondary to truth.",
    repo_evidence: [
      "src/app/truth-policy/page.tsx",
      "src/app/wrong-part-prevention/page.tsx",
      "scripts/lib/buckparts-grant-readiness-v1.ts",
    ],
    validation_evidence: ["node --import tsx --test scripts/lib/buckparts-grant-readiness-v1.test.ts"],
    business_significance: "Foundational consumer trust surface for grant, partnerships, and homeowner credibility.",
    celebration_level: "minor",
    roadmap_sequence: 20,
    prerequisite_milestone_ids: [],
  },
  {
    milestone_id: "command_center_operating_surface_v1",
    title: "Command Center v2 operating surface (~100 read-only lanes)",
    category: "Engineering",
    status: "completed",
    completed_at: "2026-02-01T00:00:00.000Z",
    objective_completion_criteria:
      "buckparts:command-center rebuilds command_center_v2 JSON with brain manifest CONNECTED systems.",
    repo_evidence: [
      "scripts/report-buckparts-command-center.ts",
      "scripts/lib/buckparts-brain-coverage-manifest-v1.ts",
    ],
    validation_evidence: [
      "node --import tsx --test scripts/lib/buckparts-brain-coverage-manifest-v1.test.ts",
    ],
    business_significance: "Single operator truth hub replaces fragmented scripts for daily steering.",
    celebration_level: "team",
    roadmap_sequence: 30,
    prerequisite_milestone_ids: [],
  },
  {
    milestone_id: "truth_integrity_registry_v1",
    title: "Truth Integrity Registry projected into Command Center",
    category: "Trust",
    status: "completed",
    completed_at: "2026-03-01T00:00:00.000Z",
    objective_completion_criteria:
      "data/truth-integrity/truth-integrity-registry-v1.json loads read-only into command_center_v2.truth_integrity_registry_v1.",
    repo_evidence: [
      "data/truth-integrity/truth-integrity-registry-v1.json",
      "scripts/lib/command-center-truth-integrity-registry-v1.ts",
      "docs/BuckParts-TRUTH-INTEGRITY-REGISTRY.md",
    ],
    validation_evidence: [
      "node --import tsx --test scripts/lib/command-center-truth-integrity-registry-v1.test.ts",
    ],
    business_significance: "Formal truth-debt ledger for compliance and operator accountability.",
    celebration_level: "minor",
    roadmap_sequence: 40,
    prerequisite_milestone_ids: ["command_center_operating_surface_v1"],
  },
  {
    milestone_id: "semi_cruise_readonly_operational_v1",
    title: "Semi-Cruise read-only operator mode operational",
    category: "Autonomy",
    status: "completed",
    completed_at: "2026-04-01T00:00:00.000Z",
    objective_completion_criteria:
      "Operator can refresh truth, validate repo, and produce digest output without production mutation.",
    repo_evidence: ["docs/BuckParts-HQ-HANDOFF.md", "scripts/buckparts-operator-proof.ts"],
    validation_evidence: ["npm run buckparts:operator-proof"],
    business_significance: "First proven autonomous observation loop without mutating production.",
    celebration_level: "team",
    roadmap_sequence: 50,
    prerequisite_milestone_ids: ["command_center_operating_surface_v1"],
  },
  {
    milestone_id: "formal_wedge_truth_spines_v1",
    title: "Formal truth spines for refrigerator_water and air_purifier",
    category: "Customer",
    status: "completed",
    completed_at: "2026-05-01T00:00:00.000Z",
    objective_completion_criteria:
      "fridge_truth_spine_v1 and air_purifier_truth_spine_v1 lanes project into Command Center JSON.",
    repo_evidence: [
      "scripts/lib/fridge-truth-spine-v1.ts",
      "scripts/lib/air-purifier-truth-spine-v1.ts",
      "scripts/lib/wedge-truth-spine-coverage-matrix-v1.ts",
    ],
    validation_evidence: ["node --import tsx --test scripts/report-buckparts-command-center.test.ts"],
    business_significance: "Committed buyer-path truth surfaces for first-wedge homeowner utility.",
    celebration_level: "team",
    roadmap_sequence: 60,
    prerequisite_milestone_ids: ["command_center_operating_surface_v1"],
  },
  {
    milestone_id: "universal_coverage_factory_foundation_v1",
    title: "Universal Coverage Factory contract foundation",
    category: "Engineering",
    status: "completed",
    completed_at: "2026-05-20T00:00:00.000Z",
    objective_completion_criteria:
      "universal_coverage_factory_v1, decision layer, and work generator contracts validate read-only with zero mutation authority.",
    repo_evidence: [
      "src/lib/coverage-factory/universal-coverage-factory-v1.ts",
      "src/lib/coverage-factory/universal-coverage-factory-decision-layer-v1.ts",
      "src/lib/coverage-factory/universal-coverage-factory-work-generator-v1.ts",
    ],
    validation_evidence: [
      "node --import tsx --test src/lib/coverage-factory/universal-coverage-factory-v1.test.ts",
    ],
    business_significance: "Shared coverage disposition brain across homekeep wedges replaces per-wedge ad-hoc logic.",
    celebration_level: "team",
    roadmap_sequence: 70,
    prerequisite_milestone_ids: [],
  },
  {
    milestone_id: "ucf_registry_60_of_60_v1",
    title: "UCF registry 60/60 loadable homekeep coverage",
    category: "Engineering",
    status: "completed",
    completed_at: "2026-06-10T12:00:00.000Z",
    objective_completion_criteria:
      "COMMITTED_UCF_ADAPTER_REFERENCE_FILTER_SLUGS_V1 registers all 60 AP+WHW+fridge loadable subjects; scale_gap=0.",
    repo_evidence: [
      "src/lib/coverage-factory/universal-coverage-factory-v1.ts",
      "src/lib/coverage-factory/ucf-registry-governance-v1.test.ts",
    ],
    validation_evidence: [
      "node --import tsx --test src/lib/coverage-factory/ucf-registry-governance-v1.test.ts",
      "node --import tsx --test src/lib/coverage-factory/ucf-parity-audit-v1.test.ts",
    ],
    business_significance: "Full first-wedge catalog coverage under one canonical disposition factory.",
    celebration_level: "company",
    roadmap_sequence: 80,
    prerequisite_milestone_ids: ["universal_coverage_factory_foundation_v1"],
  },
  {
    milestone_id: "ucf_canonical_readiness_v1",
    title: "UCF canonical readiness policy (CANONICAL_READY_WITH_FIXES)",
    category: "Engineering",
    status: "completed",
    completed_at: "2026-06-10T14:00:00.000Z",
    objective_completion_criteria:
      "assessUcfCanonicalReadinessV1 classifies parity findings; registered canonical blockers=0; 11 accepted interpretations documented.",
    repo_evidence: [
      "src/lib/coverage-factory/ucf-canonical-readiness-policy-v1.ts",
      "src/lib/coverage-factory/ucf-parity-audit-v1.test.ts",
    ],
    validation_evidence: [
      "node --import tsx --test src/lib/coverage-factory/ucf-canonical-readiness-policy-v1.test.ts",
    ],
    business_significance: "Explicit governance for when UCF may authoritatively replace legacy disposition logic.",
    celebration_level: "team",
    roadmap_sequence: 90,
    prerequisite_milestone_ids: ["ucf_registry_60_of_60_v1"],
  },
  {
    milestone_id: "ucf_decision_authority_cutover_v1",
    title: "UCF decision authority cutover phase 1",
    category: "Engineering",
    status: "completed",
    completed_at: "2026-06-10T16:00:00.000Z",
    objective_completion_criteria:
      "ucf_decision_authority_cutover_v1 inventories consumers; LBCF summary cites UCF disposition provenance.",
    repo_evidence: [
      "src/lib/coverage-factory/ucf-decision-authority-cutover-v1.ts",
      "scripts/lib/buckparts-large-batch-coverage-factory-summary-v1.ts",
    ],
    validation_evidence: [
      "node --import tsx --test src/lib/coverage-factory/ucf-decision-authority-cutover-v1.test.ts",
    ],
    business_significance: "Begins controlled migration of coverage disposition authority to UCF without CC redesign.",
    celebration_level: "minor",
    roadmap_sequence: 100,
    prerequisite_milestone_ids: ["ucf_canonical_readiness_v1"],
  },
  {
    milestone_id: "ucf_decision_authority_cutover_phase2_v1",
    title: "UCF decision authority cutover phase 2 (100% disposition-provenance lanes)",
    category: "Engineering",
    status: "completed",
    completed_at: "2026-06-10T18:00:00.000Z",
    objective_completion_criteria:
      "fridge_buyer_path_owner_review_bridge_v1 and LBCF summary both cite UCF; runtime cutover_percentage=100%.",
    repo_evidence: [
      "src/lib/coverage-factory/ucf-decision-authority-cutover-phase2-v1.ts",
      "scripts/lib/fridge-buyer-path-owner-review-bridge-v1.ts",
    ],
    validation_evidence: [
      "node --import tsx --test src/lib/coverage-factory/ucf-decision-authority-cutover-phase2-v1.test.ts",
    ],
    business_significance: "All runtime disposition-provenance lanes now reference UCF for registered subjects.",
    celebration_level: "team",
    roadmap_sequence: 110,
    prerequisite_milestone_ids: ["ucf_decision_authority_cutover_v1"],
  },
  {
    milestone_id: "ucf_replacement_proof_v1",
    title: "UCF replacement proof (60/60 behavior-identical simulation)",
    category: "Engineering",
    status: "completed",
    completed_at: "2026-06-10T20:00:00.000Z",
    objective_completion_criteria:
      "runUcfReplacementSimulationV1 passes with zero critical deltas across disposition, work, suppression, planning, evidence.",
    repo_evidence: ["src/lib/coverage-factory/ucf-replacement-proof-v1.ts"],
    validation_evidence: [
      "node --import tsx --test src/lib/coverage-factory/ucf-replacement-proof-v1.test.ts",
    ],
    business_significance:
      "Formal proof UCF can replace legacy coverage-decision layer for registered subjects without observable behavior change.",
    celebration_level: "company",
    roadmap_sequence: 120,
    prerequisite_milestone_ids: ["ucf_decision_authority_cutover_phase2_v1"],
  },
  {
    milestone_id: "production_truth_ap_alarm_v1",
    title: "Production Truth AP live alarm surface",
    category: "Customer",
    status: "completed",
    completed_at: "2026-06-23T00:00:00.000Z",
    objective_completion_criteria:
      "buckparts_production_truth_ap_v1 lane projects live buyer-path alarm JSON into Command Center.",
    repo_evidence: [
      "scripts/lib/buckparts-production-truth-ap-v1.ts",
      "docs/BuckParts-HQ-HANDOFF.md",
    ],
    validation_evidence: [
      "node --import tsx --test scripts/lib/buckparts-production-truth-ap-v1.test.ts",
    ],
    business_significance: "Recurring runtime alarm when live DB diverges from committed CSV truth on AP wedge.",
    celebration_level: "team",
    roadmap_sequence: 130,
    prerequisite_milestone_ids: ["formal_wedge_truth_spines_v1"],
  },
  {
    milestone_id: "goat_c1_lbcf_ucf_merge_v1",
    title: "GOAT C1 — LBCF factory_state merged into UCF disposition",
    category: "Engineering",
    status: "pending",
    completed_at: null,
    objective_completion_criteria:
      "large_batch_coverage_factory_v1 factory_state taxonomy replaced or dual-mapped to UCF without behavior regression; founder approval recorded.",
    repo_evidence: [
      "src/lib/coverage/large-batch-coverage-factory-v1.ts",
      "src/lib/coverage-factory/ucf-decision-authority-cutover-phase2-v1.ts",
    ],
    validation_evidence: [
      "node --import tsx --test scripts/lib/large-batch-coverage-factory-v1.test.ts",
      "node --import tsx --test src/lib/coverage-factory/ucf-replacement-proof-v1.test.ts",
    ],
    business_significance: "Completes single coverage brain — eliminates parallel fridge expansion disposition taxonomy.",
    celebration_level: "company",
    roadmap_sequence: 140,
    prerequisite_milestone_ids: ["ucf_replacement_proof_v1"],
  },
  {
    milestone_id: "catalog_contamination_buyer_test_v1",
    title: "Catalog contamination buyer test executed",
    category: "Company",
    status: "pending",
    completed_at: null,
    objective_completion_criteria:
      "docs/business-development/catalog-contamination-audit/ buyer test completed with recorded outcomes.",
    repo_evidence: ["docs/business-development/catalog-contamination-audit/"],
    validation_evidence: ["UNKNOWN: buyer test execution artifact not yet in repo"],
    business_significance: "First external business proof that catalog quality supports trusted utility positioning.",
    celebration_level: "company",
    roadmap_sequence: 150,
    prerequisite_milestone_ids: ["strategic_identity_codified_v1"],
  },
  {
    milestone_id: "gsc_ga4_measurement_loop_mature_v1",
    title: "GSC / GA4 measurement loop mature",
    category: "Revenue",
    status: "pending",
    completed_at: null,
    objective_completion_criteria:
      "external_measurement_freshness_v1 lane OK; recurring fetch artifacts and operator review cadence proven.",
    repo_evidence: [
      "scripts/fetch-buckparts-gsc-artifact.ts",
      "scripts/fetch-buckparts-ga4-trust-funnel-artifact.ts",
    ],
    validation_evidence: ["npm run buckparts:gsc:fetch", "npm run buckparts:ga4:fetch"],
    business_significance: "Closes the loop between product truth work and measurable homeowner demand.",
    celebration_level: "company",
    roadmap_sequence: 160,
    prerequisite_milestone_ids: ["command_center_operating_surface_v1"],
  },
  {
    milestone_id: "first_ad_revenue_truth_loop_v1",
    title: "First ad-supported revenue truth loop proven",
    category: "Revenue",
    status: "pending",
    completed_at: null,
    objective_completion_criteria:
      "Ad inventory, impression, and revenue artifacts reconcile with GSC/GA4 and operator scorecard.",
    repo_evidence: ["scripts/report-homekeep-business-scorecard.ts"],
    validation_evidence: ["UNKNOWN: end-to-end revenue truth loop not yet proven in repo"],
    business_significance: "Validates near-term business model (utility + ads) with repo-truth evidence.",
    celebration_level: "company",
    roadmap_sequence: 170,
    prerequisite_milestone_ids: ["gsc_ga4_measurement_loop_mature_v1"],
  },
  {
    milestone_id: "autonomous_closed_loop_v1",
    title: "Autonomous closed learn→steer loop",
    category: "Autonomy",
    status: "pending",
    completed_at: null,
    objective_completion_criteria:
      "Production truth, truth integrity, and NBA steering connect without manual HQ handoff between cycles.",
    repo_evidence: [
      "scripts/lib/buckparts-command-center-next-best-action-v1.ts",
      "docs/COMMAND-CENTER-CONTROL-LOOP-V1.md",
    ],
    validation_evidence: ["UNKNOWN: closed loop not yet proven end-to-end"],
    business_significance: "Operating system runs with minimal founder intervention while staying fail-closed on mutation.",
    celebration_level: "company",
    roadmap_sequence: 180,
    prerequisite_milestone_ids: [
      "semi_cruise_readonly_operational_v1",
      "production_truth_ap_alarm_v1",
      "ucf_replacement_proof_v1",
    ],
  },
];

function emptyCategoryCounts(): Record<
  BuckPartsOsMilestoneCategoryV1,
  { completed: number; pending: number }
> {
  return Object.fromEntries(
    BUCKPARTS_OS_MILESTONE_CATEGORIES_V1.map((category) => [category, { completed: 0, pending: 0 }]),
  ) as Record<BuckPartsOsMilestoneCategoryV1, { completed: number; pending: number }>;
}

function countByCategory(
  milestones: readonly BuckPartsOsMilestoneV1[],
): Record<BuckPartsOsMilestoneCategoryV1, { completed: number; pending: number }> {
  const counts = emptyCategoryCounts();
  for (const milestone of milestones) {
    const bucket = counts[milestone.category];
    if (milestone.status === "completed") bucket.completed += 1;
    else bucket.pending += 1;
  }
  return counts;
}

function completedMilestones(
  milestones: readonly BuckPartsOsMilestoneV1[],
): Set<string> {
  return new Set(
    milestones.filter((milestone) => milestone.status === "completed").map((m) => m.milestone_id),
  );
}

function prerequisitesMet(
  milestone: BuckPartsOsMilestoneV1,
  completed: Set<string>,
): boolean {
  return milestone.prerequisite_milestone_ids.every((id) => completed.has(id));
}

function sortByRoadmapSequence(
  left: BuckPartsOsMilestoneV1,
  right: BuckPartsOsMilestoneV1,
): number {
  return left.roadmap_sequence - right.roadmap_sequence;
}

function findNextUnlockedMilestone(
  milestones: readonly BuckPartsOsMilestoneV1[],
): BuckPartsOsMilestoneV1 | null {
  const completed = completedMilestones(milestones);
  const pending = milestones
    .filter((milestone) => milestone.status === "pending")
    .filter((milestone) => prerequisitesMet(milestone, completed))
    .sort(sortByRoadmapSequence);
  return pending[0] ?? null;
}

function findNextCompanyMilestone(
  milestones: readonly BuckPartsOsMilestoneV1[],
): BuckPartsOsMilestoneV1 | null {
  const completed = completedMilestones(milestones);
  const pendingCompany = milestones
    .filter(
      (milestone) =>
        milestone.status === "pending" &&
        (milestone.category === "Company" || milestone.category === "Revenue") &&
        milestone.celebration_level === "company",
    )
    .filter((milestone) => prerequisitesMet(milestone, completed))
    .sort(sortByRoadmapSequence);
  return pendingCompany[0] ?? null;
}

function buildDistanceToCompanyCelebration(
  milestones: readonly BuckPartsOsMilestoneV1[],
): BuckPartsOsMilestoneDistanceToCompanyCelebrationV1 {
  const completed = completedMilestones(milestones);
  const pendingCompany = milestones.filter(
    (milestone) =>
      milestone.status === "pending" &&
      milestone.celebration_level === "company" &&
      (milestone.category === "Company" || milestone.category === "Revenue"),
  );
  const unlocked = pendingCompany.filter((milestone) => prerequisitesMet(milestone, completed));
  const blocking = pendingCompany
    .filter((milestone) => !prerequisitesMet(milestone, completed))
    .map((milestone) => milestone.milestone_id);

  const nextUnlocked = unlocked.sort(sortByRoadmapSequence)[0];
  const estimated_summary = nextUnlocked
    ? `Next company-level celebration candidate: ${nextUnlocked.milestone_id} (${nextUnlocked.title}). ${String(unlocked.length)} company/revenue celebration milestone(s) unlocked; ${String(blocking.length)} still blocked by prerequisites.`
    : `No company-level celebration milestones unlocked yet; ${String(blocking.length)} blocked by prerequisites.`;

  return {
    pending_company_milestones_count: pendingCompany.length,
    pending_team_or_company_milestones_count: milestones.filter(
      (milestone) =>
        milestone.status === "pending" &&
        (milestone.celebration_level === "company" || milestone.celebration_level === "team"),
    ).length,
    blocking_milestone_ids: blocking,
    estimated_summary,
  };
}

function verifyRepoEvidencePaths(rootDir: string, milestones: readonly BuckPartsOsMilestoneV1[]): string[] {
  const unknown: string[] = [];
  for (const milestone of milestones) {
    for (const rel of milestone.repo_evidence) {
      if (rel.startsWith("UNKNOWN") || rel.startsWith("docs/business-development")) continue;
      const abs = path.join(rootDir, rel);
      if (!existsSync(abs)) {
        unknown.push(`UNKNOWN: ${milestone.milestone_id} repo_evidence missing path ${rel}`);
      }
    }
  }
  return unknown;
}

export type BuildBuckPartsOsMilestoneTrackerReportArgsV1 = {
  rootDir: string;
  now?: () => Date;
};

export function buildBuckPartsOsMilestoneTrackerReportV1(
  args: BuildBuckPartsOsMilestoneTrackerReportArgsV1,
): BuckPartsOsMilestoneTrackerReportV1 {
  const now = args.now ?? (() => new Date());
  const milestones = [...BUCKPARTS_OS_MILESTONE_SEED_V1];
  const chronological_completed_milestones = milestones
    .filter((milestone) => milestone.status === "completed" && milestone.completed_at)
    .sort((left, right) => left.completed_at!.localeCompare(right.completed_at!));

  const replacementProof = buildUcfReplacementProofReportV1({ rootDir: args.rootDir, now });
  const registeredCount = committedUcfRegisteredSubjectCountV1();

  const runtime_verification: BuckPartsOsMilestoneRuntimeVerificationV1 = {
    ucf_registered_subject_count: registeredCount,
    ucf_registry_full: registeredCount === 60,
    ucf_replacement_simulation_passed: replacementProof.simulation.simulation_passed,
  };

  const next_unlocked_milestone = findNextUnlockedMilestone(milestones);
  const next_company_milestone = findNextCompanyMilestone(milestones);
  const distance_to_first_company_celebration = buildDistanceToCompanyCelebration(milestones);

  const validation_commands = [
    "npm run build",
    "node --import tsx --test scripts/lib/buckparts-os-milestone-tracker-v1.test.ts",
    "node --import tsx --test src/lib/coverage-factory/ucf-replacement-proof-v1.test.ts",
  ];

  const missingEvidence = verifyRepoEvidencePaths(args.rootDir, milestones);

  return {
    contract: BUCKPARTS_OS_MILESTONE_TRACKER_CONTRACT_V1,
    report_name: BUCKPARTS_OS_MILESTONE_TRACKER_REPORT_NAME_V1,
    read_only: true,
    data_mutation: false,
    mutation_authorized: false,
    generated_at: now().toISOString(),
    milestone_inventory: milestones,
    chronological_completed_milestones,
    counts_by_category: countByCategory(milestones),
    next_unlocked_milestone,
    next_company_milestone,
    distance_to_first_company_celebration,
    runtime_verification,
    proven_facts: [
      `PROVEN: ${BUCKPARTS_OS_MILESTONE_TRACKER_CONTRACT_V1} tracks ${String(milestones.length)} milestone(s) (${String(chronological_completed_milestones.length)} completed).`,
      `PROVEN: ucf_registered_subject_count=${String(registeredCount)} ucf_replacement_simulation_passed=${String(runtime_verification.ucf_replacement_simulation_passed)}.`,
      `PROVEN: next_unlocked_milestone=${next_unlocked_milestone?.milestone_id ?? "none"}.`,
      `PROVEN: next_company_milestone=${next_company_milestone?.milestone_id ?? "none"}.`,
      ...missingEvidence,
    ],
    validation_commands,
  };
}
