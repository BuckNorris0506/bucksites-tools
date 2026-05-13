import path from "node:path";

import type {
  EvidenceToLearningOutcomesCandidateImportV1,
  EvidenceToLoImportCandidateV1,
  EvidenceToLoRejectedSampleV1,
  ProposedLearningOutcomeRowV1,
} from "./buckparts-command-center-v2-types";

const CANDIDATE_CAP = 20;
const REJECTED_SAMPLE_CAP = 20;
const EVIDENCE_REL = "data/evidence" as const;

/** Verdict literals observed under `data/evidence/*.json` (repo grep); map to DDL `outcome` check values only. */
const VERDICT_TO_OUTCOME: Record<string, "pass" | "fail" | "blocked" | "unknown"> = {
  LIVE_OUTCOME_RECORDED: "pass",
  UNKNOWN: "unknown",
  NO_SAFE_PDP_FOUND_FROM_OWNER_BROWSER_SEARCH: "blocked",
  EXACT_PDP_PROVEN_FROM_OWNER_BROWSER_SCREENSHOT: "pass",
};

const CONFIDENCE_OK = new Set(["exact", "likely", "uncertain"]);

function isNonEmptyString(v: unknown): v is string {
  return typeof v === "string" && v.trim().length > 0;
}

function safeHttpsUrl(v: unknown): string | null {
  if (!isNonEmptyString(v)) return null;
  const t = v.trim();
  if (!/^https:\/\//i.test(t)) return null;
  if (t.length > 2048) return null;
  return t;
}

function pickDateChecked(o: Record<string, unknown>, fallbackIso: string): string {
  const keys = ["generated_at", "command_center_generated_at", "source_queue_generated_at"] as const;
  for (const k of keys) {
    const v = o[k];
    if (typeof v === "string" && !Number.isNaN(Date.parse(v))) return new Date(v).toISOString();
    if (typeof v === "string" && /^\d{4}-\d{2}-\d{2}$/.test(v)) return `${v}T00:00:00.000Z`;
  }
  return fallbackIso;
}

function slugFromTokenOrFilter(o: Record<string, unknown>): string | null {
  const fs = o.filter_slug;
  if (isNonEmptyString(fs)) return fs.trim().toLowerCase();
  const tok = o.token;
  if (isNonEmptyString(tok)) return tok.trim().toLowerCase();
  return null;
}

function mapOutcomeFromVerdictOrRow(
  o: Record<string, unknown>,
  basis: string[],
): { outcome: "pass" | "fail" | "blocked" | "unknown" } {
  const v = o.verdict;
  if (isNonEmptyString(v)) {
    const mapped = VERDICT_TO_OUTCOME[v];
    if (mapped) {
      basis.push(
        `Mapped top-level verdict literal "${v}" to learning_outcomes.outcome="${mapped}" per v1 table (label mapping only; not buyer, fit, or revenue claims).`,
      );
      return { outcome: mapped };
    }
    basis.push(
      `Top-level verdict "${v}" is not in the v1 mapping table; learning_outcomes.outcome set to unknown pending owner mapping rules.`,
    );
    return { outcome: "unknown" };
  }
  const row = o.committed_live_row;
  if (row && typeof row === "object" && !Array.isArray(row)) {
    const r = row as Record<string, unknown>;
    const url = safeHttpsUrl(r.affiliate_url) ?? safeHttpsUrl(r.destination_url);
    const btc = r.browser_truth_classification;
    if (url && isNonEmptyString(btc)) {
      basis.push(
        "No top-level verdict; used committed_live_row https URL plus browser_truth_classification string as weak live-row signal — operator must still validate before insert.",
      );
      return { outcome: "pass" };
    }
  }
  return { outcome: "unknown" };
}

function mapConfidence(o: Record<string, unknown>): "exact" | "likely" | "uncertain" | null {
  const c = o.confidence;
  if (!isNonEmptyString(c)) return null;
  const t = c.trim().toLowerCase();
  return CONFIDENCE_OK.has(t) ? (t as "exact" | "likely" | "uncertain") : null;
}

function mapCtaFromObject(o: Record<string, unknown>, basis: string[]): "live" | "not_live" | "blocked" | null {
  const f = o.final_amazon_cta_state_proven;
  if (f === true) {
    basis.push("final_amazon_cta_state_proven===true → proposed cta_status live (evidence boolean only; not approval to publish site CTAs).");
    return "live";
  }
  if (f === false) {
    basis.push("final_amazon_cta_state_proven===false → proposed cta_status not_live.");
    return "not_live";
  }
  return null;
}

function evidenceStub(sourceRel: string, keys: Record<string, unknown>): Record<string, unknown> {
  return {
    import_contract: "evidence_to_learning_outcomes_candidate_import_v1",
    source_relative_path: sourceRel,
    ...keys,
  };
}

function mapRootObjectToCandidates(
  sourceRel: string,
  o: Record<string, unknown>,
  nowIso: string,
): { candidates: EvidenceToLoImportCandidateV1[]; rejections: EvidenceToLoRejectedSampleV1[] } {
  const rejections: EvidenceToLoRejectedSampleV1[] = [];
  const candidates: EvidenceToLoImportCandidateV1[] = [];

  const staged = o.staged_candidates;
  if (Array.isArray(staged)) {
    const parentDate = pickDateChecked(o, nowIso);
    for (let i = 0; i < staged.length; i++) {
      const el = staged[i];
      if (!el || typeof el !== "object" || Array.isArray(el)) {
        rejections.push({
          source_file: sourceRel,
          reject_reason: `staged_candidates[${i}] is not an object.`,
        });
        continue;
      }
      const s = el as Record<string, unknown>;
      const token = s.token;
      if (!isNonEmptyString(token)) {
        rejections.push({
          source_file: sourceRel,
          reject_reason: `staged_candidates[${i}] missing non-empty token.`,
        });
        continue;
      }
      const slug = token.trim().toLowerCase();
      const url = safeHttpsUrl(s.canonical_dp_url);
      if (!url) {
        rejections.push({
          source_file: sourceRel,
          reject_reason: `staged_candidates[${i}] missing safe https canonical_dp_url.`,
        });
        continue;
      }
      const conf = mapConfidence(s);
      const missing: string[] = [];
      if (s.confidence != null && conf === null) {
        missing.push("staged row confidence present but not exact|likely|uncertain.");
      }
      if (conf === null) {
        missing.push("confidence absent or not exact|likely|uncertain in staged row (nullable in DB; insert writer may require non-null).");
      }
      const basis = [
        `Derived from ${sourceRel} staged_candidates[${i}] only.`,
        "Batch staging row: learning_outcomes.outcome forced to unknown because parent file has no mapped top-level verdict.",
        "browser_truth_classification_candidate and buyable_subtype are evidence-only hints — not fit or buy proof.",
      ];
      const proposed: ProposedLearningOutcomeRowV1 = {
        slug,
        part_number: token.trim(),
        model_number: null,
        candidate_url: url,
        retailer: url.includes("amazon.") ? "amazon" : null,
        outcome: "unknown",
        reason: "Staged read-only evidence row (mutation not applied in source file).",
        reason_detail: isNonEmptyString(s.buyable_subtype) ? String(s.buyable_subtype).slice(0, 500) : null,
        confidence: conf,
        cta_status: "not_live",
        index_status: null,
        date_checked: parentDate,
        next_action: "Owner reviews staged candidate before any insertLearningOutcome call.",
        evidence_jsonb_stub: evidenceStub(sourceRel, { staged_index: i, token: token.trim() }),
      };
      candidates.push({
        source_file: sourceRel,
        proposed_learning_outcome: proposed,
        mapping_basis: basis,
        missing_or_unknown_fields: missing,
        owner_approval_required: true,
      });
    }
    return { candidates, rejections };
  }

  const slug = slugFromTokenOrFilter(o);
  if (!slug) {
    rejections.push({
      source_file: sourceRel,
      reject_reason: "Missing both filter_slug and token for learning_outcomes.slug derivation.",
    });
    return { candidates, rejections };
  }

  const basis: string[] = [`Derived from ${sourceRel} top-level JSON object.`];
  const om = mapOutcomeFromVerdictOrRow(o, basis);
  const outcome = om.outcome;

  const reason =
    isNonEmptyString(o.reason) ? o.reason.trim().slice(0, 4000) : "Evidence file mapped without top-level reason string.";
  const row = o.committed_live_row;
  let candidateUrl: string | null = null;
  let retailer: string | null = null;
  if (row && typeof row === "object" && !Array.isArray(row)) {
    const r = row as Record<string, unknown>;
    candidateUrl = safeHttpsUrl(r.affiliate_url) ?? safeHttpsUrl(r.destination_url);
    const rk = r.retailer_key ?? r.retailer_slug;
    retailer = isNonEmptyString(rk) ? rk.trim().toLowerCase() : null;
  }

  const token = o.token;
  const part_number = isNonEmptyString(token) ? token.trim() : null;

  const confTop = mapConfidence(o);
  const ctaTop = mapCtaFromObject(o, basis);
  const missing: string[] = [];
  if (confTop === null) missing.push("confidence not proven from top-level exact|likely|uncertain (DB nullable).");
  if (ctaTop === null) missing.push("cta_status not proven from final_amazon_cta_state_proven boolean (DB nullable).");
  if (candidateUrl === null) missing.push("candidate_url not proven (no safe https committed_live_row affiliate_url/destination_url).");

  const proposed: ProposedLearningOutcomeRowV1 = {
    slug,
    part_number,
    model_number: null,
    candidate_url: candidateUrl,
    retailer,
    outcome,
    reason,
    reason_detail: isNonEmptyString(o.reason_detail) ? String(o.reason_detail).trim().slice(0, 4000) : null,
    confidence: confTop,
    cta_status: ctaTop,
    index_status: isNonEmptyString(o.index_status) ? String(o.index_status).trim().slice(0, 500) : null,
    date_checked: pickDateChecked(o, nowIso),
    next_action: isNonEmptyString(o.next_safe_action)
      ? String(o.next_safe_action).trim().slice(0, 2000)
      : isNonEmptyString(o.recommended_next_action)
        ? String(o.recommended_next_action).trim().slice(0, 2000)
        : "Owner reviews mapped fields before insertLearningOutcome.",
    evidence_jsonb_stub: evidenceStub(sourceRel, {
      token: isNonEmptyString(o.token) ? o.token.trim() : undefined,
      verdict: isNonEmptyString(o.verdict) ? o.verdict.trim() : undefined,
    }),
  };

  candidates.push({
    source_file: sourceRel,
    proposed_learning_outcome: proposed,
    mapping_basis: basis,
    missing_or_unknown_fields: missing,
    owner_approval_required: true,
  });
  return { candidates, rejections };
}

export function buildEvidenceToLearningOutcomesCandidateImportV1(args: {
  rootDir: string;
  fileExists: (p: string) => boolean;
  readDir: (p: string) => string[];
  readTextFile: (p: string) => string;
  now: () => Date;
}): EvidenceToLearningOutcomesCandidateImportV1 {
  const nowIso = args.now().toISOString();
  const proven_facts: string[] = [
    "Scans only `data/evidence/*.json` (no subdirectories) per Command Center evidence inventory contract.",
    "Target table columns are taken from supabase/migrations/20260428200500_learning_outcomes.sql (read-only planning only).",
    "This object never calls insertLearningOutcome or Supabase; owner_approval_required is always true.",
  ];
  const unknown_facts: string[] = [
    "Verdict→outcome mapping covers only literals observed in-repo under data/evidence; new verdict strings require mapping table updates.",
    "Filename patterns are not used for outcome — only JSON body fields.",
  ];

  const evidenceAbs = path.resolve(args.rootDir, EVIDENCE_REL);
  if (!args.fileExists(evidenceAbs)) {
    return {
      contract: "evidence_to_learning_outcomes_candidate_import_v1",
      runtime_status: "OK",
      scanned_file_count: 0,
      parseable_file_count: 0,
      candidate_count: 0,
      rejected_count: 1,
      candidates: [],
      candidates_evaluated_uncapped_v1: [],
      rejected_samples: [{ source_file: EVIDENCE_REL, reject_reason: "Directory missing or unreadable." }],
      proven_facts,
      unknown_facts,
      owner_approval_required: true,
      data_mutation: false,
    };
  }

  let names: string[] = [];
  try {
    names = args.readDir(evidenceAbs).filter((n) => n.endsWith(".json")).sort((a, b) => a.localeCompare(b));
  } catch (e) {
    const msg = e instanceof Error ? e.message : "UNKNOWN";
    return {
      contract: "evidence_to_learning_outcomes_candidate_import_v1",
      runtime_status: "UNKNOWN_IO_ERROR",
      scanned_file_count: 0,
      parseable_file_count: 0,
      candidate_count: 0,
      rejected_count: 1,
      candidates: [],
      candidates_evaluated_uncapped_v1: [],
      rejected_samples: [{ source_file: EVIDENCE_REL, reject_reason: `readDir failed: ${msg}` }],
      proven_facts,
      unknown_facts: [...unknown_facts, `IO: ${msg}`],
      owner_approval_required: true,
      data_mutation: false,
    };
  }

  let parseable = 0;
  const allCandidates: EvidenceToLoImportCandidateV1[] = [];
  const allRejections: EvidenceToLoRejectedSampleV1[] = [];

  for (const name of names) {
    const rel = `${EVIDENCE_REL}/${name}`;
    const abs = path.join(evidenceAbs, name);
    let raw: string;
    try {
      raw = args.readTextFile(abs);
    } catch (e) {
      const msg = e instanceof Error ? e.message : "UNKNOWN";
      allRejections.push({ source_file: rel, reject_reason: `readTextFile failed: ${msg}` });
      continue;
    }
    let parsed: unknown;
    try {
      parsed = JSON.parse(raw);
    } catch {
      allRejections.push({ source_file: rel, reject_reason: "JSON.parse failed (malformed JSON)." });
      continue;
    }
    parseable += 1;

    if (Array.isArray(parsed)) {
      allRejections.push({
        source_file: rel,
        reject_reason: "Root JSON is an array; v1 maps object roots or staged_candidates arrays inside an object.",
      });
      continue;
    }
    if (!parsed || typeof parsed !== "object") {
      allRejections.push({ source_file: rel, reject_reason: "Root JSON is not an object." });
      continue;
    }

    const { candidates, rejections } = mapRootObjectToCandidates(rel, parsed as Record<string, unknown>, nowIso);
    allCandidates.push(...candidates);
    allRejections.push(...rejections);
  }

  const totalCand = allCandidates.length;
  const totalRej = allRejections.length;
  if (totalCand > CANDIDATE_CAP) {
    proven_facts.push(
      `candidates preview is capped at ${CANDIDATE_CAP} rows; candidates_evaluated_uncapped_v1 holds all ${totalCand} discovered rows for insert-plan evaluation.`,
    );
  }
  if (totalRej > REJECTED_SAMPLE_CAP) {
    unknown_facts.push(`Rejected rows (${totalRej}) exceed rejected_samples cap ${REJECTED_SAMPLE_CAP}; samples truncated.`);
  }

  proven_facts.push(`scanned_file_count=${names.length}, parseable_file_count=${parseable}.`);
  proven_facts.push(
    "candidates_evaluated_uncapped_v1 mirrors every parseable candidate before display capping (length equals candidate_count for OK runs built by this module).",
  );

  return {
    contract: "evidence_to_learning_outcomes_candidate_import_v1",
    runtime_status: "OK",
    scanned_file_count: names.length,
    parseable_file_count: parseable,
    candidate_count: totalCand,
    rejected_count: totalRej,
    candidates: allCandidates.slice(0, CANDIDATE_CAP),
    candidates_evaluated_uncapped_v1: allCandidates,
    rejected_samples: allRejections.slice(0, REJECTED_SAMPLE_CAP),
    proven_facts,
    unknown_facts,
    owner_approval_required: true,
    data_mutation: false,
  };
}
