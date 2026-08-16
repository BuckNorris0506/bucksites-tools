/**
 * Shared exact-command eligibility for Executive organs.
 * Does not catalog commands as work. Does not dispatch. Does not mutate.
 */

import { existsSync, readFileSync } from "node:fs";
import path from "node:path";

import {
  lookupDispatchAllowlistEntryV1,
  type DispatchAllowlistEntryV1,
} from "./buckparts-command-center-dispatch-allowlist-v1";

export const EXECUTIVE_COMMAND_ELIGIBILITY_DANGEROUS_NEEDLES_V1 = [
  "--apply",
  "git commit",
  "git push",
  "supabase db",
  "psql",
  "curl -X POST",
  "curl -X PATCH",
  "curl -X DELETE",
  "retailer_links.csv",
  "data/air-purifier/retailer_links.csv",
] as const;

export type EpistemicTagV1 = "PROVEN" | "INFERRED" | "UNKNOWN";

export type ExecutiveCommandFounderGateV1 =
  | "not_required_for_read_only_dispatch"
  | "owner_review_required_dispatch_refused"
  | "founder_explicit_apply_required"
  | "dispatch_allowlist_required_for_executive_execution"
  | "not_applicable_no_exact_command";

export type ExactCommandEligibilityV1 = {
  eligibility: boolean;
  ineligible_reason: string | null;
  founder_gate: ExecutiveCommandFounderGateV1;
  evidence_used: string[];
  eligibility_epistemic: EpistemicTagV1;
};

function isPlainObject(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}

export function loadPackageScriptsV1(rootDir: string): Record<string, string> {
  const pkgPath = path.join(rootDir, "package.json");
  if (!existsSync(pkgPath)) return {};
  try {
    const parsed = JSON.parse(readFileSync(pkgPath, "utf8")) as { scripts?: unknown };
    if (!isPlainObject(parsed.scripts)) return {};
    const out: Record<string, string> = {};
    for (const [key, value] of Object.entries(parsed.scripts)) {
      if (typeof value === "string") out[key] = value;
    }
    return out;
  } catch {
    return {};
  }
}

function dangerousNeedlesV1(exact: string): string[] {
  return EXECUTIVE_COMMAND_ELIGIBILITY_DANGEROUS_NEEDLES_V1.filter((n) => exact.includes(n));
}

function npmRunScriptNameV1(exact: string): string | null {
  const m = exact.trim().match(/^npm run ([^\s]+)/);
  return m ? m[1] : null;
}

function tsEntrypointFromCommandV1(exact: string): string | null {
  const m = exact.match(/(?:npx tsx|node --import tsx)\s+(\S+\.ts)/);
  return m ? m[1] : null;
}

function referencedPlanPathsV1(exact: string): string[] {
  const out: string[] = [];
  const re = /--plan(?:-file)?\s+(\S+)/g;
  let match: RegExpExecArray | null;
  while ((match = re.exec(exact)) !== null) {
    const rel = match[1];
    if (rel.includes("<") || rel.includes(">")) continue;
    out.push(rel);
  }
  return out;
}

export function evaluateExactCommandEligibilityV1(args: {
  rootDir: string;
  exact_command: string | null;
  allowlist_entry: DispatchAllowlistEntryV1 | null;
  package_scripts: Record<string, string>;
  excluded_from_dispatch?: boolean;
}): ExactCommandEligibilityV1 {
  const evidence: string[] = [];
  const { exact_command, allowlist_entry, package_scripts, rootDir } = args;

  if (exact_command === null || exact_command.trim() === "") {
    return {
      eligibility: false,
      ineligible_reason: "no_proven_exact_command",
      founder_gate: "not_applicable_no_exact_command",
      evidence_used: ["exact_command is null; Executive cannot execute a command that is not proven"],
      eligibility_epistemic: "PROVEN",
    };
  }

  evidence.push(`exact_command=${JSON.stringify(exact_command)}`);

  if (/<[^>]+>/.test(exact_command)) {
    return {
      eligibility: false,
      ineligible_reason: "exact_command_has_unresolved_placeholder",
      founder_gate: "founder_explicit_apply_required",
      evidence_used: [...evidence, "placeholder tokens such as <plan.json> are not a runnable command"],
      eligibility_epistemic: "PROVEN",
    };
  }

  const danger = dangerousNeedlesV1(exact_command);
  if (danger.length > 0) {
    return {
      eligibility: false,
      ineligible_reason: "exact_command_contains_apply_or_mutation_needle",
      founder_gate: "founder_explicit_apply_required",
      evidence_used: [...evidence, `dispatch_runner_dangerous_needles=${JSON.stringify(danger)}`],
      eligibility_epistemic: "PROVEN",
    };
  }

  if (args.excluded_from_dispatch === true) {
    return {
      eligibility: false,
      ineligible_reason: "guarded_apply_explicitly_excluded_from_dispatch_allowlist",
      founder_gate: "founder_explicit_apply_required",
      evidence_used: [...evidence, "command is explicitly excluded from DISPATCH_ALLOWLIST_ENTRIES_V1"],
      eligibility_epistemic: "PROVEN",
    };
  }

  if (!allowlist_entry) {
    return {
      eligibility: false,
      ineligible_reason: "exact_command_not_on_dispatch_allowlist",
      founder_gate: "dispatch_allowlist_required_for_executive_execution",
      evidence_used: [
        ...evidence,
        "lookupDispatchAllowlistEntryV1 returned null",
        "Executive dispatch runner only executes DISPATCH_ALLOWLIST_ENTRIES_V1 exact_command values",
      ],
      eligibility_epistemic: "PROVEN",
    };
  }

  evidence.push(
    `allowlist.selected_subsystem=${allowlist_entry.selected_subsystem}`,
    `allowlist.command_kind=${allowlist_entry.command_kind}`,
    `allowlist.owner_review_required=${String(allowlist_entry.owner_review_required)}`,
    `allowlist.mutation_allowed=${String(allowlist_entry.mutation_posture.mutation_allowed)}`,
  );

  if (allowlist_entry.owner_review_required === true) {
    return {
      eligibility: false,
      ineligible_reason: "dispatch_runner_refuses_owner_review_required",
      founder_gate: "owner_review_required_dispatch_refused",
      evidence_used: [
        ...evidence,
        "scripts/lib/buckparts-command-center-dispatch-runner-v1.ts refuses owner_review_required=true subprocesses",
      ],
      eligibility_epistemic: "PROVEN",
    };
  }

  if (allowlist_entry.mutation_posture.mutation_allowed !== false) {
    return {
      eligibility: false,
      ineligible_reason: "allowlist_mutation_allowed_not_false",
      founder_gate: "founder_explicit_apply_required",
      evidence_used: [...evidence],
      eligibility_epistemic: "PROVEN",
    };
  }

  const tsEntry = tsEntrypointFromCommandV1(exact_command);
  if (tsEntry) {
    const abs = path.join(rootDir, tsEntry);
    evidence.push(`entrypoint=${tsEntry} exists=${String(existsSync(abs))}`);
    if (!existsSync(abs)) {
      return {
        eligibility: false,
        ineligible_reason: "entrypoint_missing",
        founder_gate: "not_required_for_read_only_dispatch",
        evidence_used: evidence,
        eligibility_epistemic: "PROVEN",
      };
    }
  }

  const npmName = npmRunScriptNameV1(exact_command);
  if (npmName) {
    const scriptBody = package_scripts[npmName];
    evidence.push(
      `package.json scripts[${JSON.stringify(npmName)}] ${scriptBody ? "present" : "missing"}`,
    );
    if (!scriptBody) {
      return {
        eligibility: false,
        ineligible_reason: "entrypoint_missing",
        founder_gate: "not_required_for_read_only_dispatch",
        evidence_used: evidence,
        eligibility_epistemic: "PROVEN",
      };
    }
    const fromBody = scriptBody.match(/(?:npx tsx|tsx|node --import tsx)\s+(\S+\.ts)/);
    if (fromBody) {
      const abs = path.join(rootDir, fromBody[1]);
      evidence.push(`npm_script_entrypoint=${fromBody[1]} exists=${String(existsSync(abs))}`);
      if (!existsSync(abs)) {
        return {
          eligibility: false,
          ineligible_reason: "entrypoint_missing",
          founder_gate: "not_required_for_read_only_dispatch",
          evidence_used: evidence,
          eligibility_epistemic: "PROVEN",
        };
      }
    }
  }

  for (const rel of referencedPlanPathsV1(exact_command)) {
    const abs = path.join(rootDir, rel);
    evidence.push(`referenced_plan=${rel} exists=${String(existsSync(abs))}`);
    if (!existsSync(abs)) {
      return {
        eligibility: false,
        ineligible_reason: "required_plan_file_missing",
        founder_gate: "not_required_for_read_only_dispatch",
        evidence_used: evidence,
        eligibility_epistemic: "PROVEN",
      };
    }
  }

  return {
    eligibility: true,
    ineligible_reason: null,
    founder_gate: "not_required_for_read_only_dispatch",
    evidence_used: [
      ...evidence,
      "eligible_for_dispatch_runner_subprocess: allowlisted, owner_review_required=false, mutation_allowed=false, no mutation needles, entrypoint present",
    ],
    eligibility_epistemic: "PROVEN",
  };
}

export function bindWorkExactCommandV1(args: {
  rootDir: string;
  exact_command: string | null;
  package_scripts: Record<string, string>;
  excluded_from_dispatch?: boolean;
}): ExactCommandEligibilityV1 {
  const allowlist_entry =
    args.exact_command !== null ? lookupDispatchAllowlistEntryV1(args.exact_command) : null;
  return evaluateExactCommandEligibilityV1({
    rootDir: args.rootDir,
    exact_command: args.exact_command,
    allowlist_entry,
    package_scripts: args.package_scripts,
    excluded_from_dispatch: args.excluded_from_dispatch,
  });
}
