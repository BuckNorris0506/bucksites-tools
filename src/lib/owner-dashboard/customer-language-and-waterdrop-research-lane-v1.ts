import { readFileSync } from "node:fs";
import path from "node:path";

import {
  CUSTOMER_LANGUAGE_DOCTRINE_REL_PATH,
  NO_OEM_COLD_RULE_V1,
  PURCHASE_OPTION_MONETIZATION_PRIORITY_V1,
  WATERDROP_DA29_00020B_EVIDENCE_REL_PATH,
  WATERDROP_DA29_00020B_INSERT_PLAN_REL_PATH,
  WATERDROP_DA29_00020B_RESEARCH_DRAFT_REL_PATH,
  type WaterdropLiveCtaStatusV1,
} from "@/lib/copy/customer-language-doctrine";

export type CustomerLanguageAndWaterdropResearchLaneV1 = {
  contract: "customer_language_and_waterdrop_research_lane_v1";
  read_only: true;
  data_mutation: false;
  mutation_authority: false;
  customer_language_doctrine_path: string;
  no_oem_cold_rule: string;
  purchase_option_monetization_priority: string;
  waterdrop_research_draft_path: string;
  waterdrop_evidence_path: string;
  waterdrop_insert_plan_path: string;
  waterdrop_research_draft_published: false;
  waterdrop_live_cta_status: WaterdropLiveCtaStatusV1;
  waterdrop_production_row_id: string | null;
  waterdrop_proof_commit_ref: "a343464";
  first_verified_waterdrop_non_amazon_dtc_slice_note: string | null;
  proven_facts: string[];
  unknown_facts: string[];
};

function filePresent(rootDir: string, rel: string, fileExists: (p: string) => boolean): boolean {
  return fileExists(path.join(rootDir, rel));
}

function readJsonIfPresent<T extends Record<string, unknown>>(
  rootDir: string,
  rel: string,
  fileExists: (p: string) => boolean,
): T | null {
  const abs = path.join(rootDir, rel);
  if (!fileExists(abs)) return null;
  try {
    return JSON.parse(readFileSync(abs, "utf8")) as T;
  } catch {
    return null;
  }
}

function productionRowIdFromEvidence(evidence: Record<string, unknown> | null): string | null {
  if (!evidence) return null;
  const committed = evidence.committed_live_row as { link_id?: string } | undefined;
  if (committed?.link_id) return committed.link_id;
  const prod = evidence.production_insert_outcome as { inserted_row?: { id?: string } } | undefined;
  return prod?.inserted_row?.id ?? null;
}

function isWaterdropLiveInEvidence(evidence: Record<string, unknown> | null): boolean {
  if (!evidence) return false;
  if (evidence.waterdrop_live_cta_status === "LIVE") return true;
  const insertOutcome = evidence.insert_outcome as string | undefined;
  if (insertOutcome === "COMMITTED_VERIFIED_READ_ONLY") return true;
  const prod = evidence.production_insert_outcome as { insert_outcome?: string } | undefined;
  return prod?.insert_outcome === "COMMITTED_VERIFIED_READ_ONLY";
}

/** Read-only lane: customer language doctrine + Waterdrop DA29-00020B research status (no mutation authority). */
export function buildCustomerLanguageAndWaterdropResearchLaneV1(input: {
  rootDir: string;
  fileExists: (p: string) => boolean;
}): CustomerLanguageAndWaterdropResearchLaneV1 {
  const proven_facts: string[] = [];
  const unknown_facts: string[] = [];

  const doctrineOk = filePresent(input.rootDir, CUSTOMER_LANGUAGE_DOCTRINE_REL_PATH, input.fileExists);
  const draftOk = filePresent(input.rootDir, WATERDROP_DA29_00020B_RESEARCH_DRAFT_REL_PATH, input.fileExists);
  const evidenceOk = filePresent(input.rootDir, WATERDROP_DA29_00020B_EVIDENCE_REL_PATH, input.fileExists);
  const insertPlanOk = filePresent(
    input.rootDir,
    WATERDROP_DA29_00020B_INSERT_PLAN_REL_PATH,
    input.fileExists,
  );

  if (doctrineOk) {
    proven_facts.push(`PROVEN: ${CUSTOMER_LANGUAGE_DOCTRINE_REL_PATH} exists on disk.`);
  } else {
    unknown_facts.push(`${CUSTOMER_LANGUAGE_DOCTRINE_REL_PATH} missing on disk.`);
  }

  if (draftOk) {
    proven_facts.push(
      `PROVEN: ${WATERDROP_DA29_00020B_RESEARCH_DRAFT_REL_PATH} exists; design/research only — not published customer copy.`,
    );
  } else {
    unknown_facts.push(`${WATERDROP_DA29_00020B_RESEARCH_DRAFT_REL_PATH} missing on disk.`);
  }

  const evidence = readJsonIfPresent<Record<string, unknown>>(
    input.rootDir,
    WATERDROP_DA29_00020B_EVIDENCE_REL_PATH,
    input.fileExists,
  );

  const productionRowId = productionRowIdFromEvidence(evidence);
  const waterdropLive = isWaterdropLiveInEvidence(evidence);

  if (evidenceOk && evidence) {
    proven_facts.push(
      `PROVEN: ${WATERDROP_DA29_00020B_EVIDENCE_REL_PATH} present; read_only=${String(evidence.read_only)} data_mutation=${String(evidence.data_mutation)} verdict=${String(evidence.verdict)}.`,
    );
    if (evidence.mutation_ready === false) {
      proven_facts.push(
        "PROVEN: Waterdrop evidence mutation_ready=false — no autonomous retailer_links mutation from repo automation.",
      );
    }
    if (waterdropLive && productionRowId) {
      proven_facts.push(`PROVEN: ${PURCHASE_OPTION_MONETIZATION_PRIORITY_V1}`);
      proven_facts.push(
        `PROVEN: Waterdrop live CTA for da29-00020b — production row ${productionRowId}; runtime /filter and /go proof in evidence runtime_proof.`,
      );
      const sliceNote = evidence.first_verified_waterdrop_non_amazon_dtc_affiliate_row_note as string | undefined;
      if (sliceNote) {
        proven_facts.push(`PROVEN: ${sliceNote}`);
      }
    }
  } else if (evidenceOk) {
    proven_facts.push(`PROVEN: ${WATERDROP_DA29_00020B_EVIDENCE_REL_PATH} file exists (JSON parse not required for lane).`);
  }

  if (insertPlanOk) {
    if (waterdropLive) {
      proven_facts.push(
        `PROVEN: ${WATERDROP_DA29_00020B_INSERT_PLAN_REL_PATH} exists; manual INSERT executed — do not re-run unless prechecks show row absent.`,
      );
    } else {
      proven_facts.push(`PROVEN: ${WATERDROP_DA29_00020B_INSERT_PLAN_REL_PATH} exists; SQL remains operator-blocked.`);
    }
  }

  if (!waterdropLive) {
    proven_facts.push(
      "PROVEN: Repo seed data/retailer_links.csv has no waterdrop row for da29-00020b — production live state UNKNOWN until evidence records insert.",
    );
    proven_facts.push(
      "PROVEN: HQ commit a343464 recorded Waterdrop DA29-00020B browser proof without live CTA (see docs/BuckParts-HQ-HANDOFF.md).",
    );
  }

  const waterdrop_live_cta_status: WaterdropLiveCtaStatusV1 = waterdropLive ? "LIVE" : "NOT_LIVE";

  const first_verified_waterdrop_non_amazon_dtc_slice_note = waterdropLive
    ? ((evidence?.first_verified_waterdrop_non_amazon_dtc_affiliate_row_note as string | undefined) ??
      "First verified Waterdrop non-Amazon DTC affiliate row for da29-00020b proof slice only; no broad Waterdrop rollout.")
    : null;

  if (!waterdropLive) {
    unknown_facts.push(
      "Production Supabase retailer_links waterdrop row for da29-00020b UNKNOWN until evidence records production_insert_outcome.",
    );
  }

  unknown_facts.push(
    "Whether research draft is published to /filter/da29-00020b or /help UNKNOWN — draft is non-public by design.",
  );
  if (waterdropLive) {
    unknown_facts.push(
      "Rakuten commission or revenue for waterdrop row NOT_CONNECTED — live CTA does not imply revenue proof.",
    );
  }

  return {
    contract: "customer_language_and_waterdrop_research_lane_v1",
    read_only: true,
    data_mutation: false,
    mutation_authority: false,
    customer_language_doctrine_path: CUSTOMER_LANGUAGE_DOCTRINE_REL_PATH,
    no_oem_cold_rule: NO_OEM_COLD_RULE_V1,
    purchase_option_monetization_priority: PURCHASE_OPTION_MONETIZATION_PRIORITY_V1,
    waterdrop_research_draft_path: WATERDROP_DA29_00020B_RESEARCH_DRAFT_REL_PATH,
    waterdrop_evidence_path: WATERDROP_DA29_00020B_EVIDENCE_REL_PATH,
    waterdrop_insert_plan_path: WATERDROP_DA29_00020B_INSERT_PLAN_REL_PATH,
    waterdrop_research_draft_published: false,
    waterdrop_live_cta_status,
    waterdrop_production_row_id: productionRowId,
    waterdrop_proof_commit_ref: "a343464",
    first_verified_waterdrop_non_amazon_dtc_slice_note,
    proven_facts,
    unknown_facts,
  };
}
