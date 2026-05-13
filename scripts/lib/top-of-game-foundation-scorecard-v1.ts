import type {
  AmazonRescueLane,
  CommandCenterV2Report,
  DecisionLane,
  DemandToCoverageEngineV1,
  EvidenceToLearningOutcomesCandidateImportV1,
  FoundationScorecardLaneStatusV1,
  FoundationScorecardLaneV1,
  LearningOutcomesConfidenceApprovalRegistryV1,
  LearningOutcomesConfidenceApprovalsLoadedV1,
  LearningOutcomesInsertPlanV1,
  LearningOutcomesReadModelV1,
  LearningOutcomesWriterReadyBatchReviewV1,
  LiveSiteMonitorV1,
  PublicTrustUnificationBackendContractV1,
  RevenueSnapshotLane,
  TopOfGameFoundationScorecardRuntimeV1,
  TopOfGameFoundationScorecardV1,
} from "./buckparts-command-center-v2-types";
import { computeApprovedInsertExecutorSelectionV1 } from "./learning-outcomes-approved-insert-executor-v1";

/** Lane max contributions — must sum to 100. */
export const TOP_OF_GAME_FOUNDATION_LANE_WEIGHTS_V1 = {
  demand_to_coverage_engine: 10,
  evidence_to_learning_candidates: 10,
  learning_outcomes_planning: 15,
  owner_approval_registry: 10,
  approved_insert_executor_dry_run: 10,
  durable_learning_write_proven: 10,
  live_site_smoke_truth: 10,
  autonomous_task_authority: 10,
  revenue_truth_connection: 7,
  public_trust_unification_backend_contract: 8,
} as const;

const WEIGHT_SUM = Object.values(TOP_OF_GAME_FOUNDATION_LANE_WEIGHTS_V1).reduce((a, b) => a + b, 0);

function contributionForStatus(max: number, status: FoundationScorecardLaneStatusV1): number {
  if (status === "PROVEN") return max;
  if (status === "PARTIAL") return Math.floor(max / 2);
  return 0;
}

function lane(
  lane_id: string,
  label: string,
  max: number,
  status: FoundationScorecardLaneStatusV1,
  proven_basis: string[],
  unknowns: string[],
  next_proof_required: string,
): FoundationScorecardLaneV1 {
  return {
    lane_id,
    label,
    status,
    score_contribution: contributionForStatus(max, status),
    max_contribution: max,
    proven_basis,
    unknowns,
    next_proof_required,
  };
}

export type BuildTopOfGameFoundationScorecardV1Input = {
  demand: DemandToCoverageEngineV1;
  evidenceImport: EvidenceToLearningOutcomesCandidateImportV1;
  insertPlan: LearningOutcomesInsertPlanV1;
  writerReady: LearningOutcomesWriterReadyBatchReviewV1;
  confRegistry: LearningOutcomesConfidenceApprovalRegistryV1;
  readModel: LearningOutcomesReadModelV1;
  deployLane: DecisionLane & { live_site_monitor: LiveSiteMonitorV1 | null };
  revenueLane: RevenueSnapshotLane;
  recommendationAuthority: CommandCenterV2Report["recommendation_authority"];
  nextAllowedAgentToken: string | null;
  coverageHealth: DecisionLane;
  amazonRescue: AmazonRescueLane;
  approvalsLoaded: LearningOutcomesConfidenceApprovalsLoadedV1;
  publicTrustContract: PublicTrustUnificationBackendContractV1;
};

/**
 * Read-only foundation maturity scorecard derived only from existing Command Center v2 slices.
 * No invented scores: each lane ties to proven fields or UNKNOWN/PARTIAL/BLOCKED with explicit basis.
 */
export function buildTopOfGameFoundationScorecardV1(input: BuildTopOfGameFoundationScorecardV1Input): TopOfGameFoundationScorecardV1 {
  const w = TOP_OF_GAME_FOUNDATION_LANE_WEIGHTS_V1;
  if (WEIGHT_SUM !== 100) {
    throw new Error(`top_of_game_foundation_scorecard_v1: lane weights sum to ${WEIGHT_SUM}, expected 100`);
  }

  const unknown_facts: string[] = [];
  const proven_facts: string[] = [
    "top_of_game_foundation_scorecard_v1 is read-only; it does not mutate Supabase, retailer_links, or public pages.",
    "Scores are derived from Command Center v2 fields only — clicks are not revenue; demand gaps are not fit/buy proof; dry-run executor selection is not a durable DB write proof.",
    `Lane max weights are fixed in-repo and sum to ${WEIGHT_SUM}: ${Object.entries(w)
      .map(([k, v]) => `${k}=${v}`)
      .join(", ")}.`,
  ];

  const runtime_status: TopOfGameFoundationScorecardRuntimeV1 =
    input.evidenceImport.contract === "evidence_to_learning_outcomes_candidate_import_v1" ? "OK" : "UNKNOWN_INPUT";

  if (runtime_status === "UNKNOWN_INPUT") {
    unknown_facts.push("evidence_to_learning_outcomes_candidate_import_v1 contract mismatch — foundation lanes that depend on evidence import are not scored as PROVEN.");
  }

  const pub = input.publicTrustContract;
  if (pub.contract === "public_trust_unification_backend_contract_v1") {
    proven_facts.push(
      `public_trust_unification_backend_contract_v1 is attached with coverage_status=${pub.coverage_status}, page_contracts_evaluated_count=${pub.page_contracts_evaluated_count}, proven_signal_count=${pub.proven_signal_count}.`,
    );
  } else {
    unknown_facts.push("public_trust_unification_backend_contract_v1 missing or wrong contract discriminator on Command Center v2 input.");
  }

  const lanes: FoundationScorecardLaneV1[] = [];

  const demand = input.demand;
  let demandStatus: FoundationScorecardLaneStatusV1;
  let demandBasis: string[] = [];
  let demandUnknowns: string[] = [];
  let demandNext = "";
  if (demand.runtime_status === "OK") {
    demandStatus = "PROVEN";
    demandBasis = [
      `demand_to_coverage_engine_v1.runtime_status is OK (contract ${demand.contract}).`,
      `Bounded rows present: ${demand.rows.length} (cap ${demand.bounded_row_cap}).`,
    ];
    demandNext = "Maintain read-only demand slice; catalog-wide coverage remains unproven by design.";
  } else if (demand.runtime_status === "UNKNOWN_DB_UNAVAILABLE") {
    demandStatus = "BLOCKED";
    demandBasis = [`demand_to_coverage_engine_v1.runtime_status is ${demand.runtime_status}.`];
    demandNext = "Restore Supabase read path for search_gaps before treating demand lane as foundation-green.";
  } else {
    demandStatus = "PARTIAL";
    demandBasis = [`demand_to_coverage_engine_v1.runtime_status is ${demand.runtime_status}.`];
    demandUnknowns = demand.unknown_facts.slice(0, 3);
    demandNext = "Resolve demand engine query/runtime errors for a full PROVEN demand foundation slice.";
  }
  lanes.push(
    lane(
      "demand_to_coverage_engine",
      "Demand → coverage engine (read-only search_gaps slice)",
      w.demand_to_coverage_engine,
      demandStatus,
      demandBasis,
      demandUnknowns,
      demandNext,
    ),
  );

  const ev = input.evidenceImport;
  let evStatus: FoundationScorecardLaneStatusV1;
  let evBasis: string[] = [];
  let evUnknowns: string[] = [];
  let evNext = "";
  if (ev.contract !== "evidence_to_learning_outcomes_candidate_import_v1") {
    evStatus = "UNKNOWN";
    evBasis = [];
    evUnknowns = ["Evidence import contract not evidence_to_learning_outcomes_candidate_import_v1."];
    evNext = "Rebuild evidence import from data/evidence with the supported importer.";
  } else if (ev.runtime_status === "OK" && ev.candidate_count > 0) {
    evStatus = "PROVEN";
    evBasis = [
      `evidence_to_learning_outcomes_candidate_import_v1.runtime_status OK with candidate_count=${ev.candidate_count}.`,
      `parseable_file_count=${ev.parseable_file_count}, scanned_file_count=${ev.scanned_file_count}.`,
    ];
    evNext = "Keep evidence JSON mapping honest; filename substrings alone are not verdicts.";
  } else if (ev.runtime_status === "OK") {
    evStatus = "PARTIAL";
    evBasis = ["Importer runtime OK but candidate_count is zero — pipeline is live with no mapped candidates."];
    evNext = "Author or fix evidence JSON so filter_slug/token mapping yields at least one candidate.";
  } else {
    evStatus = "BLOCKED";
    evBasis = [`evidence_to_learning_outcomes_candidate_import_v1.runtime_status is ${ev.runtime_status}.`];
    evUnknowns = ev.unknown_facts.slice(0, 3);
    evNext = "Fix evidence directory IO or parse failures before counting learning-candidate foundation as green.";
  }
  lanes.push(
    lane(
      "evidence_to_learning_candidates",
      "Evidence → learning outcome candidates (local JSON import)",
      w.evidence_to_learning_candidates,
      evStatus,
      evBasis,
      evUnknowns,
      evNext,
    ),
  );

  const ins = input.insertPlan;
  let planStatus: FoundationScorecardLaneStatusV1;
  let planBasis: string[] = [];
  let planUnknowns: string[] = [];
  let planNext = "";
  if (ins.contract !== "learning_outcomes_insert_plan_v1" || ins.runtime_status !== "OK") {
    planStatus = "BLOCKED";
    planBasis = [`learning_outcomes_insert_plan_v1.runtime_status is ${ins.runtime_status}.`];
    planUnknowns = ins.unknown_facts.slice(0, 3);
    planNext = "Restore evidence import OK input so insert plan can classify candidates.";
  } else if (ins.writer_ready_count > 0) {
    planStatus = "PROVEN";
    planBasis = [
      `learning_outcomes_insert_plan_v1 OK with writer_ready_count=${ins.writer_ready_count} (validateLearningOutcomeInput gate passed for at least one row).`,
      `source_candidate_count=${ins.source_candidate_count}.`,
    ];
    planNext = "Continue owner/registry alignment for writer-ready rows; dry-run is not a DB write.";
  } else if (ins.source_candidate_count > 0) {
    planStatus = "PARTIAL";
    planBasis = [
      `Insert plan OK with candidates (${ins.source_candidate_count}) but writer_ready_count=0 — planning exists without a writer-ready first batch.`,
    ];
    planNext = "Resolve confidence/registry/validation gaps so at least one row becomes writer_ready when intended.";
  } else {
    planStatus = "BLOCKED";
    planBasis = ["Insert plan OK but no source candidates — planning lane cannot be PROVEN."];
    planNext = "Populate evidence-derived candidates before treating learning insert planning as foundation-complete.";
  }
  lanes.push(
    lane(
      "learning_outcomes_planning",
      "Learning outcomes insert planning (read-only insert plan + writer-ready classification)",
      w.learning_outcomes_planning,
      planStatus,
      planBasis,
      planUnknowns,
      planNext,
    ),
  );

  const reg = input.confRegistry;
  let regStatus: FoundationScorecardLaneStatusV1;
  let regBasis: string[] = [];
  let regUnknowns: string[] = [];
  let regNext = "";
  if (reg.runtime_status === "OK" && reg.applied_approval_count > 0) {
    regStatus = "PROVEN";
    regBasis = [
      `learning_outcomes_confidence_approval_registry_v1 OK with applied_approval_count=${reg.applied_approval_count} (registry rows match current evidence candidates).`,
      `valid_approval_count=${reg.valid_approval_count}.`,
    ];
    regNext = "Extend registry only with explicit owner-approved rows; never infer confidence from evidence bodies.";
  } else if (reg.runtime_status === "OK" && reg.valid_approval_count > 0) {
    regStatus = "PARTIAL";
    regBasis = [
      `Registry file OK with valid approvals (${reg.valid_approval_count}) but applied_approval_count=${reg.applied_approval_count} — owner entries exist without matching current candidates.`,
    ];
    regUnknowns = reg.unknown_facts.slice(0, 2);
    regNext = "Align source_file/slug keys with live evidence import so approvals apply to current candidates.";
  } else if (reg.runtime_status === "OK") {
    regStatus = "PARTIAL";
    regBasis = ["Registry runtime OK but no valid approval rows loaded."];
    regNext = "Add owner-approved confidence rows to data/ops/learning-outcomes-confidence-approvals.json when ready.";
  } else {
    regStatus = reg.runtime_status === "MISSING_FILE" ? "BLOCKED" : "UNKNOWN";
    regBasis = [`learning_outcomes_confidence_approval_registry_v1.runtime_status is ${reg.runtime_status}.`];
    regUnknowns = reg.unknown_facts.slice(0, 3);
    regNext = "Restore valid confidence approvals registry JSON for explicit owner confidence merges.";
  }
  lanes.push(
    lane(
      "owner_approval_registry",
      "Owner confidence approval registry (read-only file)",
      w.owner_approval_registry,
      regStatus,
      regBasis,
      regUnknowns,
      regNext,
    ),
  );

  const dry = computeApprovedInsertExecutorSelectionV1(input.evidenceImport, input.approvalsLoaded);
  let dryStatus: FoundationScorecardLaneStatusV1;
  let dryBasis: string[] = [];
  let dryUnknowns: string[] = [...dry.unknown_facts];
  let dryNext = "";
  if (dry.selected_count >= 1) {
    dryStatus = "PROVEN";
    dryBasis = [
      `computeApprovedInsertExecutorSelectionV1 selected_count=${dry.selected_count} (sync with approved insert executor dry-run rules; not a DB write).`,
      "Selection requires writer_ready + valid registry approval + pass/live/https guards.",
    ];
    dryNext = "Run npm run buckparts:learning-outcomes-approved-insert:mutate only after owner review if a durable row is intended.";
  } else if (input.writerReady.source_writer_ready_count > 0) {
    dryStatus = "PARTIAL";
    dryBasis = [
      `Writer-ready cohort exists (source_writer_ready_count=${input.writerReady.source_writer_ready_count}) but dry-run selection count is ${dry.selected_count}.`,
    ];
    dryNext = "Align registry approvals and executor guards so at least one approved writer-ready row is selectable.";
  } else {
    dryStatus = "UNKNOWN";
    dryBasis = ["No writer_ready rows in learning_outcomes_writer_ready_batch_review_v1 — dry-run lane has nothing to prove."];
    dryNext = "Produce writer-ready candidates before treating approved-insert dry-run lane as PROVEN.";
  }
  lanes.push(
    lane(
      "approved_insert_executor_dry_run",
      "Approved insert executor (dry-run selection only — not durable write)",
      w.approved_insert_executor_dry_run,
      dryStatus,
      dryBasis,
      dryUnknowns,
      dryNext,
    ),
  );

  const rm = input.readModel;
  let writeStatus: FoundationScorecardLaneStatusV1;
  let writeBasis: string[] = [];
  let writeUnknowns: string[] = [];
  let writeNext = "";
  if (rm.runtime_status === "OK" && typeof rm.total_outcomes === "number" && rm.total_outcomes > 0) {
    writeStatus = "PROVEN";
    writeBasis = [
      `learning_outcomes_read_model_v1 OK with total_outcomes=${rm.total_outcomes} (durable rows observable via read-only SELECT).`,
    ];
    writeNext = "Keep inserts owner-guarded; read model proves presence only — not PDP fit or revenue.";
  } else if (rm.runtime_status === "OK" && typeof rm.total_outcomes === "number" && rm.total_outcomes === 0) {
    writeStatus = "BLOCKED";
    writeBasis = ["learning_outcomes_read_model_v1 OK but total_outcomes is 0 — no durable learning_outcomes rows proven yet."];
    writeNext = "Execute owner-approved mutate path once to prove durable write; until then lane stays blocked.";
  } else {
    writeStatus = "UNKNOWN";
    writeBasis = [`learning_outcomes_read_model_v1 cannot prove row counts (runtime_status=${rm.runtime_status}, total_outcomes type is not a proven positive integer).`];
    writeUnknowns = rm.unknown_facts.slice(0, 3);
    writeNext = "Restore read-only Supabase access for learning_outcomes counts before scoring durable write lane.";
  }
  lanes.push(
    lane(
      "durable_learning_write_proven",
      "Durable learning_outcomes write proven (read model row count)",
      w.durable_learning_write_proven,
      writeStatus,
      writeBasis,
      writeUnknowns,
      writeNext,
    ),
  );

  const dep = input.deployLane;
  let smokeStatus: FoundationScorecardLaneStatusV1;
  let smokeBasis: string[] = [];
  let smokeUnknowns: string[] = [];
  let smokeNext = "";
  if (dep.status === "OK" && dep.live_site_monitor !== null) {
    smokeStatus = "PROVEN";
    smokeBasis = [
      "deploy_live_site_status.status is OK with live_site_monitor_v1 artifact attached (HTTP smoke JSON present).",
      `Route probes: ${dep.live_site_monitor.routes.length}.`,
    ];
    smokeNext = "Refresh smoke artifact on cadence; HTTP OK is not deploy API or revenue proof.";
  } else if (dep.status === "PLACEHOLDER" || dep.blocker === "no_live_site_smoke_artifact") {
    smokeStatus = "BLOCKED";
    smokeBasis = [
      `deploy_live_site_status is PLACEHOLDER or blocked (${dep.blocker ?? "null blocker"}) — live site smoke truth not proven from artifact.`,
    ];
    smokeNext = "Run npm run buckparts:live-site-smoke to emit the read-only monitor JSON used by this lane.";
  } else {
    smokeStatus = "PARTIAL";
    smokeBasis = [`deploy_live_site_status.status is ${dep.status} with live_site_monitor ${dep.live_site_monitor ? "present" : "null"}.`];
    if (dep.live_site_monitor) smokeUnknowns = dep.live_site_monitor.unknown_facts.slice(0, 3);
    smokeNext = "Resolve ATTENTION/BLOCKED smoke or config items before claiming live-site foundation is green.";
  }
  lanes.push(
    lane(
      "live_site_smoke_truth",
      "Live site smoke truth (HTTP artifact — not deploy API)",
      w.live_site_smoke_truth,
      smokeStatus,
      smokeBasis,
      smokeUnknowns,
      smokeNext,
    ),
  );

  const hasScopedAgent = input.recommendationAuthority.evaluated_actions.some(
    (a) => a.action_type === "AGENT_ACTION" && a.allowed_as_recommendation,
  );
  let autoStatus: FoundationScorecardLaneStatusV1;
  let autoBasis: string[] = [];
  let autoUnknowns: string[] = [];
  let autoNext = "";
  if (
    input.nextAllowedAgentToken != null &&
    input.coverageHealth.status !== "BLOCKED" &&
    input.amazonRescue.blocker == null
  ) {
    autoStatus = "PROVEN";
    autoBasis = [
      `next_allowed_agent_token is ${input.nextAllowedAgentToken} with coverage_health not BLOCKED and amazon_rescue.blocker null — scoped read-only agent path is unblocked in Command Center heuristics.`,
    ];
    autoNext = "Autonomous scope remains read-only queue/evidence work only — no retailer mutation authority implied.";
  } else if (hasScopedAgent) {
    autoStatus = "PARTIAL";
    autoBasis = [
      "recommendation_authority includes at least one allowed AGENT_ACTION record, but fresh-token gate or blockers prevent full PROVEN autonomy lane.",
    ];
    autoNext = "Clear registry/queue blockers or supply next_allowed_agent_token per Command Center rules.";
  } else {
    autoStatus = "UNKNOWN";
    autoBasis = ["No proven scoped autonomous agent token plus clear blockers per Command Center v2 heuristics."];
    autoNext = "Treat autonomous execution as unproven until Command Center surfaces a registry-cleared agent token path.";
  }
  lanes.push(
    lane(
      "autonomous_task_authority",
      "Autonomous task authority (Command Center recommendation_authority + next_allowed_agent_token)",
      w.autonomous_task_authority,
      autoStatus,
      autoBasis,
      autoUnknowns,
      autoNext,
    ),
  );

  const click = input.revenueLane.click_visibility;
  let revStatus: FoundationScorecardLaneStatusV1;
  let revBasis: string[] = [];
  let revUnknowns: string[] = [];
  let revNext = "";
  if (click && click.runtime_status === "OK" && click.commission_or_revenue === "NOT_CONNECTED") {
    revStatus = "PARTIAL";
    revBasis = [
      "revenue_snapshot.click_visibility runtime OK but commission_or_revenue remains NOT_CONNECTED in-repo — operational click visibility only.",
      click.commission_or_revenue_notes ? `Notes: ${click.commission_or_revenue_notes}` : "",
    ].filter(Boolean);
    revUnknowns = ["Commission/revenue ledger connection is not implemented in this repo slice."];
    revNext = "Wire commission/revenue truth only with a separate proven contract — clicks stay non-revenue here.";
  } else if (click && click.commission_or_revenue !== "NOT_CONNECTED") {
    revStatus = "PROVEN";
    revBasis = [`click_visibility reports commission_or_revenue=${click.commission_or_revenue} (not NOT_CONNECTED).`];
    revNext = "Validate revenue connection claims against source systems outside this scorecard.";
  } else {
    revStatus = "UNKNOWN";
    revBasis = ["Click visibility unavailable or schema-limited — cannot score revenue truth connection."];
    revUnknowns = click?.aggregation_notes?.slice(0, 3) ?? [];
    revNext = "Restore read-only click snapshot before treating revenue-adjacent visibility as foundation input.";
  }
  lanes.push(
    lane(
      "revenue_truth_connection",
      "Revenue / commission truth connection (explicitly not click counts)",
      w.revenue_truth_connection,
      revStatus,
      revBasis,
      revUnknowns,
      revNext,
    ),
  );

  let pubStatus: FoundationScorecardLaneStatusV1;
  let pubBasis: string[] = [];
  let pubUnknowns: string[] = [];
  let pubNext = "";
  if (pub.contract !== "public_trust_unification_backend_contract_v1") {
    pubStatus = "UNKNOWN";
    pubUnknowns = ["public_trust_unification_backend_contract_v1 block missing or wrong contract field."];
    pubNext = "Rebuild Command Center v2 so the public trust contract builder runs and attaches the v1 block.";
  } else if (pub.runtime_status === "BLOCKED") {
    pubStatus = "BLOCKED";
    pubBasis = [`public_trust_unification_backend_contract_v1.runtime_status is BLOCKED — file existence checks failed.`];
    pubUnknowns = pub.unknown_facts.slice(0, 4);
    pubNext = "Fix rootDir/fileExists failures so the trust contract can complete read-only path checks.";
  } else if (pub.coverage_status === "PROVEN") {
    pubStatus = "PROVEN";
    pubBasis = [
      `public_trust_unification_backend_contract_v1.coverage_status is PROVEN (proven_signal_count=${pub.proven_signal_count}, required_signals=${pub.required_signals.length}).`,
    ];
    pubNext = "Keep trust-module paths stable; re-run Command Center after refactors that move part-trust, public-trust, buy shell, or go route files.";
  } else if (pub.coverage_status === "PARTIAL") {
    pubStatus = "PARTIAL";
    pubBasis = [
      `coverage_status is PARTIAL (proven_signal_count=${pub.proven_signal_count}, missing_signal_count=${pub.missing_signal_count}).`,
    ];
    pubUnknowns = pub.unknown_facts.slice(0, 4);
    pubNext = "Restore missing trust-module files or repo root until public_trust_unification_backend_contract_v1.coverage_status is PROVEN.";
  } else {
    pubStatus = "UNKNOWN";
    pubBasis = [`coverage_status is ${pub.coverage_status} — required trust signal path groups are not all present.`];
    pubUnknowns = pub.unknown_facts.slice(0, 4);
    pubNext = "Investigate checkout layout or rootDir until all required trust signal files exist.";
  }

  lanes.push({
    ...lane(
      "public_trust_unification_backend_contract",
      "Public trust unification (read-only backend contract v1)",
      w.public_trust_unification_backend_contract,
      pubStatus,
      pubBasis,
      pubUnknowns,
      pubNext,
    ),
    score_contribution: pubStatus === "PROVEN" ? w.public_trust_unification_backend_contract : 0,
  });

  const foundation_maturity_score_100 = lanes.reduce((s, l) => s + l.score_contribution, 0);
  const current_goal_score_100 = foundation_maturity_score_100;
  const goal_reached = foundation_maturity_score_100 === 100 && lanes.every((l) => l.status === "PROVEN");

  const blockers = lanes
    .filter((l) => l.status === "BLOCKED")
    .map((l) => `${l.lane_id}: ${l.next_proof_required}`)
    .concat(
      input.coverageHealth.status === "BLOCKED"
        ? [`coverage_health: ${input.coverageHealth.blocker ?? "command_surface_critical"}`]
        : [],
    );

  const blockedLane = lanes.find((l) => l.status === "BLOCKED");
  const next_best_foundation_move =
    blockedLane?.next_proof_required ??
    lanes.find((l) => l.status === "UNKNOWN")?.next_proof_required ??
    "Continue read-only Command Center monitoring; no BLOCKED/UNKNOWN lanes requiring immediate foundation action were synthesized.";

  return {
    contract: "top_of_game_foundation_scorecard_v1",
    runtime_status,
    foundation_maturity_score_100,
    current_goal_score_100,
    goal_reached,
    lanes,
    blockers,
    next_best_foundation_move,
    owner_dashboard_ready: false,
    owner_dashboard_note:
      "Owner dashboard UI is not implemented yet — this scorecard is a read-only backend contract for future wiring only.",
    read_only: true,
    data_mutation: false,
    proven_facts,
    unknown_facts,
  };
}
