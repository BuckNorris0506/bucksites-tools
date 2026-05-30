import path from "node:path";
import { fileURLToPath } from "node:url";

import { REFRIGERATOR_MODEL_FIRST_DEFAULT_MANIFEST_REL_V1 } from "./lib/refrigerator-model-first-batch-resolver-v1";
import {
  REFRIGERATOR_MODEL_FIRST_FOUNDER_APPROVAL_DEFAULT_DRAFT_REL_V1,
  buildRefrigeratorModelFirstMappingReviewFounderApprovalPacketV1,
  writeRefrigeratorModelFirstMappingReviewFounderApprovalPacketDraftV1,
} from "./lib/refrigerator-model-first-mapping-review-founder-approval-packet-v1";

/**
 * Read-only BuckParts QA / wrong-purchase prevention packet for refrigerator compat review.
 *
 * Default: Markdown to stdout.
 * --json: machine envelope (includes qa_framing + markdown body + inspect_summary).
 * --out: write Markdown draft under data/fridge/batch-production/drafts/*.md
 *
 * jq proof (json): `.inspect_summary`, `.qa_framing`, `.packet_framing`
 */
const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

function parseManifestArg(): string {
  const idx = process.argv.indexOf("--manifest");
  if (idx === -1) return REFRIGERATOR_MODEL_FIRST_DEFAULT_MANIFEST_REL_V1;
  const value = process.argv[idx + 1];
  if (!value?.trim()) {
    throw new Error("Missing value for --manifest");
  }
  return value.trim();
}

function parseOutArg(): string | null {
  const idx = process.argv.indexOf("--out");
  if (idx === -1) return null;
  const value = process.argv[idx + 1];
  if (!value?.trim()) {
    throw new Error("Missing value for --out");
  }
  return value.trim();
}

function main(): void {
  const manifestRelPath = parseManifestArg();
  const outArg = parseOutArg();
  const asJson = process.argv.includes("--json");
  const force = process.argv.includes("--force");

  const packet = buildRefrigeratorModelFirstMappingReviewFounderApprovalPacketV1({
    rootDir,
    manifestRelPath,
  });

  if (outArg) {
    const result = writeRefrigeratorModelFirstMappingReviewFounderApprovalPacketDraftV1({
      rootDir,
      outArg,
      packet,
      force,
    });
    process.stderr.write(`Wrote founder approval packet draft: ${result.output_path}\n`);
  }

  if (asJson) {
    process.stdout.write(`${JSON.stringify(packet, null, 2)}\n`);
  } else if (!outArg) {
    process.stdout.write(`${packet.markdown}\n`);
  } else {
    process.stderr.write(
      `Draft written to ${outArg ?? REFRIGERATOR_MODEL_FIRST_FOUNDER_APPROVAL_DEFAULT_DRAFT_REL_V1}; use without --out for Markdown stdout.\n`,
    );
  }
}

main();
