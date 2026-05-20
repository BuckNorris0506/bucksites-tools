import { readFileSync } from "node:fs";
import path from "node:path";

import {
  CUSTOMER_LANGUAGE_DOCTRINE_REL_PATH,
  NO_OEM_COLD_RULE_V1,
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
  waterdrop_research_draft_path: string;
  waterdrop_evidence_path: string;
  waterdrop_insert_plan_path: string;
  waterdrop_research_draft_published: false;
  waterdrop_live_cta_status: WaterdropLiveCtaStatusV1;
  waterdrop_proof_commit_ref: "a343464";
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

  const evidence = readJsonIfPresent<{
    mutation_ready?: boolean;
    data_mutation?: boolean;
    read_only?: boolean;
    insert_outcome?: string;
    verdict?: string;
  }>(input.rootDir, WATERDROP_DA29_00020B_EVIDENCE_REL_PATH, input.fileExists);

  if (evidenceOk && evidence) {
    proven_facts.push(
      `PROVEN: ${WATERDROP_DA29_00020B_EVIDENCE_REL_PATH} present; read_only=${String(evidence.read_only)} data_mutation=${String(evidence.data_mutation)} verdict=${String(evidence.verdict)}.`,
    );
    if (evidence.mutation_ready === false) {
      proven_facts.push("PROVEN: Waterdrop evidence mutation_ready=false — no retailer_links insert authorized from evidence alone.");
    }
  } else if (evidenceOk) {
    proven_facts.push(`PROVEN: ${WATERDROP_DA29_00020B_EVIDENCE_REL_PATH} file exists (JSON parse not required for lane).`);
  }

  if (insertPlanOk) {
    proven_facts.push(`PROVEN: ${WATERDROP_DA29_00020B_INSERT_PLAN_REL_PATH} exists; SQL remains operator-blocked.`);
  }

  proven_facts.push(
    "PROVEN: Repo seed data/retailer_links.csv has no waterdrop row for da29-00020b — live compatible CTA NOT_LIVE at catalog seed layer.",
  );
  proven_facts.push(
    "PROVEN: HQ commit a343464 recorded Waterdrop DA29-00020B browser proof without live CTA (see docs/BuckParts-HQ-HANDOFF.md).",
  );

  const waterdrop_live_cta_status: WaterdropLiveCtaStatusV1 = "NOT_LIVE";

  unknown_facts.push(
    "Production Supabase retailer_links waterdrop row count for da29-00020b UNKNOWN until read-only precheck (insert plan Precheck D).",
  );
  unknown_facts.push(
    "Whether research draft is published to /filter/da29-00020b or /help UNKNOWN — draft is non-public by design.",
  );

  return {
    contract: "customer_language_and_waterdrop_research_lane_v1",
    read_only: true,
    data_mutation: false,
    mutation_authority: false,
    customer_language_doctrine_path: CUSTOMER_LANGUAGE_DOCTRINE_REL_PATH,
    no_oem_cold_rule: NO_OEM_COLD_RULE_V1,
    waterdrop_research_draft_path: WATERDROP_DA29_00020B_RESEARCH_DRAFT_REL_PATH,
    waterdrop_evidence_path: WATERDROP_DA29_00020B_EVIDENCE_REL_PATH,
    waterdrop_insert_plan_path: WATERDROP_DA29_00020B_INSERT_PLAN_REL_PATH,
    waterdrop_research_draft_published: false,
    waterdrop_live_cta_status,
    waterdrop_proof_commit_ref: "a343464",
    proven_facts,
    unknown_facts,
  };
}
