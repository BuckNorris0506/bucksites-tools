import path from "node:path";
import { mkdirSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

import { buildApModelFirstEvidenceQueueV1Report } from "./lib/ap-model-first-evidence-queue-v1";
import {
  AP_MODEL_FIRST_EVIDENCE_RESULTS_DIR_REL_V1,
  buildModelFirstEvidenceResultV1,
  loadAllRepoModelSlugsForAnchorFilterV1,
} from "./lib/air-purifier-model-first-evidence-result-v1";
import type { ApModelFirstEvidenceQueueReportV1 } from "./lib/ap-model-first-evidence-queue-v1";
import { buildAirPurifierModelFirstProductionLaneV1Report } from "./lib/air-purifier-model-first-production-lane-v1";
import { buildAirPurifierWeakBuyerPathAuditV1Report } from "./lib/air-purifier-weak-buyer-path-audit-v1";

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

function parseArgs(argv: string[]): {
  anchorFilterSlug: string | null;
  write: boolean;
  outDir: string | null;
} {
  let anchorFilterSlug: string | null = null;
  let write = false;
  let outDir: string | null = null;
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === "--write") {
      write = true;
      continue;
    }
    if (arg === "--anchor-filter-slug") {
      anchorFilterSlug = argv[i + 1] ?? null;
      i += 1;
      continue;
    }
    if (arg === "--out-dir") {
      outDir = argv[i + 1] ?? null;
      i += 1;
    }
  }
  return { anchorFilterSlug, write, outDir };
}

function resolveModelSlugsForAnchor(
  queue: ApModelFirstEvidenceQueueReportV1,
  anchorFilterSlug: string,
): string[] {
  const fromTop = queue.top_candidates.find((c) => c.filter_slug === anchorFilterSlug);
  if (fromTop && fromTop.sample_model_slugs.length > 0) {
    return fromTop.sample_model_slugs;
  }
  const fromCompleted = queue.completed_no_mutation_candidates.find(
    (c) => c.filter_slug === anchorFilterSlug,
  );
  if (fromCompleted && fromCompleted.sample_model_slugs.length > 0) {
    return fromCompleted.sample_model_slugs;
  }
  if (
    queue.recommended_packet?.anchor_filter_slug === anchorFilterSlug &&
    queue.recommended_packet.anchor_model_slugs.length > 0
  ) {
    return queue.recommended_packet.anchor_model_slugs;
  }
  return [];
}

function resultFileNameForAnchor(anchorFilterSlug: string): string {
  return `ap-model-first-${anchorFilterSlug}-v1.results.json`;
}

function main(): void {
  const args = parseArgs(process.argv.slice(2));
  if (!args.anchorFilterSlug?.trim()) {
    process.stderr.write(
      "error: --anchor-filter-slug <slug> is required (e.g. --anchor-filter-slug shark-carbon-foam)\n",
    );
    process.exit(1);
  }

  const anchorFilterSlug = args.anchorFilterSlug.trim();
  const lane = buildAirPurifierModelFirstProductionLaneV1Report({ rootDir });
  const weak = buildAirPurifierWeakBuyerPathAuditV1Report({ rootDir });
  const queue = buildApModelFirstEvidenceQueueV1Report({
    rootDir,
    modelFirstLane: lane,
    weakBuyerPathAudit: weak,
  });

  const queueModelSlugs = resolveModelSlugsForAnchor(queue, anchorFilterSlug);
  const allRepoModelSlugs = loadAllRepoModelSlugsForAnchorFilterV1(rootDir, anchorFilterSlug);
  const modelSlugs = allRepoModelSlugs.length > 0 ? allRepoModelSlugs : queueModelSlugs;

  const result = buildModelFirstEvidenceResultV1({
    rootDir,
    queue,
    anchorFilterSlug,
    modelSlugs,
    writeResult: false,
  });

  let artifactRel: string | null = null;
  if (args.write) {
    const fileName = resultFileNameForAnchor(anchorFilterSlug);
    if (args.outDir) {
      const absOutDir = path.isAbsolute(args.outDir) ? args.outDir : path.join(rootDir, args.outDir);
      mkdirSync(absOutDir, { recursive: true });
      const outPath = path.join(absOutDir, fileName);
      writeFileSync(outPath, `${JSON.stringify(result, null, 2)}\n`, "utf8");
      artifactRel = path.relative(rootDir, outPath) || outPath;
    } else {
      artifactRel = `${AP_MODEL_FIRST_EVIDENCE_RESULTS_DIR_REL_V1}/${fileName}`;
      const abs = path.join(rootDir, artifactRel);
      mkdirSync(path.dirname(abs), { recursive: true });
      writeFileSync(abs, `${JSON.stringify(result, null, 2)}\n`, "utf8");
    }
  }

  process.stdout.write(
    `${JSON.stringify(
      {
        artifact_rel: artifactRel,
        write_requested: args.write,
        contract: result.contract,
        packet_id: result.packet_id,
        read_only: result.read_only,
        data_mutation: result.data_mutation,
        evidence_status_counts: result.evidence_status_counts,
        recommended_csv_mutation: result.recommended_csv_mutation,
        model_slugs_checked: result.model_slugs_checked,
      },
      null,
      2,
    )}\n`,
  );
}

main();
