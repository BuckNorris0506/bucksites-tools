/**
 * Air Purifier reference adapter v1 — read-only projection into UCF contracts.
 * No CSV/Supabase/CC writes; no new core contract types.
 */

import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import path from "node:path";

import { HOMEKEEP_WEDGE_CATALOG } from "@/lib/catalog/identity";

import {
  COVERAGE_ASSESSMENT_CONTRACT_V1,
  type CoverageAssessmentDispositionV1,
  type CoverageAssessmentV1,
} from "../coverage-assessment-v1";
import {
  COVERAGE_EVIDENCE_CONTRACT_V1,
  type CoverageEvidenceClaimStatusV1,
  type CoverageEvidenceV1,
} from "../coverage-evidence-v1";
import { DEFAULT_COVERAGE_EVIDENCE_REQUIREMENTS_V1 } from "../coverage-evidence-requirements-v1";
import type { CoverageLegacyMapEntryV1, CoverageLegacyMapV1 } from "../coverage-legacy-map-v1";
import type { CoverageProvenanceRefV1 } from "../coverage-provenance-ref-v1";
import { COVERAGE_RUN_MANIFEST_CONTRACT_V1, type CoverageRunManifestV1 } from "../coverage-run-manifest-v1";
import { COVERAGE_SUBJECT_CONTRACT_V1, type CoverageSubjectV1 } from "../coverage-subject-v1";
import { buildCoverageSubjectIdV1 } from "../coverage-subject-id-v1";
import { COVERAGE_SUBJECT_LINK_CONTRACT_V1, type CoverageSubjectLinkV1 } from "../coverage-subject-link-v1";
import {
  COVERAGE_WORK_ITEM_CONTRACT_V1,
  type CoverageWorkItemActionClassV1,
  type CoverageWorkItemV1,
} from "../coverage-work-item-v1";

export const COVERAGE_FACTORY_SCHEMA_VERSION_AP_ADAPTER_V1 = "1.0.0" as const;

export const AP_COVERAGE_FACTORY_ADAPTER_ID_V1 = "ap_coverage_factory_reference_adapter_v1" as const;

export const AP_MODEL_FIRST_EVIDENCE_RESULT_CONTRACT_V1 =
  "air_purifier_model_first_evidence_result_v1" as const;

export const AP_MODEL_FIRST_RESULTS_DIR_REL_V1 =
  "data/air-purifier/batch-production/agent-results-model-first-v1" as const;

/** AP lane dispositions projected by this reference adapter. */
export const AP_COVERAGE_DISPOSITIONS_V1 = [
  "SAFE_TO_PROGRESS",
  "HOLD",
  "EXCLUDE",
  "NO_SAFE_PATH",
] as const;

export type ApCoverageDispositionV1 = (typeof AP_COVERAGE_DISPOSITIONS_V1)[number];

export type ApCoverageDispositionMappingV1 = {
  ap_disposition: ApCoverageDispositionV1;
  core_disposition: CoverageAssessmentDispositionV1;
  adapter_state: string;
  evidence_dimension_hints: CoverageLegacyMapEntryV1["evidence_dimension_hints"];
};

export const AP_COVERAGE_DISPOSITION_MAPPING_TABLE_V1: readonly ApCoverageDispositionMappingV1[] = [
  {
    ap_disposition: "SAFE_TO_PROGRESS",
    core_disposition: "ready_for_change_planning",
    adapter_state: "SAFE_TO_PROGRESS",
    evidence_dimension_hints: {
      identity: "proven",
      fit: "proven",
      buyer_path: "proven",
    },
  },
  {
    ap_disposition: "HOLD",
    core_disposition: "research_buyer_path",
    adapter_state: "HOLD",
    evidence_dimension_hints: {
      identity: "proven",
      fit: "proven",
      buyer_path: "unknown",
    },
  },
  {
    ap_disposition: "EXCLUDE",
    core_disposition: "suppressed",
    adapter_state: "EXCLUDE",
    evidence_dimension_hints: {
      identity: "proven",
      fit: "proven",
      buyer_path: "blocked",
    },
  },
  {
    ap_disposition: "NO_SAFE_PATH",
    core_disposition: "suppressed",
    adapter_state: "NO_SAFE_PATH",
    evidence_dimension_hints: {
      identity: "unknown",
      fit: "unknown",
      buyer_path: "unknown",
    },
  },
] as const;

export const AP_COVERAGE_LEGACY_MAP_V1: CoverageLegacyMapV1 = {
  contract: "coverage_legacy_map_v1",
  schema_version: COVERAGE_FACTORY_SCHEMA_VERSION_AP_ADAPTER_V1,
  entries: AP_COVERAGE_DISPOSITION_MAPPING_TABLE_V1.map((row) => ({
    legacy_label: row.ap_disposition,
    core_disposition: row.core_disposition,
    adapter_state: row.adapter_state,
    evidence_dimension_hints: row.evidence_dimension_hints,
  })),
  read_only: true,
  data_mutation: false,
  mutation_authorized: false,
  production_mutation_authorized: false,
};

export type ApModelFirstArtifactV1 = {
  contract: typeof AP_MODEL_FIRST_EVIDENCE_RESULT_CONTRACT_V1;
  packet_id: string;
  run_id: string;
  anchor_filter_slug: string;
  filter_slug?: string;
  read_only: true;
  data_mutation: false;
  generated_at: string;
  safe_apply_authorized?: boolean;
  browser_truth_classification?: string | null;
  filter_identity?: {
    primary_product_title?: string | null;
    exact_sku_or_part_numbers?: string[];
    exact_sku_or_part_number?: string | null;
    official_pdp_url?: string | null;
    naming_bridge_required?: boolean;
    naming_bridge_target?: string | null;
  };
  model_slugs_checked?: string[];
  model_rows?: Array<{
    model_slug: string;
    model_number?: string | null;
    model_filter_classification?: string;
    evidence_status?: string;
    buyer_path_status?: string;
  }>;
  verdict?: string | null;
  recommended_disposition?: string | null;
  blockers?: string[];
  proven_facts?: string[];
};

export type ApRepoCatalogSnapshotV1 = {
  filter_slug: string;
  oem_part_number: string;
  display_name: string;
  primary_url: string | null;
  browser_truth_classification: string | null;
  model_slugs: string[];
  ap_disposition: ApCoverageDispositionV1;
  blockers: string[];
  proven_facts: string[];
  packet_id: string;
  run_id: string;
  generated_at: string;
};

export type ApCoverageFactoryProjectionV1 = {
  adapter_id: typeof AP_COVERAGE_FACTORY_ADAPTER_ID_V1;
  schema_version: typeof COVERAGE_FACTORY_SCHEMA_VERSION_AP_ADAPTER_V1;
  read_only: true;
  data_mutation: false;
  subjects: CoverageSubjectV1[];
  evidence: CoverageEvidenceV1[];
  assessments: CoverageAssessmentV1[];
  work_items: CoverageWorkItemV1[];
  subject_links: CoverageSubjectLinkV1[];
  run_manifest: CoverageRunManifestV1;
  disposition_mappings: readonly ApCoverageDispositionMappingV1[];
  source_artifact_paths: string[];
};

function packetRef(packetId: string): CoverageProvenanceRefV1 {
  return { kind: "packet_id", packet_id: packetId };
}

function artifactHashRef(label: string, absolutePath: string): CoverageProvenanceRefV1 {
  const content = readFileSync(absolutePath, "utf8");
  const hash = createHash("sha256").update(content).digest("hex");
  return { kind: "artifact_path_hash", label, hash: `sha256:${hash}` };
}

export function normalizeApDispositionV1(artifact: ApModelFirstArtifactV1): ApCoverageDispositionV1 {
  const raw = (artifact.recommended_disposition ?? artifact.verdict ?? "").trim().toUpperCase();

  if (raw === "SAFE_TO_PROGRESS" || raw.startsWith("SAFE_TO_PROGRESS")) {
    return "SAFE_TO_PROGRESS";
  }
  if (raw === "NO_SAFE_PATH_FOUND" || raw === "NO_SAFE_PATH" || raw.includes("NO_SAFE_PATH")) {
    return "NO_SAFE_PATH";
  }
  if (raw === "REJECT" || raw.startsWith("REJECT")) {
    return "EXCLUDE";
  }
  if (raw === "HOLD" || raw.includes("HOLD")) {
    return "HOLD";
  }

  const buyerUnknown = artifact.model_rows?.some((row) =>
    (row.buyer_path_status ?? "").includes("SEARCH_PLACEHOLDER"),
  );
  if (buyerUnknown && artifact.safe_apply_authorized === false) {
    return "HOLD";
  }

  return "HOLD";
}

export function mapApDispositionToUcfV1(
  apDisposition: ApCoverageDispositionV1,
): ApCoverageDispositionMappingV1 {
  const row = AP_COVERAGE_DISPOSITION_MAPPING_TABLE_V1.find(
    (entry) => entry.ap_disposition === apDisposition,
  );
  if (!row) {
    throw new Error(`Unknown AP disposition: ${apDisposition}`);
  }
  return row;
}

function claimStatusForDimension(
  dimension: keyof ApCoverageDispositionMappingV1["evidence_dimension_hints"],
  artifact: ApModelFirstArtifactV1 | ApRepoCatalogSnapshotV1,
  mapping: ApCoverageDispositionMappingV1,
): CoverageEvidenceClaimStatusV1 {
  const hinted = mapping.evidence_dimension_hints[dimension];
  if (hinted) return hinted;

  if ("model_rows" in artifact && artifact.model_rows) {
    if (dimension === "identity") {
      const hasIdentity =
        artifact.filter_identity?.exact_sku_or_part_numbers?.length ||
        artifact.filter_identity?.exact_sku_or_part_number ||
        artifact.filter_identity?.official_pdp_url;
      return hasIdentity ? "proven" : "unknown";
    }
    if (dimension === "fit") {
      const provenFit = artifact.model_rows.some(
        (row) => row.model_filter_classification === "PROVEN_FITS",
      );
      return provenFit ? "proven" : "unknown";
    }
    if (dimension === "buyer_path") {
      const directBuyable = artifact.model_rows.some((row) =>
        (row.buyer_path_status ?? "").includes("DIRECT_BUYABLE"),
      );
      if (directBuyable || artifact.browser_truth_classification === "direct_buyable") {
        return "proven";
      }
      const blocked = artifact.model_rows.some((row) =>
        (row.buyer_path_status ?? "").includes("OUT_OF_STOCK"),
      );
      return blocked ? "blocked" : "unknown";
    }
  }

  if ("browser_truth_classification" in artifact && dimension === "buyer_path") {
    if (artifact.browser_truth_classification === "direct_buyable") return "proven";
    if (artifact.browser_truth_classification === null) return "unknown";
    return "blocked";
  }

  return "unknown";
}

function buildSubjectForFilterSlug(filterSlug: string, artifact: ApModelFirstArtifactV1): CoverageSubjectV1 {
  const replacementToken =
    artifact.filter_identity?.exact_sku_or_part_numbers?.[0] ??
    artifact.filter_identity?.exact_sku_or_part_number ??
    null;

  return {
    contract: COVERAGE_SUBJECT_CONTRACT_V1,
    subject_id: buildCoverageSubjectIdV1({
      wedge: HOMEKEEP_WEDGE_CATALOG.air_purifier,
      kind_segment: "filter",
      local_key: filterSlug,
    }),
    wedge: HOMEKEEP_WEDGE_CATALOG.air_purifier,
    kind: "replacement_part",
    internal_slug_labels: [filterSlug],
    official_model_token: null,
    official_replacement_token: replacementToken,
    official_replacement_name: artifact.filter_identity?.primary_product_title ?? null,
    read_only: true,
    data_mutation: false,
  };
}

function buildEvidenceForSubject(
  subject: CoverageSubjectV1,
  artifact: ApModelFirstArtifactV1 | ApRepoCatalogSnapshotV1,
  mapping: ApCoverageDispositionMappingV1,
): CoverageEvidenceV1 {
  const packetId = artifact.packet_id;
  const ref = packetRef(packetId);

  const claims = {
    identity: {
      dimension: "identity" as const,
      status: claimStatusForDimension("identity", artifact, mapping),
      provenance_refs: [] as CoverageProvenanceRefV1[],
      summary: null,
    },
    fit: {
      dimension: "fit" as const,
      status: claimStatusForDimension("fit", artifact, mapping),
      provenance_refs: [] as CoverageProvenanceRefV1[],
      summary: null,
    },
    buyer_path: {
      dimension: "buyer_path" as const,
      status: claimStatusForDimension("buyer_path", artifact, mapping),
      provenance_refs: [] as CoverageProvenanceRefV1[],
      summary: null,
    },
    demand: {
      dimension: "demand" as const,
      status: "not_applicable" as const,
      provenance_refs: [],
      summary: null,
    },
    publication: {
      dimension: "publication" as const,
      status: "not_applicable" as const,
      provenance_refs: [],
      summary: null,
    },
  };

  for (const dimension of ["identity", "fit", "buyer_path"] as const) {
    if (claims[dimension].status === "proven") {
      claims[dimension].provenance_refs = [ref];
    }
  }

  return {
    contract: COVERAGE_EVIDENCE_CONTRACT_V1,
    subject_id: subject.subject_id,
    claims,
    read_only: true,
    data_mutation: false,
  };
}

function buildAssessmentForSubject(
  subject: CoverageSubjectV1,
  artifact: ApModelFirstArtifactV1 | ApRepoCatalogSnapshotV1,
  mapping: ApCoverageDispositionMappingV1,
): CoverageAssessmentV1 {
  const blockers =
    "blockers" in artifact && Array.isArray(artifact.blockers) ? artifact.blockers : [];
  const policyApplyAllowed =
    "safe_apply_authorized" in artifact ? artifact.safe_apply_authorized === true : false;

  return {
    contract: COVERAGE_ASSESSMENT_CONTRACT_V1,
    subject_id: subject.subject_id,
    core_disposition: mapping.core_disposition,
    adapter_state: mapping.adapter_state,
    policy_apply_allowed: policyApplyAllowed,
    blockers,
    read_only: true,
    data_mutation: false,
    mutation_authorized: false,
    production_mutation_authorized: false,
  };
}

function workItemActionForDisposition(
  mapping: ApCoverageDispositionMappingV1,
): CoverageWorkItemActionClassV1 {
  if (mapping.ap_disposition === "SAFE_TO_PROGRESS") return "PLAN_CHANGE";
  if (mapping.ap_disposition === "HOLD") return "READ_ONLY_RESEARCH";
  if (mapping.ap_disposition === "EXCLUDE" || mapping.ap_disposition === "NO_SAFE_PATH") {
    return "OWNER_REVIEW";
  }
  return "READ_ONLY_RESEARCH";
}

function buildWorkItemForSubject(
  subject: CoverageSubjectV1,
  artifact: ApModelFirstArtifactV1 | ApRepoCatalogSnapshotV1,
  mapping: ApCoverageDispositionMappingV1,
): CoverageWorkItemV1 {
  const requiresOwnerReview =
    mapping.ap_disposition === "SAFE_TO_PROGRESS" ||
    mapping.ap_disposition === "EXCLUDE" ||
    mapping.ap_disposition === "HOLD";

  return {
    contract: COVERAGE_WORK_ITEM_CONTRACT_V1,
    work_item_id: `ap-ucf-${subject.internal_slug_labels[0]}`,
    subject_ids: [subject.subject_id],
    required_evidence_checks: [...DEFAULT_COVERAGE_EVIDENCE_REQUIREMENTS_V1.promotion_dimensions],
    permitted_action_class: workItemActionForDisposition(mapping),
    requires_owner_review: requiresOwnerReview,
    priority_score: mapping.ap_disposition === "SAFE_TO_PROGRESS" ? 100 : 10,
    blockers: artifact.blockers ?? [],
    read_only: true,
    data_mutation: false,
    mutation_authorized: false,
    production_mutation_authorized: false,
    artifact_write_authorized: false,
  };
}

function buildSubjectLinks(
  filterSubject: CoverageSubjectV1,
  artifact: ApModelFirstArtifactV1 | ApRepoCatalogSnapshotV1,
): CoverageSubjectLinkV1[] {
  const modelSlugs =
    "model_slugs_checked" in artifact && artifact.model_slugs_checked
      ? artifact.model_slugs_checked
      : "model_slugs" in artifact
        ? artifact.model_slugs
        : [];

  return modelSlugs.map((modelSlug) => ({
    contract: COVERAGE_SUBJECT_LINK_CONTRACT_V1,
    from_subject_id: buildCoverageSubjectIdV1({
      wedge: HOMEKEEP_WEDGE_CATALOG.air_purifier,
      kind_segment: "model",
      local_key: modelSlug,
    }),
    to_subject_id: filterSubject.subject_id,
    link_kind: "fits" as const,
    read_only: true,
    data_mutation: false,
  }));
}

export function projectApModelFirstArtifactV1(args: {
  artifact: ApModelFirstArtifactV1;
  sourceArtifactPath: string;
}): Omit<
  ApCoverageFactoryProjectionV1,
  "run_manifest" | "disposition_mappings" | "source_artifact_paths"
> {
  const apDisposition = normalizeApDispositionV1(args.artifact);
  const mapping = mapApDispositionToUcfV1(apDisposition);
  const filterSlug = args.artifact.anchor_filter_slug;
  const subject = buildSubjectForFilterSlug(filterSlug, args.artifact);

  return {
    adapter_id: AP_COVERAGE_FACTORY_ADAPTER_ID_V1,
    schema_version: COVERAGE_FACTORY_SCHEMA_VERSION_AP_ADAPTER_V1,
    read_only: true,
    data_mutation: false,
    subjects: [subject],
    evidence: [buildEvidenceForSubject(subject, args.artifact, mapping)],
    assessments: [buildAssessmentForSubject(subject, args.artifact, mapping)],
    work_items: [buildWorkItemForSubject(subject, args.artifact, mapping)],
    subject_links: buildSubjectLinks(subject, args.artifact),
  };
}

export function projectApRepoCatalogSnapshotV1(
  snapshot: ApRepoCatalogSnapshotV1,
): Omit<
  ApCoverageFactoryProjectionV1,
  "run_manifest" | "disposition_mappings" | "source_artifact_paths"
> {
  const mapping = mapApDispositionToUcfV1(snapshot.ap_disposition);
  const artifactLike: ApModelFirstArtifactV1 = {
    contract: AP_MODEL_FIRST_EVIDENCE_RESULT_CONTRACT_V1,
    packet_id: snapshot.packet_id,
    run_id: snapshot.run_id,
    anchor_filter_slug: snapshot.filter_slug,
    read_only: true,
    data_mutation: false,
    generated_at: snapshot.generated_at,
    safe_apply_authorized: false,
    browser_truth_classification: snapshot.browser_truth_classification,
    filter_identity: {
      primary_product_title: snapshot.display_name,
      exact_sku_or_part_number: snapshot.oem_part_number,
      official_pdp_url: snapshot.primary_url,
    },
    model_slugs_checked: snapshot.model_slugs,
    model_rows: snapshot.model_slugs.map((modelSlug) => ({
      model_slug: modelSlug,
      model_filter_classification: "PROVEN_FITS",
      buyer_path_status:
        snapshot.browser_truth_classification === "direct_buyable"
          ? "DIRECT_BUYABLE_OFFICIAL_PDP"
          : "SEARCH_PLACEHOLDER_PRIMARY",
    })),
    blockers: snapshot.blockers,
    proven_facts: snapshot.proven_facts,
  };

  const subject = buildSubjectForFilterSlug(snapshot.filter_slug, artifactLike);

  return {
    adapter_id: AP_COVERAGE_FACTORY_ADAPTER_ID_V1,
    schema_version: COVERAGE_FACTORY_SCHEMA_VERSION_AP_ADAPTER_V1,
    read_only: true,
    data_mutation: false,
    subjects: [subject],
    evidence: [buildEvidenceForSubject(subject, snapshot, mapping)],
    assessments: [buildAssessmentForSubject(subject, snapshot, mapping)],
    work_items: [buildWorkItemForSubject(subject, snapshot, mapping)],
    subject_links: buildSubjectLinks(subject, snapshot),
  };
}

export function loadApModelFirstArtifactV1(
  rootDir: string,
  filterSlug: string,
): { artifact: ApModelFirstArtifactV1; sourceArtifactPath: string } | null {
  const dir = path.join(rootDir, AP_MODEL_FIRST_RESULTS_DIR_REL_V1);
  const suffix = `${filterSlug}`;
  const candidates = [
    `ap-model-first-${suffix}-live-browser-v1.results.json`,
    `ap-model-first-${suffix}-v1.results.json`,
    `ap-model-first-${suffix}.results.json`,
  ];

  for (const fileName of candidates) {
    const absolutePath = path.join(dir, fileName);
    try {
      const raw = JSON.parse(readFileSync(absolutePath, "utf8")) as ApModelFirstArtifactV1;
      if (raw.contract !== AP_MODEL_FIRST_EVIDENCE_RESULT_CONTRACT_V1) continue;
      return { artifact: raw, sourceArtifactPath: path.join(AP_MODEL_FIRST_RESULTS_DIR_REL_V1, fileName) };
    } catch {
      continue;
    }
  }
  return null;
}

/** Committed repo catalog truth for vornado-md1-0022 (no dedicated model-first artifact). */
export const AP_VORNADO_MD1_0022_REPO_SNAPSHOT_V1: ApRepoCatalogSnapshotV1 = {
  filter_slug: "vornado-md1-0022",
  oem_part_number: "VORNADO-MD1-0022",
  display_name: "True HEPA Filter (MD1-0022)",
  primary_url: "https://www.vornado.com/search?q=MD1-0022",
  browser_truth_classification: null,
  model_slugs: ["vornado-ac350", "vornado-ac500", "vornado-ac550", "vornado-ac500b", "vornado-ac550w"],
  ap_disposition: "HOLD",
  blockers: [
    "SEARCH_PLACEHOLDER_PRIMARY on vornado-md1-0022 — no bounded MD1-0022 HEPA PDP browser evidence in repo.",
    "Companion carbon SKU MD1-0023 is direct_buyable on vornado-carbon-pad (separate slug).",
  ],
  proven_facts: [
    "PROVEN: post-repair CSV identity vornado-md1-0022 / VORNADO-MD1-0022 at f3c2141.",
    "PROVEN: AC-family HEPA compat remapped to vornado-md1-0022.",
    "UNKNOWN: official MD1-0022 HEPA PDP buyability — not opened in demand-selected bounded attempt.",
  ],
  packet_id: "ap-repo-catalog-truth-vornado-md1-0022-v1",
  run_id: "ap-repo-catalog-truth-vornado-md1-0022-v1",
  generated_at: "2026-06-10T12:00:00.000Z",
};

export function buildApCoverageFactoryReferenceProjectionV1(args: {
  rootDir: string;
  filterSlugs: string[];
  now?: () => Date;
}): ApCoverageFactoryProjectionV1 {
  const now = args.now ?? (() => new Date());
  const subjects: CoverageSubjectV1[] = [];
  const evidence: CoverageEvidenceV1[] = [];
  const assessments: CoverageAssessmentV1[] = [];
  const work_items: CoverageWorkItemV1[] = [];
  const subject_links: CoverageSubjectLinkV1[] = [];
  const source_artifact_paths: string[] = [];
  const assessment_counts: Record<string, number> = {};

  for (const filterSlug of args.filterSlugs) {
    let partial: Omit<
      ApCoverageFactoryProjectionV1,
      "run_manifest" | "disposition_mappings" | "source_artifact_paths"
    >;

    if (filterSlug === "vornado-md1-0022") {
      partial = projectApRepoCatalogSnapshotV1(AP_VORNADO_MD1_0022_REPO_SNAPSHOT_V1);
      source_artifact_paths.push(
        "data/air-purifier/batch-production/audits/ap-demand-selected-correctness-risks-v1.json",
      );
    } else {
      const loaded = loadApModelFirstArtifactV1(args.rootDir, filterSlug);
      if (!loaded) {
        throw new Error(`Missing AP model-first artifact for ${filterSlug}`);
      }
      partial = projectApModelFirstArtifactV1(loaded);
      source_artifact_paths.push(loaded.sourceArtifactPath);
    }

    subjects.push(...partial.subjects);
    evidence.push(...partial.evidence);
    assessments.push(...partial.assessments);
    work_items.push(...partial.work_items);
    subject_links.push(...partial.subject_links);

    for (const assessment of partial.assessments) {
      assessment_counts[assessment.core_disposition] =
        (assessment_counts[assessment.core_disposition] ?? 0) + 1;
    }
  }

  const input_artifact_hashes: Record<string, string> = {};
  for (const relPath of source_artifact_paths) {
    const absolutePath = path.join(args.rootDir, relPath);
    const ref = artifactHashRef(relPath, absolutePath);
    if (ref.kind === "artifact_path_hash") {
      input_artifact_hashes[ref.label] = ref.hash;
    }
  }

  const provenance_index_hash = createHash("sha256")
    .update(JSON.stringify(evidence.map((row) => row.claims)))
    .digest("hex");

  const run_manifest: CoverageRunManifestV1 = {
    contract: COVERAGE_RUN_MANIFEST_CONTRACT_V1,
    schema_version: COVERAGE_FACTORY_SCHEMA_VERSION_AP_ADAPTER_V1,
    run_id: `ap-ucf-reference-${now().toISOString().slice(0, 10)}`,
    adapter_id: AP_COVERAGE_FACTORY_ADAPTER_ID_V1,
    adapter_version: "1.0.0",
    wedge: HOMEKEEP_WEDGE_CATALOG.air_purifier,
    generated_at: now().toISOString(),
    input_artifact_hashes,
    assessment_counts: assessment_counts as CoverageRunManifestV1["assessment_counts"],
    subject_count: subjects.length,
    provenance_index_hash: `sha256:${provenance_index_hash}`,
    prior_run_id: null,
    immutable: true,
    read_only: true,
    data_mutation: false,
    mutation_authorized: false,
    production_mutation_authorized: false,
  };

  return {
    adapter_id: AP_COVERAGE_FACTORY_ADAPTER_ID_V1,
    schema_version: COVERAGE_FACTORY_SCHEMA_VERSION_AP_ADAPTER_V1,
    read_only: true,
    data_mutation: false,
    subjects,
    evidence,
    assessments,
    work_items,
    subject_links,
    run_manifest,
    disposition_mappings: AP_COVERAGE_DISPOSITION_MAPPING_TABLE_V1,
    source_artifact_paths,
  };
}

export function apCoverageDispositionMeaningPreservedV1(args: {
  apDisposition: ApCoverageDispositionV1;
  assessment: CoverageAssessmentV1;
}): boolean {
  const mapping = mapApDispositionToUcfV1(args.apDisposition);
  return (
    args.assessment.core_disposition === mapping.core_disposition &&
    args.assessment.adapter_state === mapping.adapter_state
  );
}
