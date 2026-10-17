/**
 * Read-only Founder Operating Picture contract.
 * BuckParts hosts this projection. It does not recompute J economics.
 */

export const FOUNDER_OPERATING_PICTURE_SCHEMA =
  "j.founder_operating_picture.v1" as const;

export type EconValue = {
  value: number | string;
  display: string;
  is_unknown: boolean;
  is_zero: boolean;
  kind?: string;
};

export type BusinessScope = {
  id: string;
  label: string;
};

export type QueueItem = {
  item: string;
  business?: string | null;
  business_id?: string | null;
  stage?: string | null;
  visual?: string | null;
  why_behind_now?: string | null;
  blocker?: string | null;
  promote?: string | null;
  kill?: string | null;
  defer?: string | null;
  id?: string | null;
  closed?: boolean;
  active?: boolean;
};

export type FunnelRecord = {
  id?: string | null;
  name: string;
  business_id?: string | null;
  originated?: boolean;
  passed_first_filter?: boolean;
  passed_second_filter?: boolean;
  active?: boolean;
  waiting?: boolean;
  rejected_or_closed?: boolean;
  stage_reached?: string | null;
  blocker?: string | null;
  permanence?: string | null;
  evidence_missing?: string | null;
  source?: string | null;
};

export type FounderAction = {
  action: string;
  recommendation?: string | null;
  evidence?: string | null;
  deadline?: string | null;
  economic_consequence?: string | null;
  consequence_of_doing_nothing?: string | null;
  what_j_resumes_afterward?: string | null;
};

export type Obligation = {
  item: string;
  kind?: string | null;
  detail?: string | null;
  stale?: boolean;
  business_id?: string | null;
};

export type ChangedItem = {
  when?: string | null;
  kind?: string | null;
  title?: string | null;
  detail?: string | null;
  business_id?: string | null;
};

export type LearningItem = {
  id?: string | null;
  expected?: string | null;
  observed?: string | null;
  economic_consequence?: string | null;
  learning?: string | null;
  resulting_decision_change?: string | null;
};

export type FounderOperatingPicture = {
  schema_version: typeof FOUNDER_OPERATING_PICTURE_SCHEMA | string;
  generated_at: string;
  read_only: boolean;
  mutates: boolean;
  authority_effect?: string;
  durable_fingerprint?: string;
  business_isolation?: boolean;
  host_agnostic?: boolean;
  business_scopes?: BusinessScope[];
  economic_outlook: Record<string, unknown> & {
    AUTHORIZED_CAPITAL_USD?: EconValue;
    CASH_AVAILABLE_USD?: EconValue;
    CASH_COMMITTED_USD?: EconValue;
    CASH_SPENT_USD?: EconValue;
    SETTLED_REVENUE_USD?: EconValue;
    PENDING_REVENUE_USD?: EconValue;
    SETTLED_PROFIT_USD?: EconValue;
    conflicts?: string[];
    outlook_truth?: {
      proven?: string[];
      inferred?: string[];
      unknown?: string[];
    };
    buckparts?: Record<string, unknown>;
    material_current_economic_exposure?: Array<Record<string, unknown>>;
    current_revenue_producing_paths?: Array<Record<string, unknown>>;
    next_event_that_could_change_economics?: string;
    envelope_state?: string;
    model_research_cost_usd?: EconValue;
    source_freshness?: Record<string, unknown>;
  };
  now: Record<string, unknown> & {
    identity?: string;
    business?: string;
    state?: string;
    founder_action_required?: boolean;
    empty_slot?: boolean;
  };
  next_queue: QueueItem[];
  funnel: {
    semantics?: string;
    counts?: Record<string, number>;
    records?: FunnelRecord[];
    stuck_after_first_filter?: FunnelRecord[];
  };
  open_obligations: Obligation[];
  needs_jared: FounderAction[];
  needs_jared_empty?: boolean;
  what_changed: ChangedItem[];
  results_learning: LearningItem[];
  if_jared_disappears_24h: Record<string, unknown>;
  freshness?: {
    generated_at?: string;
    amazon_stale?: boolean;
    gsc_stale?: boolean;
    gsc_unsettled_warning?: string;
  };
};
