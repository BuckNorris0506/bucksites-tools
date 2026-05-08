import path from "node:path";

import {
  validateFridgeFormFactorEvidencePublicReady,
  type FridgeFormFactorEvidenceRecord,
} from "@/lib/fridge/fridge-form-factor-evidence";
import {
  validateRefrigeratorManualEvidencePublicReady,
  type RefrigeratorManualEvidenceRecord,
} from "@/lib/manuals/refrigerator-manual-evidence";

import type {
  EvidenceDataEvidenceBodyMappingV1,
  EvidenceDataEvidenceInventorySliceV1,
  EvidenceInventoryV1,
  EvidenceRollup,
  FridgeFormFactorEvidenceInventorySliceV1,
  RefrigeratorManualEvidenceInventorySliceV1,
} from "./buckparts-command-center-v2-types";

export type { EvidenceRollup, EvidenceInventoryV1 } from "./buckparts-command-center-v2-types";

const ROLLUP_KEY_MAX = 120;

function bump(map: Record<string, number>, rawKey: string): void {
  const key = rawKey.trim().slice(0, ROLLUP_KEY_MAX);
  if (!key) return;
  map[key] = (map[key] ?? 0) + 1;
}

function safeTopLevelString(obj: Record<string, unknown>, key: string): string | null {
  const v = obj[key];
  return typeof v === "string" && v.trim().length > 0 ? v.trim() : null;
}

function mapBodyFromObject(obj: Record<string, unknown>): {
  mapping: EvidenceDataEvidenceBodyMappingV1;
  contributesMappedRollup: boolean;
} {
  const by_scope: Record<string, number> = {};
  const by_filter_slug: Record<string, number> = {};
  const by_token: Record<string, number> = {};

  const scope = safeTopLevelString(obj, "scope");
  const token = safeTopLevelString(obj, "token");
  const filterSlug = safeTopLevelString(obj, "filter_slug");

  if (scope) bump(by_scope, scope);
  if (token) bump(by_token, token);
  if (filterSlug) bump(by_filter_slug, filterSlug.toLowerCase());

  const contributesMappedRollup = Boolean(scope || token || filterSlug);

  return {
    contributesMappedRollup,
    mapping: {
      parsed_ok_count: 0,
      parse_error_count: 0,
      mapped_count: 0,
      unmapped_count: 0,
      by_scope,
      by_filter_slug,
      by_token,
    },
  };
}

function mergeBodyMapping(
  into: EvidenceDataEvidenceBodyMappingV1,
  partial: EvidenceDataEvidenceBodyMappingV1,
  contributesMappedRollup: boolean,
  parsedOk: boolean,
  parseError: boolean,
): void {
  if (parseError) {
    into.parse_error_count += 1;
    return;
  }
  if (parsedOk) {
    into.parsed_ok_count += 1;
    if (contributesMappedRollup) into.mapped_count += 1;
    else into.unmapped_count += 1;
  }
  for (const [k, n] of Object.entries(partial.by_scope)) {
    into.by_scope[k] = (into.by_scope[k] ?? 0) + n;
  }
  for (const [k, n] of Object.entries(partial.by_filter_slug)) {
    into.by_filter_slug[k] = (into.by_filter_slug[k] ?? 0) + n;
  }
  for (const [k, n] of Object.entries(partial.by_token)) {
    into.by_token[k] = (into.by_token[k] ?? 0) + n;
  }
}

export function rollupEvidenceDirectory(args: {
  evidenceDirAbs: string;
  fileExists: (p: string) => boolean;
  readDir: (p: string) => string[];
}): EvidenceRollup {
  const empty: EvidenceRollup = {
    live_outcome_count: 0,
    unknown_outcome_count: 0,
    fail_hold_outcome_count: 0,
    unclassified_json_count: 0,
    recent_evidence_filenames: [],
  };
  if (!args.fileExists(args.evidenceDirAbs)) return empty;
  let names: string[];
  try {
    names = args.readDir(args.evidenceDirAbs).filter((n) => n.endsWith(".json"));
  } catch {
    return empty;
  }
  let live = 0;
  let unknown = 0;
  let failHold = 0;
  let unclassified = 0;
  for (const name of names) {
    const lower = name.toLowerCase();
    if (lower.includes("live-outcome")) {
      live += 1;
    } else if (lower.includes("unknown-outcome")) {
      unknown += 1;
    } else if (lower.includes("outcome") && (lower.includes("fail") || lower.includes("hold"))) {
      failHold += 1;
    } else if (lower.endsWith(".json")) {
      unclassified += 1;
    }
  }
  const recent = [...names].sort((a, b) => b.localeCompare(a)).slice(0, 15);
  return {
    live_outcome_count: live,
    unknown_outcome_count: unknown,
    fail_hold_outcome_count: failHold,
    unclassified_json_count: unclassified,
    recent_evidence_filenames: recent,
  };
}

function emptyBodyMapping(): EvidenceDataEvidenceBodyMappingV1 {
  return {
    parsed_ok_count: 0,
    parse_error_count: 0,
    mapped_count: 0,
    unmapped_count: 0,
    by_scope: {},
    by_filter_slug: {},
    by_token: {},
  };
}

function scanRefrigeratorManualEvidenceInventory(args: {
  dirAbs: string;
  directory_relative_path: RefrigeratorManualEvidenceInventorySliceV1["directory_relative_path"];
  fileExists: (p: string) => boolean;
  readDir: (p: string) => string[];
  readTextFile: (p: string) => string;
}): RefrigeratorManualEvidenceInventorySliceV1 {
  const proven_facts: string[] = [];
  const unknown_facts: string[] = [
    "Manual evidence inventory is separate from `data/evidence` Amazon/token artifacts.",
    "Brand coverage is UNKNOWN; only validated `fridge_model_slug` fields are listed (no brand inferred from slug).",
  ];
  let valid_record_count = 0;
  let invalid_or_unreadable_count = 0;
  const slugSet = new Set<string>();

  if (!args.fileExists(args.dirAbs)) {
    unknown_facts.push(`Directory ${args.directory_relative_path} is missing or unreadable.`);
    return {
      inventory_contract: "refrigerator_manual_evidence_files_v1",
      directory_relative_path: args.directory_relative_path,
      valid_record_count,
      invalid_or_unreadable_count,
      validated_model_slugs: [],
      proven_facts,
      unknown_facts,
    };
  }

  let names: string[];
  try {
    names = args.readDir(args.dirAbs).filter((n) => n.endsWith(".json"));
  } catch {
    unknown_facts.push(`Could not read directory ${args.directory_relative_path}.`);
    return {
      inventory_contract: "refrigerator_manual_evidence_files_v1",
      directory_relative_path: args.directory_relative_path,
      valid_record_count,
      invalid_or_unreadable_count,
      validated_model_slugs: [],
      proven_facts,
      unknown_facts,
    };
  }

  for (const name of names) {
    const abs = path.join(args.dirAbs, name);
    try {
      const raw = args.readTextFile(abs);
      const parsed: unknown = JSON.parse(raw);
      if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
        invalid_or_unreadable_count += 1;
        continue;
      }
      const readiness = validateRefrigeratorManualEvidencePublicReady(
        parsed as Partial<RefrigeratorManualEvidenceRecord>,
      );
      if (!readiness.ok) {
        invalid_or_unreadable_count += 1;
        continue;
      }
      const slug = (parsed as RefrigeratorManualEvidenceRecord).fridge_model_slug;
      if (typeof slug !== "string" || !slug.trim()) {
        invalid_or_unreadable_count += 1;
        continue;
      }
      valid_record_count += 1;
      slugSet.add(slug.trim());
    } catch {
      invalid_or_unreadable_count += 1;
    }
  }

  const validated_model_slugs = Array.from(slugSet).sort((a, b) => a.localeCompare(b));
  proven_facts.push(
    `Scanned ${names.length} JSON file(s) under ${args.directory_relative_path}; ${valid_record_count} passed public-readiness validation.`,
  );

  return {
    inventory_contract: "refrigerator_manual_evidence_files_v1",
    directory_relative_path: args.directory_relative_path,
    valid_record_count,
    invalid_or_unreadable_count,
    validated_model_slugs,
    proven_facts,
    unknown_facts,
  };
}

function scanFridgeFormFactorEvidenceInventory(args: {
  dirAbs: string;
  directory_relative_path: FridgeFormFactorEvidenceInventorySliceV1["directory_relative_path"];
  fileExists: (p: string) => boolean;
  readDir: (p: string) => string[];
  readTextFile: (p: string) => string;
}): FridgeFormFactorEvidenceInventorySliceV1 {
  const proven_facts: string[] = [];
  const unknown_facts: string[] = [
    "Form-factor evidence inventory is separate from `data/evidence` Amazon/token artifacts.",
    "Brand coverage is UNKNOWN; only validated `fridge_model_slug` fields are listed (no brand inferred from slug).",
  ];
  let valid_record_count = 0;
  let invalid_or_unreadable_count = 0;
  const slugSet = new Set<string>();

  if (!args.fileExists(args.dirAbs)) {
    unknown_facts.push(`Directory ${args.directory_relative_path} is missing or unreadable.`);
    return {
      inventory_contract: "fridge_form_factor_evidence_files_v1",
      directory_relative_path: args.directory_relative_path,
      valid_record_count,
      invalid_or_unreadable_count,
      validated_model_slugs: [],
      proven_facts,
      unknown_facts,
    };
  }

  let names: string[];
  try {
    names = args.readDir(args.dirAbs).filter((n) => n.endsWith(".json"));
  } catch {
    unknown_facts.push(`Could not read directory ${args.directory_relative_path}.`);
    return {
      inventory_contract: "fridge_form_factor_evidence_files_v1",
      directory_relative_path: args.directory_relative_path,
      valid_record_count,
      invalid_or_unreadable_count,
      validated_model_slugs: [],
      proven_facts,
      unknown_facts,
    };
  }

  for (const name of names) {
    const abs = path.join(args.dirAbs, name);
    try {
      const raw = args.readTextFile(abs);
      const parsed: unknown = JSON.parse(raw);
      if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
        invalid_or_unreadable_count += 1;
        continue;
      }
      const readiness = validateFridgeFormFactorEvidencePublicReady(parsed as Partial<FridgeFormFactorEvidenceRecord>);
      if (!readiness.ok) {
        invalid_or_unreadable_count += 1;
        continue;
      }
      const slug = (parsed as { fridge_model_slug?: string }).fridge_model_slug;
      if (typeof slug !== "string" || !slug.trim()) {
        invalid_or_unreadable_count += 1;
        continue;
      }
      valid_record_count += 1;
      slugSet.add(slug.trim());
    } catch {
      invalid_or_unreadable_count += 1;
    }
  }

  const validated_model_slugs = Array.from(slugSet).sort((a, b) => a.localeCompare(b));
  proven_facts.push(
    `Scanned ${names.length} JSON file(s) under ${args.directory_relative_path}; ${valid_record_count} passed public-readiness validation.`,
  );

  return {
    inventory_contract: "fridge_form_factor_evidence_files_v1",
    directory_relative_path: args.directory_relative_path,
    valid_record_count,
    invalid_or_unreadable_count,
    validated_model_slugs,
    proven_facts,
    unknown_facts,
  };
}

export function buildEvidenceInventoryV1(args: {
  rootDir: string;
  fileExists: (p: string) => boolean;
  readDir: (p: string) => string[];
  readTextFile: (p: string) => string;
}): EvidenceInventoryV1 {
  const evidenceDirAbs = path.resolve(args.rootDir, "data/evidence");
  const rollup = rollupEvidenceDirectory({
    evidenceDirAbs,
    fileExists: args.fileExists,
    readDir: args.readDir,
  });

  let names: string[] = [];
  if (args.fileExists(evidenceDirAbs)) {
    try {
      names = args.readDir(evidenceDirAbs).filter((n) => n.endsWith(".json"));
    } catch {
      names = [];
    }
  }

  const filenameBuckets: EvidenceDataEvidenceInventorySliceV1["filename_outcome_buckets"] = {
    live_outcome_by_filename_substring: rollup.live_outcome_count,
    unknown_outcome_by_filename_substring: rollup.unknown_outcome_count,
    fail_hold_outcome_by_filename_substring: rollup.fail_hold_outcome_count,
    other_json_not_matching_filename_patterns: rollup.unclassified_json_count,
  };

  const bodyAgg = emptyBodyMapping();
  for (const name of names) {
    const abs = path.join(evidenceDirAbs, name);
    let parseError = false;
    let parsedOk = false;
    let contributes = false;
    let partial = emptyBodyMapping();
    try {
      const raw = args.readTextFile(abs);
      const parsed: unknown = JSON.parse(raw);
      if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
        parseError = true;
      } else {
        parsedOk = true;
        const extracted = mapBodyFromObject(parsed as Record<string, unknown>);
        partial = extracted.mapping;
        contributes = extracted.contributesMappedRollup;
        partial.parsed_ok_count = 0;
        partial.parse_error_count = 0;
        partial.mapped_count = 0;
        partial.unmapped_count = 0;
      }
    } catch {
      parseError = true;
    }
    mergeBodyMapping(bodyAgg, partial, contributes, parsedOk, parseError);
  }

  const dataUnknownFacts: string[] = [
    "Filename outcome buckets are derived from filename substrings only — they are not JSON verdict or insert-outcome fields.",
    "`recent_filenames` order is lexicographic descending by filename, not proven wall-clock recency (no `generated_at` sort in this lane).",
    "Body rollups use only top-level string keys `scope`, `token`, `filter_slug` when present — no brand or fridge model slug is inferred from filenames or tokens.",
    "No catalog-wide model or brand coverage is proven from `data/evidence` file counts alone.",
  ];

  const dataProvenFacts: string[] = [
    `Counted ${names.length} total JSON file(s) under data/evidence/.`,
    "Filename buckets: live/unknown/fail-hold/other counts match substring rules documented in command-center-evidence-rollup.",
    `Body parse: parsed_ok=${bodyAgg.parsed_ok_count}, parse_error=${bodyAgg.parse_error_count}, mapped_for_scope_token_filter_slug=${bodyAgg.mapped_count}, unmapped_no_rollups_keys=${bodyAgg.unmapped_count}.`,
  ];

  const data_evidence: EvidenceDataEvidenceInventorySliceV1 = {
    directory_relative_path: "data/evidence",
    total_json_files: names.length,
    filename_outcome_buckets: filenameBuckets,
    recent_filenames: rollup.recent_evidence_filenames,
    recent_ordering: "lexicographic_by_filename",
    proven_facts: dataProvenFacts,
    unknown_facts: dataUnknownFacts,
    body_mapping: bodyAgg,
  };

  const manualDirAbs = path.resolve(args.rootDir, "data/manual-evidence/refrigerator");
  const refrigerator_manual_evidence = scanRefrigeratorManualEvidenceInventory({
    dirAbs: manualDirAbs,
    directory_relative_path: "data/manual-evidence/refrigerator",
    fileExists: args.fileExists,
    readDir: args.readDir,
    readTextFile: args.readTextFile,
  });

  const formDirAbs = path.resolve(args.rootDir, "data/fridge-form-factor-evidence");
  const fridge_form_factor_evidence = scanFridgeFormFactorEvidenceInventory({
    dirAbs: formDirAbs,
    directory_relative_path: "data/fridge-form-factor-evidence",
    fileExists: args.fileExists,
    readDir: args.readDir,
    readTextFile: args.readTextFile,
  });

  const proven_facts: string[] = [
    `evidence_inventory_v1: data/evidence JSON files=${names.length}; manual valid=${refrigerator_manual_evidence.valid_record_count}; form_factor valid=${fridge_form_factor_evidence.valid_record_count}.`,
    "Amazon/token `data/evidence` artifacts, manual-evidence, and form-factor evidence are three separate inventory contracts.",
  ];

  const unknown_facts: string[] = [
    "Validated manual and form-factor model slugs do not imply all catalog models have evidence — no join to `fridge_models` or brand tables is performed here.",
    "Integrity Sentinel `freshness_signal_present` for this provider remains false unless a future contract wires `generated_at` or explicit mtime rules.",
    ...dataUnknownFacts,
  ];

  return {
    contract: "evidence_inventory_v1",
    proven_facts,
    unknown_facts,
    data_evidence,
    refrigerator_manual_evidence,
    fridge_form_factor_evidence,
  };
}
