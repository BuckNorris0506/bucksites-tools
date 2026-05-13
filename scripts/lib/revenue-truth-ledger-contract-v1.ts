import path from "node:path";

import type { RevenueTruthLedgerContractV1 } from "./buckparts-command-center-v2-types";

export const REVENUE_LEDGER_FILE_RELATIVE_V1 = "data/ops/revenue-ledger-v1.json" as const;

const INNER_CONTRACT = "revenue_ledger_v1" as const;
const INVALID_SAMPLE_CAP = 5;

function isPlainObject(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}

function isNonEmptyString(v: unknown): v is string {
  return typeof v === "string" && v.trim().length > 0;
}

function validateEntry(raw: unknown, index: number): { ok: true; amount_usd: number } | { ok: false; reasons: string[] } {
  if (!isPlainObject(raw)) return { ok: false, reasons: [`entries[${index}] is not an object.`] };
  const reasons: string[] = [];
  if (!isNonEmptyString(raw.id)) reasons.push(`entries[${index}].id must be a non-empty string.`);
  if (!isNonEmptyString(raw.recorded_at)) reasons.push(`entries[${index}].recorded_at must be a non-empty string.`);
  if ("amount_usd" in raw && raw.amount_usd !== undefined && raw.amount_usd !== null) {
    if (typeof raw.amount_usd !== "number" || !Number.isFinite(raw.amount_usd) || raw.amount_usd < 0) {
      reasons.push(`entries[${index}].amount_usd must be a finite number >= 0 when set.`);
    }
  }
  if (reasons.length > 0) return { ok: false, reasons };
  const amt =
    typeof raw.amount_usd === "number" && Number.isFinite(raw.amount_usd) && raw.amount_usd >= 0 ? raw.amount_usd : 0;
  return { ok: true, amount_usd: amt };
}

/**
 * Read-only load of `data/ops/revenue-ledger-v1.json` — no Supabase, no affiliate APIs, no click_events as revenue.
 */
export function buildRevenueTruthLedgerContractV1(input: {
  rootDir: string;
  fileExists: (absolutePath: string) => boolean;
  readTextFile: (absolutePath: string) => string;
}): RevenueTruthLedgerContractV1 {
  const rel = REVENUE_LEDGER_FILE_RELATIVE_V1;
  const abs = path.join(input.rootDir, ...rel.split("/"));

  const baseProven: string[] = [
    "revenue_truth_ledger_contract_v1 is read-only — it does not mutate Supabase, retailer_links, or click_events.",
    "Ledger rows are not derived from click_events; outbound clicks remain non-revenue operational signals.",
  ];

  if (!input.rootDir || input.rootDir.trim() === "") {
    return {
      contract: "revenue_truth_ledger_contract_v1",
      runtime_status: "UNKNOWN_INPUT",
      ledger_file_relative_path: rel,
      ledger_inner_contract: null,
      coverage_status: "UNKNOWN",
      valid_entry_count: 0,
      invalid_entry_count: 0,
      entries_evaluated_count: 0,
      total_reported_gross_usd: 0,
      invalid_entry_samples: [],
      proven_facts: baseProven,
      unknown_facts: ["rootDir was empty — cannot load revenue ledger JSON."],
      owner_approval_required: false,
      data_mutation: false,
      read_only: true,
    };
  }

  if (!input.fileExists(abs)) {
    return {
      contract: "revenue_truth_ledger_contract_v1",
      runtime_status: "MISSING_FILE",
      ledger_file_relative_path: rel,
      ledger_inner_contract: null,
      coverage_status: "UNKNOWN",
      valid_entry_count: 0,
      invalid_entry_count: 0,
      entries_evaluated_count: 0,
      total_reported_gross_usd: 0,
      invalid_entry_samples: [],
      proven_facts: baseProven,
      unknown_facts: [`Ledger file missing at ${rel} (resolved under repo root).`],
      owner_approval_required: false,
      data_mutation: false,
      read_only: true,
    };
  }

  let text: string;
  try {
    text = input.readTextFile(abs);
  } catch (e) {
    return {
      contract: "revenue_truth_ledger_contract_v1",
      runtime_status: "IO_ERROR",
      ledger_file_relative_path: rel,
      ledger_inner_contract: null,
      coverage_status: "BLOCKED",
      valid_entry_count: 0,
      invalid_entry_count: 0,
      entries_evaluated_count: 0,
      total_reported_gross_usd: "UNKNOWN",
      invalid_entry_samples: [],
      proven_facts: baseProven,
      unknown_facts: [`readTextFile failed for ${rel}: ${e instanceof Error ? e.message : String(e)}`],
      owner_approval_required: false,
      data_mutation: false,
      read_only: true,
    };
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(text) as unknown;
  } catch (e) {
    return {
      contract: "revenue_truth_ledger_contract_v1",
      runtime_status: "INVALID_JSON",
      ledger_file_relative_path: rel,
      ledger_inner_contract: null,
      coverage_status: "UNKNOWN",
      valid_entry_count: 0,
      invalid_entry_count: 0,
      entries_evaluated_count: 0,
      total_reported_gross_usd: "UNKNOWN",
      invalid_entry_samples: [],
      proven_facts: baseProven,
      unknown_facts: [`JSON.parse failed for ${rel}: ${e instanceof Error ? e.message : String(e)}`],
      owner_approval_required: false,
      data_mutation: false,
      read_only: true,
    };
  }

  if (!isPlainObject(parsed)) {
    return {
      contract: "revenue_truth_ledger_contract_v1",
      runtime_status: "INVALID_SCHEMA",
      ledger_file_relative_path: rel,
      ledger_inner_contract: null,
      coverage_status: "PARTIAL",
      valid_entry_count: 0,
      invalid_entry_count: 0,
      entries_evaluated_count: 0,
      total_reported_gross_usd: "UNKNOWN",
      invalid_entry_samples: [{ index: -1, reasons: ["Root JSON value is not an object."] }],
      proven_facts: baseProven,
      unknown_facts: ["Ledger root must be a JSON object."],
      owner_approval_required: false,
      data_mutation: false,
      read_only: true,
    };
  }

  const inner = parsed.contract;
  if (inner !== INNER_CONTRACT) {
    return {
      contract: "revenue_truth_ledger_contract_v1",
      runtime_status: "INVALID_SCHEMA",
      ledger_file_relative_path: rel,
      ledger_inner_contract: typeof inner === "string" ? inner : null,
      coverage_status: "PARTIAL",
      valid_entry_count: 0,
      invalid_entry_count: 0,
      entries_evaluated_count: 0,
      total_reported_gross_usd: "UNKNOWN",
      invalid_entry_samples: [],
      proven_facts: baseProven,
      unknown_facts: [
        `Expected ledger file contract field "${INNER_CONTRACT}", got ${inner === undefined || inner === null ? "missing" : JSON.stringify(inner)}.`,
      ],
      owner_approval_required: false,
      data_mutation: false,
      read_only: true,
    };
  }

  const entriesRaw = parsed.entries;
  if (!Array.isArray(entriesRaw)) {
    return {
      contract: "revenue_truth_ledger_contract_v1",
      runtime_status: "INVALID_SCHEMA",
      ledger_file_relative_path: rel,
      ledger_inner_contract: INNER_CONTRACT,
      coverage_status: "PARTIAL",
      valid_entry_count: 0,
      invalid_entry_count: 0,
      entries_evaluated_count: 0,
      total_reported_gross_usd: "UNKNOWN",
      invalid_entry_samples: [{ index: -1, reasons: ["`entries` must be an array (may be empty)."] }],
      proven_facts: baseProven,
      unknown_facts: ["`entries` field missing or not an array."],
      owner_approval_required: false,
      data_mutation: false,
      read_only: true,
    };
  }

  let valid = 0;
  let invalid = 0;
  let sum = 0;
  const invalid_entry_samples: RevenueTruthLedgerContractV1["invalid_entry_samples"] = [];

  for (let i = 0; i < entriesRaw.length; i++) {
    const row = entriesRaw[i];
    const res = validateEntry(row, i);
    if (res.ok) {
      valid += 1;
      sum += res.amount_usd;
    } else {
      invalid += 1;
      if (invalid_entry_samples.length < INVALID_SAMPLE_CAP) {
        invalid_entry_samples.push({ index: i, reasons: res.reasons });
      }
    }
  }

  const runtime_status: RevenueTruthLedgerContractV1["runtime_status"] = invalid > 0 ? "PARTIAL_VALIDATION" : "OK";
  const coverage_status: RevenueTruthLedgerContractV1["coverage_status"] =
    invalid > 0 ? "PARTIAL" : ("PROVEN" as const);

  const proven_facts = [
    ...baseProven,
    `Ledger file ${rel} loaded with inner contract ${INNER_CONTRACT}; entries evaluated=${entriesRaw.length}, valid=${valid}, invalid=${invalid}.`,
    "Zero valid entries still satisfies the ledger input contract — it does not prove business revenue, only that the structured import path exists.",
  ];
  const unknown_facts: string[] = [];
  if (invalid > 0) {
    unknown_facts.push(`${invalid} ledger row(s) failed validation — see invalid_entry_samples (capped).`);
  }

  return {
    contract: "revenue_truth_ledger_contract_v1",
    runtime_status,
    ledger_file_relative_path: rel,
    ledger_inner_contract: INNER_CONTRACT,
    coverage_status,
    valid_entry_count: valid,
    invalid_entry_count: invalid,
    entries_evaluated_count: entriesRaw.length,
    total_reported_gross_usd: invalid > 0 ? "UNKNOWN" : sum,
    invalid_entry_samples,
    proven_facts,
    unknown_facts,
    owner_approval_required: false,
    data_mutation: false,
    read_only: true,
  };
}
