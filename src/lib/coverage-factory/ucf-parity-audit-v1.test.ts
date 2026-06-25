import assert from "node:assert/strict";
import { readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";

import {
  AP_COVERAGE_FACTORY_ADAPTER_ID_V1,
  AP_VORNADO_MD1_0022_REPO_SNAPSHOT_V1,
  buildApCoverageFactoryReferenceProjectionV1,
  buildFridgeCoverageFactoryReferenceProjectionV1,
  buildUcfDecisionAuthoritySnapshotV1,
  buildWhwCoverageFactoryReferenceProjectionV1,
  COMMITTED_UCF_ADAPTER_REFERENCE_FILTER_SLUGS_V1,
  FRIDGE_COVERAGE_FACTORY_ADAPTER_ID_V1,
  loadApModelFirstArtifactV1,
  loadFridgeArtifactsForFilterSlugV1,
  loadWhwArtifactsForFilterSlugV1,
  mapApDispositionToUcfV1,
  mapFridgeDispositionToUcfV1,
  mapWhwDispositionToUcfV1,
  normalizeApDispositionV1,
  projectApModelFirstArtifactV1,
  projectApRepoCatalogSnapshotV1,
  resolveFridgeDispositionV1,
  resolveWhwDispositionV1,
  WHW_COVERAGE_FACTORY_ADAPTER_ID_V1,
} from "./index";
import {
  FRIDGE_MODEL_FILTER_AUDIT_REL_V1,
  projectFridgeLoadedArtifactsV1,
  resetFridgeAdapterAuditCacheV1,
} from "./adapters/fridge-coverage-factory-adapter-v1";
import { projectWhwLoadedArtifactsV1 } from "./adapters/whw-coverage-factory-adapter-v1";
import {
  assessUcfCanonicalReadinessV1,
  UCF_CANONICAL_READINESS_GOVERNANCE_CLASSES_V1,
  type UcfParityFindingV1,
} from "./ucf-canonical-readiness-policy-v1";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../..");

type Mismatch = UcfParityFindingV1;

const EVIDENCE_DIMS = ["identity", "fit", "buyer_path", "demand", "publication"] as const;

function discoverApSlugs(): string[] {
  const dir = path.join(ROOT, "data/air-purifier/batch-production/agent-results-model-first-v1");
  const slugs = new Set<string>(["vornado-md1-0022"]);
  for (const f of readdirSync(dir)) {
    if (!f.startsWith("ap-model-first-") || !f.endsWith(".results.json")) continue;
    const rest = f.slice("ap-model-first-".length, -".results.json".length);
    slugs.add(rest.replace(/-live-browser-v1$/, "").replace(/-v1$/, ""));
  }
  return [...slugs].sort();
}

function discoverWhwSlugs(): string[] {
  const slugs = new Set<string>();
  for (const dirRel of [
    "data/whole-house-water/batch-production/agent-results-model-first-v1",
    "data/whole-house-water/batch-production/agent-results-buyer-path-v1",
    "data/whole-house-water/batch-production/browser-truth-results-v1",
  ]) {
    for (const f of readdirSync(path.join(ROOT, dirRel))) {
      if (f.includes("batch-test-write")) continue;
      for (const p of [
        /whw-model-first-(.+?)-(?:live-browser-v1|director-batch-v1)\.results\.json/,
        /whw-buyer-path-(.+?)-(?:batch-v1|live-browser-v1)\.results\.json/,
        /whw-browser-truth-(.+?)-v1\.results\.json/,
      ]) {
        const m = f.match(p);
        if (m) slugs.add(m[1]);
      }
    }
  }
  const batch = JSON.parse(
    readFileSync(
      path.join(
        ROOT,
        "data/whole-house-water/batch-production/agent-results-model-first-batch-v1/whw-model-first-batch-v1.results.json",
      ),
      "utf8",
    ),
  );
  for (const row of batch.candidates_checked ?? []) slugs.add(row.filter_slug);
  return [...slugs].sort();
}

function discoverFridgeSlugs(): string[] {
  const slugs = new Set<string>();
  const batch = JSON.parse(
    readFileSync(
      path.join(ROOT, "data/fridge/batch-production/drafts/fridge-safe-link-batch-factory-v1.json"),
      "utf8",
    ),
  );
  for (const row of batch.rows ?? []) slugs.add(row.slug);
  const lines = readFileSync(
    path.join(ROOT, "data/fridge/batch-production/audits/model-filter-correctness-audit-v1.csv"),
    "utf8",
  )
    .trim()
    .split("\n");
  const slugIdx = lines[0].split(",").indexOf("filter_slug");
  for (const line of lines.slice(1)) {
    const cols = line.split(",");
    if (cols[slugIdx]) slugs.add(cols[slugIdx]);
  }
  for (const s of ["rpwfe", "adq36006101", "edr2rxd1"]) slugs.add(s);
  return [...slugs].sort();
}

function loadFridgeAuditModelRows(): { model_rows?: unknown[] }["model_rows"] {
  const raw = JSON.parse(
    readFileSync(path.join(ROOT, FRIDGE_MODEL_FILTER_AUDIT_REL_V1), "utf8"),
  ) as { model_rows?: unknown[] };
  return raw.model_rows ?? [];
}

function evidenceSnapshot(evidence: { claims: Record<string, { status: string }> }) {
  return Object.fromEntries(
    EVIDENCE_DIMS.map((dim) => [dim, evidence.claims[dim]?.status ?? "missing"]),
  );
}

test("UCF parity audit v1 inventory", () => {
  resetFridgeAdapterAuditCacheV1();
  const fridgeAuditModelRows = loadFridgeAuditModelRows();

  const mismatches: Mismatch[] = [];
  const loadable = { ap: [] as string[], whw: [] as string[], fridge: [] as string[] };
  const unloadable = { ap: [] as string[], whw: [] as string[], fridge: [] as string[] };
  const promotedByUcfNotSource = new Set<string>();
  const suppressedByUcfNotSource = new Set<string>();
  const evidenceDimensionDiffSubjects = new Set<string>();
  const workRecommendationDiffSubjects = new Set<string>();

  function recordDispositionDelta(
    wedge: string,
    subjectId: string,
    lane: string,
    mappingDisposition: string,
    actualDisposition: string,
  ) {
    if (mappingDisposition === actualDisposition) return;
    const mappingSuppressed = mappingDisposition === "suppressed";
    const actualSuppressed = actualDisposition === "suppressed";
    if (!mappingSuppressed && actualSuppressed) suppressedByUcfNotSource.add(subjectId);
    if (mappingSuppressed && !actualSuppressed) promotedByUcfNotSource.add(subjectId);
    mismatches.push({
      wedge,
      subject_id: subjectId,
      source_truth: { lane, mapping_core_disposition: mappingDisposition },
      ucf_truth: { core_disposition: actualDisposition },
      mismatch_type: "UCF_CONTRACT_INTERPRETATION",
      severity: actualDisposition === "ready_for_change_planning" ? "high" : "medium",
      evidence: `mapping=${mappingDisposition} projection=${actualDisposition}`,
    });
  }

  for (const slug of discoverApSlugs()) {
    try {
      let partial;
      let lane: string;
      if (slug === "vornado-md1-0022") {
        lane = AP_VORNADO_MD1_0022_REPO_SNAPSHOT_V1.ap_disposition;
        partial = projectApRepoCatalogSnapshotV1(AP_VORNADO_MD1_0022_REPO_SNAPSHOT_V1);
      } else {
        const loaded = loadApModelFirstArtifactV1(ROOT, slug);
        if (!loaded) {
          unloadable.ap.push(slug);
          continue;
        }
        lane = normalizeApDispositionV1(loaded.artifact);
        partial = projectApModelFirstArtifactV1({
          artifact: loaded.artifact,
          sourceArtifactPath: loaded.sourceArtifactPath,
        });
      }
      loadable.ap.push(slug);
      const expected = mapApDispositionToUcfV1(lane as never);
      const assessment = partial.assessments[0]!;
      const evidence = partial.evidence[0]!;
      const subject = partial.subjects[0]!;
      const work = partial.work_items[0]!;

      recordDispositionDelta(
        "air_purifier",
        subject.subject_id,
        lane,
        expected.core_disposition,
        assessment.core_disposition,
      );

      let evidenceDiff = false;
      for (const dim of ["identity", "fit", "buyer_path"] as const) {
        const hint = expected.evidence_dimension_hints[dim];
        if (!hint) continue;
        if (evidence.claims[dim].status !== hint) {
          evidenceDiff = true;
          mismatches.push({
            wedge: "air_purifier",
            subject_id: subject.subject_id,
            source_truth: { lane, mapping_hint: hint },
            ucf_truth: { evidence_status: evidence.claims[dim].status },
            mismatch_type:
              hint === "proven" && evidence.claims[dim].status !== "proven"
                ? "MISSING_EVIDENCE"
                : "UCF_CONTRACT_INTERPRETATION",
            severity:
              assessment.core_disposition === "ready_for_change_planning" ? "high" : "medium",
            evidence: `${dim}: hint=${hint} actual=${evidence.claims[dim].status}`,
          });
        }
      }
      if (evidenceDiff) evidenceDimensionDiffSubjects.add(subject.subject_id);

      if (expected.permitted_action_class && work.permitted_action_class !== expected.permitted_action_class) {
        workRecommendationDiffSubjects.add(subject.subject_id);
        mismatches.push({
          wedge: "air_purifier",
          subject_id: subject.subject_id,
          source_truth: { lane, mapping_work: expected.permitted_action_class },
          ucf_truth: { adapter_work: work.permitted_action_class },
          mismatch_type: "UCF_CONTRACT_INTERPRETATION",
          severity: "medium",
          evidence: "mapping table work class vs adapter work item",
        });
      }
    } catch {
      unloadable.ap.push(slug);
    }
  }

  for (const slug of discoverWhwSlugs()) {
    try {
      const loaded = loadWhwArtifactsForFilterSlugV1(ROOT, slug);
      if (loaded.source_artifact_paths.length === 0) {
        unloadable.whw.push(slug);
        continue;
      }
      loadable.whw.push(slug);
      const lane = resolveWhwDispositionV1(loaded);
      const expected = mapWhwDispositionToUcfV1(lane);
      const partial = projectWhwLoadedArtifactsV1(loaded);
      const assessment = partial.assessments[0]!;
      const evidence = partial.evidence[0]!;
      const subject = partial.subjects[0]!;
      const work = partial.work_items[0]!;

      recordDispositionDelta(
        "whole_house_water",
        subject.subject_id,
        lane,
        expected.core_disposition,
        assessment.core_disposition,
      );

      let evidenceDiff = false;
      for (const dim of ["identity", "fit", "buyer_path", "publication"] as const) {
        const hint = expected.evidence_dimension_hints[dim];
        if (!hint || hint === "not_applicable") continue;
        if (evidence.claims[dim].status !== hint) {
          evidenceDiff = true;
          mismatches.push({
            wedge: "whole_house_water",
            subject_id: subject.subject_id,
            source_truth: { lane, mapping_hint: hint },
            ucf_truth: { evidence_status: evidence.claims[dim].status },
            mismatch_type: "UCF_CONTRACT_INTERPRETATION",
            severity: lane === "APPLY_READY_FOUNDER_APPROVAL_REQUIRED" ? "high" : "medium",
            evidence: `${dim}: hint=${hint} actual=${evidence.claims[dim].status}`,
          });
        }
      }
      if (evidenceDiff) evidenceDimensionDiffSubjects.add(subject.subject_id);

      if (expected.permitted_action_class && work.permitted_action_class !== expected.permitted_action_class) {
        workRecommendationDiffSubjects.add(subject.subject_id);
        mismatches.push({
          wedge: "whole_house_water",
          subject_id: subject.subject_id,
          source_truth: { lane, mapping_work: expected.permitted_action_class },
          ucf_truth: { adapter_work: work.permitted_action_class },
          mismatch_type: "UCF_CONTRACT_INTERPRETATION",
          severity: "medium",
          evidence: "mapping table work class vs adapter work item",
        });
      }
    } catch {
      unloadable.whw.push(slug);
    }
  }

  for (const slug of discoverFridgeSlugs()) {
    try {
      const loaded = loadFridgeArtifactsForFilterSlugV1(ROOT, slug);
      if (loaded.source_artifact_paths.length === 0) {
        unloadable.fridge.push(slug);
        continue;
      }
      loadable.fridge.push(slug);
      const lane = resolveFridgeDispositionV1(loaded);
      const expected = mapFridgeDispositionToUcfV1(lane);
      const partial = projectFridgeLoadedArtifactsV1(loaded, ROOT, fridgeAuditModelRows as never);
      const assessment = partial.assessments[0]!;
      const evidence = partial.evidence[0]!;
      const subject = partial.subjects[0]!;
      const work = partial.work_items[0]!;

      recordDispositionDelta(
        "refrigerator_water",
        subject.subject_id,
        lane,
        expected.core_disposition,
        assessment.core_disposition,
      );

      if (
        assessment.core_disposition === "ready_for_change_planning" &&
        evidence.claims.fit.status === "blocked"
      ) {
        mismatches.push({
          wedge: "refrigerator_water",
          subject_id: subject.subject_id,
          source_truth: { lane, fit: "blocked" },
          ucf_truth: { core_disposition: "ready_for_change_planning" },
          mismatch_type: "LEGACY_LANE_BUG",
          severity: "critical",
          evidence: "rescue disposition overrides audit fit=blocked",
        });
      }

      let evidenceDiff = false;
      for (const dim of ["identity", "fit", "buyer_path"] as const) {
        const hint = expected.evidence_dimension_hints[dim];
        if (!hint) continue;
        if (evidence.claims[dim].status !== hint) {
          evidenceDiff = true;
          mismatches.push({
            wedge: "refrigerator_water",
            subject_id: subject.subject_id,
            source_truth: { lane, mapping_hint: hint },
            ucf_truth: { evidence_status: evidence.claims[dim].status },
            mismatch_type:
              (lane === "RESCUE_BROWSER_PROOF_READY" ||
                lane === "RESCUE_BROWSER_PROOF_READY_MAPPING_BLOCKED") &&
              dim === "fit"
                ? "LEGACY_LANE_BUG"
                : "UCF_CONTRACT_INTERPRETATION",
            severity:
              (lane === "RESCUE_BROWSER_PROOF_READY" ||
                lane === "RESCUE_BROWSER_PROOF_READY_MAPPING_BLOCKED") &&
              dim === "fit"
                ? "critical"
                : "high",
            evidence: `${dim}: hint=${hint} actual=${evidence.claims[dim].status}`,
          });
        }
      }
      if (evidenceDiff) evidenceDimensionDiffSubjects.add(subject.subject_id);

      if (expected.permitted_action_class && work.permitted_action_class !== expected.permitted_action_class) {
        workRecommendationDiffSubjects.add(subject.subject_id);
        mismatches.push({
          wedge: "refrigerator_water",
          subject_id: subject.subject_id,
          source_truth: { lane, mapping_work: expected.permitted_action_class },
          ucf_truth: { adapter_work: work.permitted_action_class },
          mismatch_type: "UCF_CONTRACT_INTERPRETATION",
          severity: "medium",
          evidence: "mapping table work class vs adapter work item",
        });
      }
    } catch {
      unloadable.fridge.push(slug);
    }
  }

  const snapshot = buildUcfDecisionAuthoritySnapshotV1({
    rootDir: ROOT,
    now: () => new Date("2026-06-10T22:00:00.000Z"),
  });
  const factory = snapshot.factory;
  const workGen = snapshot.work_generator;

  const refAp = buildApCoverageFactoryReferenceProjectionV1({
    rootDir: ROOT,
    filterSlugs: [
      ...COMMITTED_UCF_ADAPTER_REFERENCE_FILTER_SLUGS_V1[AP_COVERAGE_FACTORY_ADAPTER_ID_V1],
    ],
  });
  const refWhw = buildWhwCoverageFactoryReferenceProjectionV1({
    rootDir: ROOT,
    filterSlugs: [
      ...COMMITTED_UCF_ADAPTER_REFERENCE_FILTER_SLUGS_V1[WHW_COVERAGE_FACTORY_ADAPTER_ID_V1],
    ],
  });
  const refFridge = buildFridgeCoverageFactoryReferenceProjectionV1({
    rootDir: ROOT,
    filterSlugs: [
      ...COMMITTED_UCF_ADAPTER_REFERENCE_FILTER_SLUGS_V1[FRIDGE_COVERAGE_FACTORY_ADAPTER_ID_V1],
    ],
  });

  const registeredSubjectIds = new Set(factory.subject_rows.map((row) => row.subject_id));

  for (const p of [refAp, refWhw, refFridge]) {
    for (let i = 0; i < p.subjects.length; i++) {
      const subjectId = p.subjects[i]!.subject_id;
      const factoryRow = factory.subject_rows.find((row) => row.subject_id === subjectId);
      const genWork = workGen.work_items.find((w) => w.subject_ids[0] === subjectId);

      if (!factoryRow) {
        mismatches.push({
          wedge: p.subjects[i]!.wedge,
          subject_id: subjectId,
          source_truth: { adapter: "present" },
          ucf_truth: { factory: "missing" },
          mismatch_type: "ADAPTER_BUG",
          severity: "critical",
          evidence: "registered adapter subject missing from universal factory",
        });
        continue;
      }

      if (factoryRow.disposition !== p.assessments[i]!.core_disposition) {
        mismatches.push({
          wedge: p.subjects[i]!.wedge,
          subject_id: subjectId,
          source_truth: { adapter_disposition: p.assessments[i]!.core_disposition },
          ucf_truth: { factory_disposition: factoryRow.disposition },
          mismatch_type: "ADAPTER_BUG",
          severity: "critical",
          evidence: "factory subject_row disposition != adapter assessment",
        });
      }

      const adapterEvidence = evidenceSnapshot(p.evidence[i]!);
      const factoryEvidence = factoryRow.evidence_summary;
      const evidenceKeys = [...new Set([...Object.keys(adapterEvidence), ...Object.keys(factoryEvidence)])];
      if (evidenceKeys.some((key) => adapterEvidence[key] !== factoryEvidence[key])) {
        evidenceDimensionDiffSubjects.add(subjectId);
        mismatches.push({
          wedge: p.subjects[i]!.wedge,
          subject_id: subjectId,
          source_truth: { adapter_evidence: adapterEvidence },
          ucf_truth: { factory_evidence: factoryEvidence },
          mismatch_type: "ADAPTER_BUG",
          severity: "high",
          evidence: "factory evidence_summary != adapter evidence claims",
        });
      }

      if (p.assessments[i]!.core_disposition === "suppressed" && genWork) {
        mismatches.push({
          wedge: p.subjects[i]!.wedge,
          subject_id: subjectId,
          source_truth: { adapter: "suppressed" },
          ucf_truth: { generated_work: genWork.permitted_action_class },
          mismatch_type: "ADAPTER_BUG",
          severity: "critical",
          evidence: "work generator emitted item for suppressed subject",
        });
        workRecommendationDiffSubjects.add(subjectId);
      }

      if (
        p.assessments[i]!.core_disposition !== "suppressed" &&
        p.work_items[i]!.permitted_action_class !== genWork?.permitted_action_class
      ) {
        workRecommendationDiffSubjects.add(subjectId);
        mismatches.push({
          wedge: p.subjects[i]!.wedge,
          subject_id: subjectId,
          source_truth: { adapter_work: p.work_items[i]!.permitted_action_class },
          ucf_truth: { generated_work: genWork?.permitted_action_class ?? "none" },
          mismatch_type: "UCF_CONTRACT_INTERPRETATION",
          severity: "medium",
          evidence: "adapter work item vs universal work generator",
        });
      }
    }
  }

  const totalLoadable = loadable.ap.length + loadable.whw.length + loadable.fridge.length;
  const scaleGap = totalLoadable - factory.subject_rows.length;
  const criticalCount = mismatches.filter((m) => m.severity === "critical").length;
  const registeredMismatches = mismatches.filter((m) => registeredSubjectIds.has(m.subject_id));

  const canonicalReadiness = assessUcfCanonicalReadinessV1({
    findings: mismatches,
    registered_subject_ids: registeredSubjectIds,
    scale_gap: scaleGap,
    work_recommendation_diff_subject_count: workRecommendationDiffSubjects.size,
  });

  const verdict = canonicalReadiness.verdict;
  const canReplaceDecisionLogicToday = canonicalReadiness.can_replace_existing_decision_logic_today;

  const apRegisteredCount =
    COMMITTED_UCF_ADAPTER_REFERENCE_FILTER_SLUGS_V1[AP_COVERAGE_FACTORY_ADAPTER_ID_V1].length;
  const whwRegisteredCount =
    COMMITTED_UCF_ADAPTER_REFERENCE_FILTER_SLUGS_V1[WHW_COVERAGE_FACTORY_ADAPTER_ID_V1].length;
  const fridgeRegisteredCount =
    COMMITTED_UCF_ADAPTER_REFERENCE_FILTER_SLUGS_V1[FRIDGE_COVERAGE_FACTORY_ADAPTER_ID_V1].length;

  const report = {
    subject_counts: {
      air_purifier: {
        discovered: discoverApSlugs().length,
        loadable: loadable.ap.length,
        ucf_registered: apRegisteredCount,
      },
      whole_house_water: {
        discovered: discoverWhwSlugs().length,
        loadable: loadable.whw.length,
        ucf_registered: whwRegisteredCount,
      },
      refrigerator_water: {
        discovered: discoverFridgeSlugs().length,
        loadable: loadable.fridge.length,
        ucf_registered: fridgeRegisteredCount,
      },
      universal_factory_total: factory.subject_rows.length,
      scale_gap_loadable_minus_registered: {
        air_purifier: loadable.ap.length - apRegisteredCount,
        whole_house_water: loadable.whw.length - whwRegisteredCount,
        refrigerator_water: loadable.fridge.length - fridgeRegisteredCount,
        total: scaleGap,
      },
    },
    total_mismatches: mismatches.length,
    critical_mismatches: criticalCount,
    by_type: Object.fromEntries(
      [...new Set(mismatches.map((m) => m.mismatch_type))].map((t) => [
        t,
        mismatches.filter((m) => m.mismatch_type === t).length,
      ]),
    ),
    promoted_by_ucf_not_source_lane: [...promotedByUcfNotSource].sort(),
    suppressed_by_ucf_not_source_lane: [...suppressedByUcfNotSource].sort(),
    evidence_dimension_diff_subjects: [...evidenceDimensionDiffSubjects].sort(),
    work_recommendation_diff_subjects: [...workRecommendationDiffSubjects].sort(),
    registered_subject_mismatch_count: registeredMismatches.length,
    canonical_readiness: {
      contract: canonicalReadiness.contract,
      verdict: canonicalReadiness.verdict,
      registered_canonical_blocker_count: canonicalReadiness.registered_canonical_blocker_count,
      registered_accepted_interpretation_count:
        canonicalReadiness.registered_accepted_interpretation_count,
      registered_governance_debt_count: canonicalReadiness.registered_governance_debt_count,
      registered_adapter_bug_count: canonicalReadiness.registered_adapter_bug_count,
      registered_factory_bug_count: canonicalReadiness.registered_factory_bug_count,
      registered_unknown_count: canonicalReadiness.registered_unknown_count,
      registered_critical_raw_count: canonicalReadiness.registered_critical_raw_count,
      by_governance_class: Object.fromEntries(
        UCF_CANONICAL_READINESS_GOVERNANCE_CLASSES_V1.map((governanceClass) => [
          governanceClass,
          canonicalReadiness.classified_findings.filter(
            (finding) => finding.governance_class === governanceClass,
          ).length,
        ]),
      ),
    },
    can_replace_existing_decision_logic_today: canReplaceDecisionLogicToday,
    verdict,
    classified_findings: canonicalReadiness.classified_findings,
    mismatches,
    unloadable,
  };

  // eslint-disable-next-line no-console -- audit inventory output
  console.log(JSON.stringify(report, null, 2));

  const registeredCritical = registeredMismatches.filter((m) => m.severity === "critical");
  assert.equal(
    registeredCritical.length,
    0,
    `registered subjects must have zero critical parity mismatches: ${JSON.stringify(registeredCritical)}`,
  );
  assert.equal(canonicalReadiness.registered_canonical_blocker_count, 0);
  assert.equal(canonicalReadiness.registered_accepted_interpretation_count, 11);
  assert.equal(verdict, "CANONICAL_READY_WITH_FIXES");

  const rpwfeRegistered = registeredMismatches.filter((m) => m.subject_id.includes("rpwfe"));
  assert.equal(rpwfeRegistered.length, 0, "rpwfe must not appear in registered parity mismatches");
});
