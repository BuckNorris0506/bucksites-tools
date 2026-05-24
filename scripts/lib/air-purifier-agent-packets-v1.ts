/**
 * Read-only: turn AP Batch Production Lane v1 `agent_work_packets` into durable agent-assignable artifacts.
 */

import { existsSync, mkdirSync, readFileSync, statSync, writeFileSync } from "node:fs";
import path from "node:path";

import { HOMEKEEP_WEDGE_CATALOG } from "@/lib/catalog/identity";

import {
  buildAirPurifierBatchProductionLaneV1Report,
  type ApAgentWorkPacketV1,
  type AirPurifierBatchProductionLaneReportV1,
  type ApBatchCandidateV1,
  type ApCatalogIdentityGapV1,
} from "./air-purifier-batch-production-lane-v1";

export const AIR_PURIFIER_AGENT_PACKETS_CONTRACT_V1 = "air_purifier_agent_packets_v1" as const;

export const AP_AGENT_PACKET_DEFAULT_OUT_DIR_V1 =
  "data/air-purifier/batch-production/agent-packets" as const;

export const AP_AGENT_EVIDENCE_DECISIONS_V1 = [
  "PASS_DIRECT_BUYABLE",
  "PASS_REFERENCE",
  "CATALOG_GAP",
  "ALIAS_REDIRECT_GAP",
  "REJECT_WRONG_FAMILY",
  "REJECT_SEARCH_CATEGORY",
  "NEEDS_OWNER_REVIEW",
  "NO_SAFE_PATH",
] as const;

export type ApAgentEvidenceDecisionV1 = (typeof AP_AGENT_EVIDENCE_DECISIONS_V1)[number];

export type ApAgentEvidenceCsvMutationV1 = {
  file: "data/air-purifier/retailer_links.csv";
  filter_slug: string;
  retailer_key?: string;
  fields: Record<string, string>;
  note: string;
};

export type ApAgentEvidenceRowV1 = {
  packet_id: string;
  slug: string;
  decision: ApAgentEvidenceDecisionV1;
  candidate_url: string | null;
  final_url: string | null;
  browser_truth_classification: string | null;
  exact_tokens_seen: string[];
  wrong_family_tokens_seen: string[];
  buy_action_seen: boolean | null;
  reference_only_reason: string | null;
  evidence_notes: string;
  recommended_csv_mutation: ApAgentEvidenceCsvMutationV1 | null;
  owner_review_required: boolean;
};

export type ApAgentEvidenceResultFileV1 = {
  contract: "air_purifier_agent_evidence_result_v1";
  packet_id: string;
  generated_at: string;
  read_only_submission: true;
  no_commit: true;
  no_deploy: true;
  rows: ApAgentEvidenceRowV1[];
};

export type ApAgentPacketArtifactV1 = {
  contract: typeof AIR_PURIFIER_AGENT_PACKETS_CONTRACT_V1;
  packet_id: string;
  wedge: typeof HOMEKEEP_WEDGE_CATALOG.air_purifier;
  source_pattern: string;
  candidate_slugs: string[];
  candidates: ApBatchCandidateV1[];
  max_rows: number;
  task_type: string;
  objective: string;
  exact_proof_required: string;
  allowed_mutations: string[];
  forbidden_actions: string[];
  reject_rules: string[];
  expected_output_schema: {
    contract: "air_purifier_agent_evidence_result_v1";
    row_shape: Omit<ApAgentEvidenceRowV1, "packet_id"> & { packet_id: string };
    decisions: readonly ApAgentEvidenceDecisionV1[];
    results_path_hint: string;
  };
  validation_checklist: string[];
  owner_review_required: boolean;
  no_commit: true;
  no_deploy: true;
  read_only: true;
  data_mutation: false;
  generated_at: string;
  catalog_identity_gaps?: ApCatalogIdentityGapV1[];
};

export type AirPurifierAgentPacketsReportV1 = {
  report_name: "air_purifier_agent_packets_v1";
  read_only: true;
  data_mutation: false;
  generated_at: string;
  source_factory_report: "air_purifier_batch_production_lane_v1";
  packet_count: number;
  packets: ApAgentPacketArtifactV1[];
  out_dir: string | null;
  files_written: string[];
  notes: string[];
};

export const AP_AGENT_PACKET_FORBIDDEN_ACTIONS_V1 = [
  "Do not deploy or push without explicit owner approval.",
  "Do not commit CSV or catalog changes unless explicitly requested.",
  "Do not write to Supabase or call production mutation APIs.",
  "Do not edit data/retailer_links.csv (fridge batch).",
  "Do not edit data/air-purifier/filters.csv, filter_aliases.csv, or compatibility_mappings.csv.",
  "Do not add filter rows, alias rows, or redirects without an approved catalog task.",
  "Do not weaken buy gates, /go rules, search logic, or compatibility mappings.",
  "Do not mark direct_buyable without Add to Cart + exact token proof on primary PDP.",
  "Do not alias GSC slugs (e.g. blueair-f4max-411 → blueair-particle-411) without product-token proof.",
  "Do not apply recommended_csv_mutation — return evidence only; owner applies in a separate step.",
] as const;

const PACKET_OBJECTIVES_V1: Record<string, string> = {
  "ap-blueair-catalog-identity-v1":
    "Resolve Blueair F4MAX vs PART411 catalog identity before any particle-411 buyer-path work.",
  "ap-levoit-oem-discovery-v1":
    "Discover levoit.com product PDPs for Core/Vital/LV slugs; prove exact RF/RAR tokens.",
  "ap-oem-search-placeholder-v1":
    "Replace OEM site-search placeholder URLs with browser-proven manufacturer PDPs.",
  "ap-amazon-secondary-v1":
    "Verify Amazon /dp/ secondaries for Medify slugs; policy decision before primary promotion.",
  "ap-shark-official-reference-v1":
    "Activate or refresh Shark official reference links (likely_valid, not direct_buyable).",
  "ap-honeywell-store-direct-buy-v1":
    "Browser-proof remaining Honeywell Store PDPs for direct_buyable activation.",
};

const VALIDATION_CHECKLIST_BASE_V1 = [
  "Final URL is a product PDP, not search/category/error.",
  "Exact OEM token visible in primary product area.",
  "Wrong-family tokens checked and documented.",
  "Buy action (Add to Cart / equivalent) recorded when claiming direct_buyable.",
  "recommended_csv_mutation is null unless browser proof is complete.",
  "Return JSON only — do not mutate repo CSVs in this step.",
];

function slugifyPacketFilename(packetId: string): string {
  return `${packetId}.json`;
}

function resultsPathHint(packetId: string): string {
  return `data/air-purifier/batch-production/agent-results/${packetId}.results.json`;
}

function enrichPacketArtifact(args: {
  packet: ApAgentWorkPacketV1;
  lane: AirPurifierBatchProductionLaneReportV1;
  generatedAt: string;
}): ApAgentPacketArtifactV1 {
  const { packet, lane, generatedAt } = args;
  const candidateBySlug = new Map<string, ApBatchCandidateV1>();
  for (const pool of [
    lane.top_candidates,
    lane.blocked_or_rejected,
    lane.reference_link_candidates,
    lane.direct_buy_candidates,
  ]) {
    for (const c of pool) {
      if (!candidateBySlug.has(c.filter_slug)) candidateBySlug.set(c.filter_slug, c);
    }
  }

  const candidates = packet.candidate_slugs
    .map((slug) => candidateBySlug.get(slug))
    .filter((c): c is ApBatchCandidateV1 => !!c);

  const objective =
    PACKET_OBJECTIVES_V1[packet.packet_id] ??
    `Execute ${packet.task_type} for ${packet.pattern} pattern slugs.`;

  const validationChecklist = [...VALIDATION_CHECKLIST_BASE_V1];
  if (packet.packet_id === "ap-blueair-catalog-identity-v1") {
    validationChecklist.unshift(
      "Do not recommend buyer-path CSV mutation until F4MAX catalog row + compat are resolved.",
    );
  }
  if (packet.task_type === "amazon_secondary_verification") {
    validationChecklist.unshift("Owner policy required before Amazon-primary promotion.");
  }

  return {
    contract: AIR_PURIFIER_AGENT_PACKETS_CONTRACT_V1,
    packet_id: packet.packet_id,
    wedge: HOMEKEEP_WEDGE_CATALOG.air_purifier,
    source_pattern: packet.pattern,
    candidate_slugs: packet.candidate_slugs,
    candidates,
    max_rows: packet.max_rows,
    task_type: packet.task_type,
    objective,
    exact_proof_required: packet.exact_proof_required,
    allowed_mutations: packet.allowed_mutations,
    forbidden_actions: [...AP_AGENT_PACKET_FORBIDDEN_ACTIONS_V1],
    reject_rules: packet.reject_rules,
    expected_output_schema: {
      contract: "air_purifier_agent_evidence_result_v1",
      row_shape: {
        packet_id: packet.packet_id,
        slug: "filter_slug",
        decision: "PASS_DIRECT_BUYABLE",
        candidate_url: "https://example.com/...",
        final_url: "https://example.com/...",
        browser_truth_classification: "direct_buyable | likely_valid | null",
        exact_tokens_seen: ["OEM-TOKEN"],
        wrong_family_tokens_seen: [],
        buy_action_seen: true,
        reference_only_reason: null,
        evidence_notes: "Playwright/browser proof summary",
        recommended_csv_mutation: null,
        owner_review_required: packet.owner_review_required,
      },
      decisions: AP_AGENT_EVIDENCE_DECISIONS_V1,
      results_path_hint: resultsPathHint(packet.packet_id),
    },
    validation_checklist: validationChecklist,
    owner_review_required: packet.owner_review_required,
    no_commit: true,
    no_deploy: true,
    read_only: true,
    data_mutation: false,
    generated_at: generatedAt,
    ...(packet.packet_id === "ap-blueair-catalog-identity-v1"
      ? { catalog_identity_gaps: lane.catalog_identity_gaps }
      : {}),
  };
}

function supplementalAmazonPacket(lane: AirPurifierBatchProductionLaneReportV1): ApAgentWorkPacketV1 | null {
  const ownerReviewSlugs = lane.blocked_or_rejected
    .filter((c) => c.state === "owner_review")
    .map((c) => c.filter_slug);
  if (ownerReviewSlugs.length === 0) return null;
  return {
    packet_id: "ap-amazon-secondary-v1",
    pattern: "amazon_secondary_verification",
    candidate_slugs: ownerReviewSlugs.slice(0, 10),
    max_rows: 10,
    task_type: "amazon_secondary_verification",
    exact_proof_required: "Amazon /dp/ page: exact OEM token visible + purchase UI",
    allowed_mutations: ["Primary promotion or Amazon browser_truth after owner policy"],
    reject_rules: ["No primary flip without token proof"],
    owner_review_required: true,
  };
}

function supplementalSharkPacket(lane: AirPurifierBatchProductionLaneReportV1): ApAgentWorkPacketV1 | null {
  const slugs = [
    ...lane.reference_link_candidates.filter((c) => c.state === "reference_candidate"),
    ...lane.top_candidates.filter((c) => c.state === "reference_candidate"),
  ].map((c) => c.filter_slug);
  const unique = [...new Set(slugs)];
  if (unique.length === 0) return null;
  return {
    packet_id: "ap-shark-official-reference-v1",
    pattern: "shark_official_reference",
    candidate_slugs: unique.slice(0, 5),
    max_rows: 5,
    task_type: "official_reference_activation",
    exact_proof_required:
      "Official SharkNinja PDP; exact HE* token; stock state; likely_valid if no Add to Cart",
    allowed_mutations: ["likely_valid + notes + checked_at on shark-official primary; no /go"],
    reject_rules: ["No direct_buyable without Add to Cart", "No blueair-style alias"],
    owner_review_required: false,
  };
}

function supplementalHoneywellPacket(lane: AirPurifierBatchProductionLaneReportV1): ApAgentWorkPacketV1 | null {
  const slugs = [
    ...lane.direct_buy_candidates.filter(
      (c) => c.state === "direct_buy_candidate" && c.brand_slug === "honeywell",
    ),
    ...lane.top_candidates.filter(
      (c) => c.state === "direct_buy_candidate" && c.brand_slug === "honeywell",
    ),
  ].map((c) => c.filter_slug);
  const unique = [...new Set(slugs)];
  if (unique.length === 0) return null;
  return {
    packet_id: "ap-honeywell-store-direct-buy-v1",
    pattern: "honeywell_store_direct_buy",
    candidate_slugs: unique.slice(0, 3),
    max_rows: 3,
    task_type: "direct_buy_rescue",
    exact_proof_required: "Honeywell Store PDP: exact HRF-R token + Add to Cart; wrong-family check",
    allowed_mutations: ["browser_truth direct_buyable on existing oem-catalog primary"],
    reject_rules: ["No new rows", "No gate weakening"],
    owner_review_required: false,
  };
}

export function mergeFactoryAndSupplementalPackets(
  lane: AirPurifierBatchProductionLaneReportV1,
): ApAgentWorkPacketV1[] {
  const byId = new Map<string, ApAgentWorkPacketV1>();
  for (const p of lane.agent_work_packets) {
    byId.set(p.packet_id, p);
  }
  for (const supplemental of [
    supplementalAmazonPacket(lane),
    supplementalSharkPacket(lane),
    supplementalHoneywellPacket(lane),
  ]) {
    if (supplemental && !byId.has(supplemental.packet_id)) {
      byId.set(supplemental.packet_id, supplemental);
    }
  }
  const order = [
    "ap-blueair-catalog-identity-v1",
    "ap-levoit-oem-discovery-v1",
    "ap-oem-search-placeholder-v1",
    "ap-amazon-secondary-v1",
    "ap-shark-official-reference-v1",
    "ap-honeywell-store-direct-buy-v1",
  ];
  const out: ApAgentWorkPacketV1[] = [];
  for (const id of order) {
    const p = byId.get(id);
    if (p) out.push(p);
  }
  for (const [id, p] of byId) {
    if (!order.includes(id)) out.push(p);
  }
  return out;
}

export type BuildAirPurifierAgentPacketsDepsV1 = {
  rootDir: string;
  now?: () => Date;
  outDir?: string | null;
  fileExists?: (absolutePath: string) => boolean;
  readTextFile?: (absolutePath: string) => string;
};

export async function buildAirPurifierAgentPacketsV1Report(
  deps: BuildAirPurifierAgentPacketsDepsV1,
): Promise<AirPurifierAgentPacketsReportV1> {
  const now = deps.now ?? (() => new Date());
  const generatedAt = now().toISOString();
  const lane = await buildAirPurifierBatchProductionLaneV1Report({ rootDir: deps.rootDir });
  const merged = mergeFactoryAndSupplementalPackets(lane);

  const packets = merged.map((packet) =>
    enrichPacketArtifact({ packet, lane, generatedAt }),
  );

  const filesWritten: string[] = [];
  const outDir = deps.outDir?.trim() || null;

  if (outDir) {
    const absOut = path.isAbsolute(outDir) ? outDir : path.join(deps.rootDir, outDir);
    mkdirSync(absOut, { recursive: true });

    const manifest = {
      contract: AIR_PURIFIER_AGENT_PACKETS_CONTRACT_V1,
      generated_at: generatedAt,
      packet_count: packets.length,
      packet_ids: packets.map((p) => p.packet_id),
      read_only: true,
      data_mutation: false,
      no_commit: true,
      no_deploy: true,
    };
    const manifestPath = path.join(absOut, "manifest.json");
    writeFileSync(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`, "utf8");
    filesWritten.push(manifestPath);

    for (const artifact of packets) {
      const filePath = path.join(absOut, slugifyPacketFilename(artifact.packet_id));
      writeFileSync(filePath, `${JSON.stringify(artifact, null, 2)}\n`, "utf8");
      filesWritten.push(filePath);
    }
  }

  return {
    report_name: "air_purifier_agent_packets_v1",
    read_only: true,
    data_mutation: false,
    generated_at: generatedAt,
    source_factory_report: "air_purifier_batch_production_lane_v1",
    packet_count: packets.length,
    packets,
    out_dir: outDir,
    files_written: filesWritten,
    notes: [
      "Artifacts are lane-local working copies under data/air-purifier/batch-production/ — not canonical truth until owner review.",
      "Agents return evidence JSON to data/air-purifier/batch-production/agent-results/ (create if needed); do not mutate CSVs.",
      "Packet list merges factory agent_work_packets plus supplemental amazon/shark/honeywell packets when candidates exist.",
    ],
  };
}

export function parseAirPurifierAgentPacketsCliArgsV1(argv: string[]): {
  outDir: string | null;
} {
  const idx = argv.indexOf("--out-dir");
  if (idx < 0) return { outDir: null };
  const value = argv[idx + 1]?.trim();
  if (!value) {
    throw new Error("--out-dir requires a directory path");
  }
  return { outDir: value };
}

export function assertApAgentPacketOutDirAllowedV1(outDir: string, rootDir: string): void {
  const abs = path.isAbsolute(outDir) ? outDir : path.resolve(rootDir, outDir);
  const normalized = abs.replace(/\\/g, "/");
  if (!normalized.includes("/data/air-purifier/batch-production/")) {
    throw new Error(
      `--out-dir must be under data/air-purifier/batch-production/ (got ${outDir})`,
    );
  }
}

export function touchCsvMtimeForReadOnlyTest(absPath: string): number {
  return statSync(absPath).mtimeMs;
}

export function readCsvContentForReadOnlyTest(absPath: string): string {
  return readFileSync(absPath, "utf8");
}

export function csvExistsForReadOnlyTest(absPath: string): boolean {
  return existsSync(absPath);
}
