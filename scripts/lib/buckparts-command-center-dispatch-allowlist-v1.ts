/**
 * Explicit allowlist metadata for Command Center dispatch.
 * Metadata is the authority for owner_review_required / no_artifact / mutation posture.
 * Regex inference must not authorize execution.
 */

export type DispatchCommandKindV1 =
  | "read_only_report"
  | "owner_review"
  | "build_or_lint"
  | "parity_plan";

export type DispatchAllowlistEntryV1 = {
  exact_command: string;
  selected_subsystem: string;
  command_kind: DispatchCommandKindV1;
  owner_review_required: boolean;
  artifact_write_behavior: "required" | "optional" | "forbidden_with_no_artifact";
  no_artifact_allowed: boolean;
  mutation_posture: {
    read_only: true;
    data_mutation: false;
    mutation_allowed: false;
  };
};

const MUTATION_POSTURE = {
  read_only: true as const,
  data_mutation: false as const,
  mutation_allowed: false as const,
};

/** Real hyphenated GE owner-review command (production). */
export const GE_OWNER_REVIEW_EXACT_COMMAND_V1 =
  "npm run buckparts:fridge-model-pdp-ge-mwfp-xwfe-retailer-links-supabase-sync-owner-review -- --write-artifacts" as const;

/** Real AP demand-selected owner-review command (production). */
export const AP_OWNER_REVIEW_EXACT_COMMAND_V1 =
  "npx tsx scripts/report-air-purifier-demand-selected-batch-owner-review-v1.ts" as const;

/**
 * Proven fridge manufacturer-proof collector (flagless orchestrator refresh).
 * Read-only capture + owner-review bridge; never apply / never PASS_BROWSER_PROOF.
 */
export const BROWSER_PROOF_COLLECTOR_ALLOWLIST_COMMAND_V1 =
  "npm run buckparts:browser-proof-collector" as const;

/** Guarded mutation executor. It must never be dispatch-allowlisted. */
export const BUCKPARTS_RETAILER_LINK_PARITY_GUARDED_APPLY_WRITE_COMMAND_V1 =
  "BUCKPARTS_IO_CAPABILITY=MUTATION npx tsx scripts/lib/buckparts-retailer-link-parity-guarded-apply-v1.ts --write --plan-file <plan.json>" as const;

export const DISPATCH_ALLOWLIST_ENTRIES_V1: readonly DispatchAllowlistEntryV1[] = [
  {
    exact_command: "npm run buckparts:retailer-link-parity-correction",
    selected_subsystem: "retailer_link_parity:detect",
    command_kind: "read_only_report",
    owner_review_required: false,
    artifact_write_behavior: "optional",
    no_artifact_allowed: true,
    mutation_posture: MUTATION_POSTURE,
  },
  {
    exact_command: "npm run buckparts:retailer-link-parity-correction -- --plan-dry-run",
    selected_subsystem: "retailer_link_parity:plan_dry_run",
    command_kind: "parity_plan",
    owner_review_required: false,
    artifact_write_behavior: "optional",
    no_artifact_allowed: true,
    mutation_posture: MUTATION_POSTURE,
  },
  {
    exact_command: "npm run buckparts:retailer-link-parity-correction -- --owner-review",
    selected_subsystem: "retailer_link_parity:owner_review",
    command_kind: "owner_review",
    owner_review_required: true,
    artifact_write_behavior: "optional",
    no_artifact_allowed: true,
    mutation_posture: MUTATION_POSTURE,
  },
  {
    exact_command:
      "npx tsx scripts/apply-air-purifier-supabase-parity-v1.ts --plan data/air-purifier/batch-production/apply-plans-batch-v2/ap-apply-plan-batch-v2.json",
    selected_subsystem: "parity:ap_supabase_plan",
    command_kind: "parity_plan",
    owner_review_required: false,
    artifact_write_behavior: "required",
    no_artifact_allowed: false,
    mutation_posture: MUTATION_POSTURE,
  },
  {
    exact_command: "npx tsx scripts/report-buckparts-command-center.ts",
    selected_subsystem: "report:command_center",
    command_kind: "read_only_report",
    owner_review_required: false,
    artifact_write_behavior: "required",
    no_artifact_allowed: false,
    mutation_posture: MUTATION_POSTURE,
  },
  {
    exact_command: "npx tsx scripts/report-buckparts-demand-to-coverage-next-lane.ts",
    selected_subsystem: "steering:demand_to_coverage",
    command_kind: "read_only_report",
    owner_review_required: false,
    artifact_write_behavior: "optional",
    no_artifact_allowed: true,
    mutation_posture: MUTATION_POSTURE,
  },
  {
    exact_command: AP_OWNER_REVIEW_EXACT_COMMAND_V1,
    selected_subsystem: "owner_review:ap_demand_selected",
    command_kind: "owner_review",
    owner_review_required: true,
    artifact_write_behavior: "optional",
    no_artifact_allowed: true,
    mutation_posture: MUTATION_POSTURE,
  },
  {
    exact_command:
      "npx tsx scripts/report-air-purifier-demand-selected-batch-closeout-readiness-proof-v1.ts",
    selected_subsystem: "proof:ap_closeout_readiness",
    command_kind: "read_only_report",
    owner_review_required: false,
    artifact_write_behavior: "optional",
    no_artifact_allowed: true,
    mutation_posture: MUTATION_POSTURE,
  },
  {
    exact_command: "npx tsx scripts/report-ap-batch-v3-run-instantiation-v1.ts",
    selected_subsystem: "batch:ap_v3_instantiation",
    command_kind: "read_only_report",
    owner_review_required: false,
    artifact_write_behavior: "required",
    no_artifact_allowed: false,
    mutation_posture: MUTATION_POSTURE,
  },
  {
    exact_command: GE_OWNER_REVIEW_EXACT_COMMAND_V1,
    selected_subsystem: "owner_review:ge_mwfp_xwfe_supabase_sync",
    command_kind: "owner_review",
    owner_review_required: true,
    artifact_write_behavior: "required",
    no_artifact_allowed: false,
    mutation_posture: MUTATION_POSTURE,
  },
  {
    exact_command: BROWSER_PROOF_COLLECTOR_ALLOWLIST_COMMAND_V1,
    selected_subsystem: "report:browser_proof_collector",
    command_kind: "read_only_report",
    owner_review_required: false,
    artifact_write_behavior: "optional",
    no_artifact_allowed: true,
    mutation_posture: MUTATION_POSTURE,
  },
  {
    exact_command: "npm run lint",
    selected_subsystem: "build:lint",
    command_kind: "build_or_lint",
    owner_review_required: false,
    artifact_write_behavior: "required",
    no_artifact_allowed: false,
    mutation_posture: MUTATION_POSTURE,
  },
  {
    exact_command: "npm run build",
    selected_subsystem: "build:next",
    command_kind: "build_or_lint",
    owner_review_required: false,
    artifact_write_behavior: "required",
    no_artifact_allowed: false,
    mutation_posture: MUTATION_POSTURE,
  },
] as const;

export const ALLOWLIST_EXACT_COMMANDS_V1 = DISPATCH_ALLOWLIST_ENTRIES_V1.map(
  (e) => e.exact_command,
) as readonly string[];

export const NO_ARTIFACT_ALLOWLIST_EXACT_COMMANDS_V1 = DISPATCH_ALLOWLIST_ENTRIES_V1.filter(
  (e) => e.no_artifact_allowed,
).map((e) => e.exact_command) as readonly string[];

export const NO_ARTIFACT_ALLOWLIST_EXCLUSION_REASONS_V1: Record<string, string> = Object.fromEntries(
  DISPATCH_ALLOWLIST_ENTRIES_V1.filter((e) => !e.no_artifact_allowed).map((e) => [
    e.exact_command,
    e.command_kind === "owner_review"
      ? "owner_review / write-artifacts lane; excluded from --no-artifact"
      : e.command_kind === "build_or_lint"
        ? "build/lint writes ignored caches; excluded from --no-artifact"
        : "not proven stdout-only for --no-artifact",
  ]),
);

export function lookupDispatchAllowlistEntryV1(
  exact_command: string,
): DispatchAllowlistEntryV1 | null {
  const cmd = exact_command.trim();
  return DISPATCH_ALLOWLIST_ENTRIES_V1.find((e) => e.exact_command === cmd) ?? null;
}

/** Canonical fields that must exactly equal allowlist metadata before execution. */
export type CanonicalAllowlistCompareFieldsV1 = {
  exact_command: string;
  selected_subsystem: string;
  owner_review_required: boolean;
  mutation_allowed: boolean;
  command_kind: string;
  artifact_write_behavior: string;
  no_artifact_allowed: boolean;
};

/**
 * Compare canonical decision fields to allowlist metadata.
 * Does not overwrite malformed canonical fields — mismatches become explicit blockers.
 */
export function validateCanonicalAllowlistEqualityV1(
  canonical: CanonicalAllowlistCompareFieldsV1,
): { ok: true; meta: DispatchAllowlistEntryV1 } | { ok: false; blockers: string[] } {
  const meta = lookupDispatchAllowlistEntryV1(canonical.exact_command);
  if (!meta) {
    return {
      ok: false,
      blockers: [
        "canonical_allowlist_mismatch:exact_command_not_allowlisted",
      ],
    };
  }
  const blockers: string[] = [];
  if (canonical.selected_subsystem !== meta.selected_subsystem) {
    blockers.push(
      `canonical_allowlist_mismatch:selected_subsystem (canonical=${JSON.stringify(canonical.selected_subsystem)} allowlist=${JSON.stringify(meta.selected_subsystem)})`,
    );
  }
  if (canonical.owner_review_required !== meta.owner_review_required) {
    blockers.push(
      `canonical_allowlist_mismatch:owner_review_required (canonical=${String(canonical.owner_review_required)} allowlist=${String(meta.owner_review_required)})`,
    );
  }
  if (canonical.mutation_allowed !== meta.mutation_posture.mutation_allowed) {
    blockers.push(
      `canonical_allowlist_mismatch:mutation_posture.mutation_allowed (canonical=${String(canonical.mutation_allowed)} allowlist=${String(meta.mutation_posture.mutation_allowed)})`,
    );
  }
  if (canonical.command_kind !== meta.command_kind) {
    blockers.push(
      `canonical_allowlist_mismatch:command_kind (canonical=${JSON.stringify(canonical.command_kind)} allowlist=${JSON.stringify(meta.command_kind)})`,
    );
  }
  if (canonical.artifact_write_behavior !== meta.artifact_write_behavior) {
    blockers.push(
      `canonical_allowlist_mismatch:artifact_write_behavior (canonical=${JSON.stringify(canonical.artifact_write_behavior)} allowlist=${JSON.stringify(meta.artifact_write_behavior)})`,
    );
  }
  if (canonical.no_artifact_allowed !== meta.no_artifact_allowed) {
    blockers.push(
      `canonical_allowlist_mismatch:no_artifact_allowed (canonical=${String(canonical.no_artifact_allowed)} allowlist=${String(meta.no_artifact_allowed)})`,
    );
  }
  if (blockers.length > 0) return { ok: false, blockers };
  return { ok: true, meta };
}
