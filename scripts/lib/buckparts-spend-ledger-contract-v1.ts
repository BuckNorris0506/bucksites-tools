import { randomUUID } from "node:crypto";
import { readFileSync, writeFileSync } from "node:fs";
import path from "node:path";

export const SPEND_LEDGER_FILE_RELATIVE_V1 = "data/ops/spend-ledger-v1.json" as const;
export const SPEND_LEDGER_INNER_CONTRACT_V1 = "buckparts_spend_ledger_v1" as const;
export const SPEND_LEDGER_APPEND_CONTRACT_V1 = "buckparts_spend_ledger_append_v1" as const;

export const SPEND_LEDGER_PROVIDERS_V1 = [
  "openai",
  "cursor",
  "netlify",
  "github_actions",
  "local",
] as const;

export const SPEND_LEDGER_UNIT_TYPES_V1 = [
  "codex_message",
  "api_tokens",
  "api_cost_usd",
  "cursor_spend_cents",
  "netlify_credits",
  "gha_minutes",
  "local_build",
  "local_validation_run",
  "manual_dashboard_snapshot",
] as const;

export const SPEND_LEDGER_AMOUNT_UNITS_V1 = [
  "messages",
  "tokens",
  "usd",
  "cents",
  "credits",
  "minutes",
  "count",
] as const;

export const SPEND_LEDGER_OUTCOMES_V1 = [
  "success",
  "fail",
  "partial",
  "aborted",
  "informational",
] as const;

export type SpendLedgerProviderV1 = (typeof SPEND_LEDGER_PROVIDERS_V1)[number];
export type SpendLedgerUnitTypeV1 = (typeof SPEND_LEDGER_UNIT_TYPES_V1)[number];
export type SpendLedgerAmountUnitV1 = (typeof SPEND_LEDGER_AMOUNT_UNITS_V1)[number];
export type SpendLedgerOutcomeV1 = (typeof SPEND_LEDGER_OUTCOMES_V1)[number];

export type SpendLedgerEntryV1 = {
  id: string;
  recorded_at: string;
  provider: SpendLedgerProviderV1;
  unit_type: SpendLedgerUnitTypeV1;
  amount: number;
  amount_unit: SpendLedgerAmountUnitV1;
  exact_cost_proven: boolean;
  estimated_cost_usd: number | null;
  source_surface: string;
  task_id: string | null;
  session_id: string | null;
  related_commit: string | null;
  related_branch: string | null;
  purpose: string;
  outcome: SpendLedgerOutcomeV1;
  useful_output: boolean;
  deploy_triggered: boolean;
  mutation_triggered: boolean;
  proven_facts: string[];
  unknown_facts: string[];
  notes: string | null;
};

export type SpendLedgerFileV1 = {
  contract: typeof SPEND_LEDGER_INNER_CONTRACT_V1;
  read_only: boolean;
  data_mutation: boolean;
  updated_at: string;
  entries: SpendLedgerEntryV1[];
};

export type SpendLedgerAppendSummaryV1 = {
  contract: typeof SPEND_LEDGER_APPEND_CONTRACT_V1;
  status: "APPENDED";
  ledger_path: string;
  entry_id: string;
  provider: SpendLedgerProviderV1;
  unit_type: SpendLedgerUnitTypeV1;
  amount: number;
  exact_cost_proven: boolean;
};

const VAGUE_SOURCE_SURFACES = new Set([
  "",
  "manual",
  "unknown",
  "n/a",
  "na",
  "tbd",
  "dashboard",
  "api",
  "vendor",
  "netlify",
  "openai",
  "cursor",
]);

function isPlainObject(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}

function isNonEmptyString(v: unknown): v is string {
  return typeof v === "string" && v.trim().length > 0;
}

function includesLiteral<T extends string>(values: readonly T[], value: string): value is T {
  return (values as readonly string[]).includes(value);
}

/** PROVEN: rejects empty/generic source_surface labels when exact_cost_proven is required. */
export function isVagueSourceSurfaceV1(sourceSurface: string): boolean {
  const trimmed = sourceSurface.trim();
  const lower = trimmed.toLowerCase();
  if (VAGUE_SOURCE_SURFACES.has(lower)) return true;
  if (trimmed.length < 8) return true;
  if (lower.startsWith("manual") && !trimmed.includes(":")) return true;
  return false;
}

function normalizeStringArray(field: string, raw: unknown, errors: string[]): string[] {
  if (raw === undefined) {
    errors.push(`${field} is required.`);
    return [];
  }
  if (!Array.isArray(raw)) {
    errors.push(`${field} must be an array.`);
    return [];
  }
  const out: string[] = [];
  raw.forEach((item, index) => {
    if (typeof item !== "string") {
      errors.push(`${field}[${index}] must be a string.`);
      return;
    }
    out.push(item);
  });
  return out;
}

function normalizeNullableString(field: string, raw: unknown, errors: string[]): string | null {
  if (raw === undefined || raw === null) return null;
  if (typeof raw !== "string") {
    errors.push(`${field} must be a string or null.`);
    return null;
  }
  const trimmed = raw.trim();
  return trimmed.length > 0 ? trimmed : null;
}

export function validateSpendLedgerEntryInputV1(
  raw: unknown,
): { ok: true; entry: SpendLedgerEntryV1 } | { ok: false; errors: string[] } {
  const errors: string[] = [];
  if (!isPlainObject(raw)) {
    return { ok: false, errors: ["Entry must be a JSON object."] };
  }

  if (!includesLiteral(SPEND_LEDGER_PROVIDERS_V1, String(raw.provider ?? ""))) {
    errors.push(`provider must be one of: ${SPEND_LEDGER_PROVIDERS_V1.join(", ")}.`);
  }
  if (!includesLiteral(SPEND_LEDGER_UNIT_TYPES_V1, String(raw.unit_type ?? ""))) {
    errors.push(`unit_type must be one of: ${SPEND_LEDGER_UNIT_TYPES_V1.join(", ")}.`);
  }
  if (!includesLiteral(SPEND_LEDGER_AMOUNT_UNITS_V1, String(raw.amount_unit ?? ""))) {
    errors.push(`amount_unit must be one of: ${SPEND_LEDGER_AMOUNT_UNITS_V1.join(", ")}.`);
  }
  if (!includesLiteral(SPEND_LEDGER_OUTCOMES_V1, String(raw.outcome ?? ""))) {
    errors.push(`outcome must be one of: ${SPEND_LEDGER_OUTCOMES_V1.join(", ")}.`);
  }

  if (typeof raw.amount !== "number" || !Number.isFinite(raw.amount) || raw.amount < 0) {
    errors.push("amount must be a finite number >= 0.");
  }

  if (typeof raw.exact_cost_proven !== "boolean") {
    errors.push("exact_cost_proven must be a boolean.");
  }

  if (!isNonEmptyString(raw.source_surface)) {
    errors.push("source_surface must be a non-empty string.");
  }
  if (!isNonEmptyString(raw.purpose)) {
    errors.push("purpose must be a non-empty string.");
  }

  for (const flag of ["useful_output", "deploy_triggered", "mutation_triggered"] as const) {
    if (typeof raw[flag] !== "boolean") {
      errors.push(`${flag} must be a boolean.`);
    }
  }

  const proven_facts = normalizeStringArray("proven_facts", raw.proven_facts, errors);
  const unknown_facts = normalizeStringArray("unknown_facts", raw.unknown_facts, errors);

  let estimated_cost_usd: number | null = null;
  if (raw.estimated_cost_usd !== undefined && raw.estimated_cost_usd !== null) {
    if (typeof raw.estimated_cost_usd !== "number" || !Number.isFinite(raw.estimated_cost_usd)) {
      errors.push("estimated_cost_usd must be a finite number or null.");
    } else {
      estimated_cost_usd = raw.estimated_cost_usd;
    }
  }

  const source_surface = typeof raw.source_surface === "string" ? raw.source_surface.trim() : "";
  const exact_cost_proven = raw.exact_cost_proven === true;

  if (exact_cost_proven) {
    const nonEmptyProof = proven_facts.filter((line) => line.trim().length > 0);
    if (nonEmptyProof.length === 0) {
      errors.push(
        "exact_cost_proven=true requires at least one non-empty proven_facts line with vendor or operator proof.",
      );
    }
    if (isVagueSourceSurfaceV1(source_surface)) {
      errors.push(
        "exact_cost_proven=true requires a specific source_surface (e.g. manual:netlify-dashboard, openai:usage-export:2026-05-18).",
      );
    }
  }

  if (errors.length > 0) {
    return { ok: false, errors };
  }

  const id =
    typeof raw.id === "string" && raw.id.trim().length > 0 ? raw.id.trim() : randomUUID();
  const recorded_at =
    typeof raw.recorded_at === "string" && raw.recorded_at.trim().length > 0
      ? raw.recorded_at.trim()
      : new Date().toISOString();

  const entry: SpendLedgerEntryV1 = {
    id,
    recorded_at,
    provider: raw.provider as SpendLedgerProviderV1,
    unit_type: raw.unit_type as SpendLedgerUnitTypeV1,
    amount: raw.amount as number,
    amount_unit: raw.amount_unit as SpendLedgerAmountUnitV1,
    exact_cost_proven,
    estimated_cost_usd,
    source_surface,
    task_id: normalizeNullableString("task_id", raw.task_id, errors),
    session_id: normalizeNullableString("session_id", raw.session_id, errors),
    related_commit: normalizeNullableString("related_commit", raw.related_commit, errors),
    related_branch: normalizeNullableString("related_branch", raw.related_branch, errors),
    purpose: (raw.purpose as string).trim(),
    outcome: raw.outcome as SpendLedgerOutcomeV1,
    useful_output: raw.useful_output as boolean,
    deploy_triggered: raw.deploy_triggered as boolean,
    mutation_triggered: raw.mutation_triggered as boolean,
    proven_facts,
    unknown_facts,
    notes: normalizeNullableString("notes", raw.notes, errors),
  };

  if (errors.length > 0) {
    return { ok: false, errors };
  }

  return { ok: true, entry };
}

export function parseSpendLedgerFileV1(raw: unknown): { ok: true; ledger: SpendLedgerFileV1 } | { ok: false; errors: string[] } {
  if (!isPlainObject(raw)) {
    return { ok: false, errors: ["Ledger file must be a JSON object."] };
  }
  const errors: string[] = [];
  if (raw.contract !== SPEND_LEDGER_INNER_CONTRACT_V1) {
    errors.push(`contract must be "${SPEND_LEDGER_INNER_CONTRACT_V1}".`);
  }
  if (typeof raw.read_only !== "boolean") {
    errors.push("read_only must be a boolean.");
  }
  if (typeof raw.data_mutation !== "boolean") {
    errors.push("data_mutation must be a boolean.");
  }
  if (!isNonEmptyString(raw.updated_at)) {
    errors.push("updated_at must be a non-empty ISO timestamp string.");
  }
  if (!Array.isArray(raw.entries)) {
    errors.push("entries must be an array.");
  }
  if (errors.length > 0) {
    return { ok: false, errors };
  }

  const entries: SpendLedgerEntryV1[] = [];
  const rawEntries = raw.entries as unknown[];
  for (let index = 0; index < rawEntries.length; index += 1) {
    const validated = validateSpendLedgerEntryInputV1(rawEntries[index]);
    if (!validated.ok) {
      return {
        ok: false,
        errors: validated.errors.map((e) => `entries[${index}]: ${e}`),
      };
    }
    entries.push(validated.entry);
  }

  return {
    ok: true,
    ledger: {
      contract: SPEND_LEDGER_INNER_CONTRACT_V1,
      read_only: raw.read_only as boolean,
      data_mutation: raw.data_mutation as boolean,
      updated_at: (raw.updated_at as string).trim(),
      entries,
    },
  };
}

export function appendSpendLedgerEntryV1(input: {
  rootDir: string;
  entryInput: unknown;
  readFile?: typeof readFileSync;
  writeFile?: typeof writeFileSync;
  nowIso?: string;
}): { ok: true; summary: SpendLedgerAppendSummaryV1 } | { ok: false; errors: string[] } {
  const readFile = input.readFile ?? readFileSync;
  const writeFile = input.writeFile ?? writeFileSync;
  const ledgerPath = path.join(input.rootDir, ...SPEND_LEDGER_FILE_RELATIVE_V1.split("/"));

  const validatedEntry = validateSpendLedgerEntryInputV1(input.entryInput);
  if (!validatedEntry.ok) {
    return validatedEntry;
  }

  let parsed: ReturnType<typeof parseSpendLedgerFileV1>;
  try {
    const text = readFile(ledgerPath, "utf8");
    parsed = parseSpendLedgerFileV1(JSON.parse(text) as unknown);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return { ok: false, errors: [`Failed to read ledger: ${message}`] };
  }

  if (!parsed.ok) {
    return parsed;
  }

  const priorCount = parsed.ledger.entries.length;
  const nextLedger: SpendLedgerFileV1 = {
    ...parsed.ledger,
    updated_at: input.nowIso ?? new Date().toISOString(),
    entries: [...parsed.ledger.entries, validatedEntry.entry],
  };

  if (nextLedger.entries.length !== priorCount + 1) {
    return { ok: false, errors: ["Append would not preserve prior entries."] };
  }

  writeFile(ledgerPath, `${JSON.stringify(nextLedger, null, 2)}\n`, "utf8");

  return {
    ok: true,
    summary: {
      contract: SPEND_LEDGER_APPEND_CONTRACT_V1,
      status: "APPENDED",
      ledger_path: SPEND_LEDGER_FILE_RELATIVE_V1,
      entry_id: validatedEntry.entry.id,
      provider: validatedEntry.entry.provider,
      unit_type: validatedEntry.entry.unit_type,
      amount: validatedEntry.entry.amount,
      exact_cost_proven: validatedEntry.entry.exact_cost_proven,
    },
  };
}
