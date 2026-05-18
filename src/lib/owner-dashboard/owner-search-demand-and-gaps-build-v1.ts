export type OwnerSearchDemandConnectionLevel = "BRIGHT" | "DIM" | "DARK" | "UNKNOWN";
export type OwnerSearchDemandSourceClass = "LIVE" | "ARTIFACT" | "MANUAL" | "MIXED" | "UNKNOWN";

export type OwnerSearchDemandAndGapsNeuron = {
  neuron_key: "search_demand_and_gaps";
  connection_level: OwnerSearchDemandConnectionLevel;
  source_class: OwnerSearchDemandSourceClass;
  freshness_method: string;
  runtime_status: "OK" | "UNKNOWN_DB_UNAVAILABLE" | "UNKNOWN_NOT_QUERIED" | "UNKNOWN";
  window_days: { short: 7; long: 30 } | "UNKNOWN";
  search_events_last_7d: number | "UNKNOWN";
  search_events_last_30d: number | "UNKNOWN";
  zero_result_last_7d: number | "UNKNOWN";
  zero_result_last_30d: number | "UNKNOWN";
  actionable_search_gaps: number | "UNKNOWN";
  proven_facts: string[];
  unknown_facts: string[];
  next_owner_action: string;
};

export type OwnerSearchDemandAndGapsReport = {
  data_mutation: false;
  generated_from: string[];
  search_demand_and_gaps: OwnerSearchDemandAndGapsNeuron;
};

export type SearchAndClickIntelligenceSummaryForNeurons = {
  runtime_status: "OK" | "UNKNOWN_DB_UNAVAILABLE" | "UNKNOWN_NOT_QUERIED";
  window_days: { short: 7; long: 30 };
  search_events: {
    last_7d: number | "UNKNOWN";
    last_30d: number | "UNKNOWN";
    zero_result_last_7d: number | "UNKNOWN";
    zero_result_last_30d: number | "UNKNOWN";
    zero_result_rate_last_7d: number | "UNKNOWN";
    zero_result_rate_last_30d: number | "UNKNOWN";
  };
  search_gaps_backlog: {
    open: number | "UNKNOWN";
    reviewing: number | "UNKNOWN";
    queued: number | "UNKNOWN";
    total_actionable: number | "UNKNOWN";
  };
  click_events: {
    last_7d: number | "UNKNOWN";
    last_30d: number | "UNKNOWN";
  };
  known_unknowns: string[];
};

export function buildOwnerSearchDemandAndGapsNeuronFromSummary(
  summary: SearchAndClickIntelligenceSummaryForNeurons,
): OwnerSearchDemandAndGapsNeuron {
  const provenFacts: string[] = [];
  const unknownFacts: string[] = [];
  const sourceClass: OwnerSearchDemandSourceClass = "LIVE";
  const runtimeStatus = summary.runtime_status ?? "UNKNOWN";
  const runtimeOk = runtimeStatus === "OK";

  const search7 = summary.search_events.last_7d;
  const search30 = summary.search_events.last_30d;
  const zero7 = summary.search_events.zero_result_last_7d;
  const zero30 = summary.search_events.zero_result_last_30d;
  const actionable = summary.search_gaps_backlog.total_actionable;

  const addUnknownMetric = (label: string, value: number | "UNKNOWN") => {
    if (value === "UNKNOWN") unknownFacts.push(`${label} is UNKNOWN in command-surface summary.`);
    else provenFacts.push(`${label}=${value}.`);
  };

  addUnknownMetric("search_events_last_7d", search7);
  addUnknownMetric("search_events_last_30d", search30);
  addUnknownMetric("zero_result_last_7d", zero7);
  addUnknownMetric("zero_result_last_30d", zero30);
  addUnknownMetric("actionable_search_gaps", actionable);

  if (runtimeOk) {
    provenFacts.push(
      "search_and_click_intelligence_summary runtime_status is OK (live DB-derived command-surface summary).",
    );
  } else {
    unknownFacts.push(
      `search_and_click_intelligence_summary runtime_status is ${runtimeStatus}; search demand signal is not fully usable.`,
    );
  }

  if (runtimeOk && unknownFacts.length === 0) {
    provenFacts.push("Windowed demand and zero-result counts are present for both 7d and 30d.");
  }

  const connectionLevel: OwnerSearchDemandConnectionLevel = runtimeOk
    ? unknownFacts.length === 0
      ? "BRIGHT"
      : "DIM"
    : runtimeStatus === "UNKNOWN_NOT_QUERIED" || runtimeStatus === "UNKNOWN_DB_UNAVAILABLE"
      ? "DARK"
      : "UNKNOWN";

  const nextOwnerAction = runtimeOk
    ? actionable === "UNKNOWN"
      ? "Keep search-demand monitoring active and restore actionable gap counts before using this neuron for backlog prioritization."
      : actionable > 0
        ? "Use actionable search gaps plus zero-result counts to prioritize highest-impact search-fix work."
        : "Search demand telemetry is healthy; continue weekly monitoring and investigate rising zero-result rate if it increases."
    : "Restore command-surface search runtime availability before using this neuron to guide demand decisions.";

  return {
    neuron_key: "search_demand_and_gaps",
    connection_level: connectionLevel,
    source_class: sourceClass,
    freshness_method: "Built from command_center search_and_click_intelligence_summary (no duplicate DB query in neuron builder).",
    runtime_status: runtimeStatus,
    window_days: summary.window_days ?? "UNKNOWN",
    search_events_last_7d: search7,
    search_events_last_30d: search30,
    zero_result_last_7d: zero7,
    zero_result_last_30d: zero30,
    actionable_search_gaps: actionable,
    proven_facts: provenFacts,
    unknown_facts: unknownFacts,
    next_owner_action: nextOwnerAction,
  };
}

export function buildOwnerSearchDemandAndGapsReportFromSummary(
  summary: SearchAndClickIntelligenceSummaryForNeurons,
): OwnerSearchDemandAndGapsReport {
  return {
    data_mutation: false,
    generated_from: [
      "scripts/report-buckparts-command-surface.ts (search_and_click_intelligence_summary)",
      "scripts/report-buckparts-command-center.ts",
    ],
    search_demand_and_gaps: buildOwnerSearchDemandAndGapsNeuronFromSummary(summary),
  };
}
