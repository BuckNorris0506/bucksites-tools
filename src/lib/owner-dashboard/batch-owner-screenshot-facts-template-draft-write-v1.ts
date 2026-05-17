/**
 * Batch owner screenshot facts template draft-file writer v1 — lane-local drafts only.
 * PROVEN: must not write under `data/evidence/` or other production paths.
 */

import path from "node:path";

import type {
  BatchOwnerScreenshotFactsTemplateNestedV1,
  BatchOwnerScreenshotFactsTemplateV1,
} from "./batch-owner-screenshot-facts-template-v1";

export const BATCH_OWNER_SCREENSHOT_FACTS_TEMPLATE_DRAFT_WRITE_CONTRACT_V1 =
  "batch_owner_screenshot_facts_template_draft_write_v1" as const;

export const BATCH_OWNER_SCREENSHOT_FACTS_TEMPLATE_DRAFT_DEFAULT_RELATIVE_V1 =
  "data/batch-production/drafts/owner-screenshot-facts-template.amazon-rescue-default.json";

export const BATCH_OWNER_SCREENSHOT_FACTS_TEMPLATE_DRAFT_FROM_PLAN_RELATIVE_V1 =
  "data/batch-production/drafts/owner-screenshot-facts-template.from-plan.json";

/** Repo-relative forbidden write prefixes (POSIX, lowercase). */
export const BATCH_OWNER_SCREENSHOT_FACTS_DRAFT_FORBIDDEN_PREFIXES_V1 = [
  "data/evidence/",
  "data/retailer_links",
  "data/owner-decisions/",
  ".github/",
  "src/",
  "app/",
  "pages/",
  "scripts/",
] as const;

export const BATCH_OWNER_SCREENSHOT_FACTS_DRAFT_ALLOWED_PREFIX_V1 =
  "data/batch-production/drafts/" as const;

export type OwnerScreenshotFactsDraftFilePayloadV1 = {
  facts: BatchOwnerScreenshotFactsTemplateNestedV1[];
};

export type BatchOwnerScreenshotFactsTemplateDraftWriteSummaryV1 = {
  contract: typeof BATCH_OWNER_SCREENSHOT_FACTS_TEMPLATE_DRAFT_WRITE_CONTRACT_V1;
  data_mutation: false;
  production_mutation: false;
  wrote_draft_file: true;
  output_path: string;
  template_row_count: number;
  layer_6_founder_only_approval: "NOT_PROVEN";
  may_write_production_evidence: false;
};

export class OwnerScreenshotFactsDraftPathErrorV1 extends Error {
  constructor(message: string) {
    super(message);
    this.name = "OwnerScreenshotFactsDraftPathErrorV1";
  }
}

export class OwnerScreenshotFactsDraftOverwriteErrorV1 extends Error {
  constructor(message: string) {
    super(message);
    this.name = "OwnerScreenshotFactsDraftOverwriteErrorV1";
  }
}

function toRepoRelativePosix(repoRoot: string, absolutePath: string): string {
  const rel = path.relative(path.resolve(repoRoot), path.resolve(absolutePath));
  if (rel.startsWith("..") || path.isAbsolute(rel)) {
    throw new OwnerScreenshotFactsDraftPathErrorV1(
      "output path must stay inside repository root",
    );
  }
  return rel.split(path.sep).join("/");
}

export function buildOwnerScreenshotFactsDraftFilePayloadV1(
  template: BatchOwnerScreenshotFactsTemplateV1,
): OwnerScreenshotFactsDraftFilePayloadV1 {
  return { facts: template.rows.map((row) => row.facts_template) };
}

export function resolveOwnerScreenshotFactsDraftOutputPathV1(args: {
  repoRoot: string;
  outArg: string | null | undefined;
  usedAmazonRescueDefaultSource: boolean;
}): string {
  if (args.outArg?.trim()) {
    return args.outArg.trim();
  }
  if (args.usedAmazonRescueDefaultSource) {
    return BATCH_OWNER_SCREENSHOT_FACTS_TEMPLATE_DRAFT_DEFAULT_RELATIVE_V1;
  }
  return BATCH_OWNER_SCREENSHOT_FACTS_TEMPLATE_DRAFT_FROM_PLAN_RELATIVE_V1;
}

/**
 * Validate draft output path: inside repo, no traversal, allowed drafts dir only, .json file.
 */
export function validateOwnerScreenshotFactsDraftOutputPathV1(
  repoRoot: string,
  outArg: string,
): { absolutePath: string; repoRelativePosix: string } {
  const root = path.resolve(repoRoot);
  const resolved = path.isAbsolute(outArg) ? path.resolve(outArg) : path.resolve(root, outArg);

  const rootWithSep = root.endsWith(path.sep) ? root : `${root}${path.sep}`;
  if (resolved !== root && !resolved.startsWith(rootWithSep)) {
    throw new OwnerScreenshotFactsDraftPathErrorV1(
      "refusing absolute output path outside repository root",
    );
  }

  const relPosix = toRepoRelativePosix(root, resolved).toLowerCase();
  if (relPosix.includes("..")) {
    throw new OwnerScreenshotFactsDraftPathErrorV1("refusing path traversal in output path");
  }

  for (const forbidden of BATCH_OWNER_SCREENSHOT_FACTS_DRAFT_FORBIDDEN_PREFIXES_V1) {
    if (relPosix === forbidden.replace(/\/$/, "") || relPosix.startsWith(forbidden)) {
      throw new OwnerScreenshotFactsDraftPathErrorV1(
        `refusing draft write under forbidden path prefix: ${forbidden}`,
      );
    }
  }

  if (!relPosix.startsWith(BATCH_OWNER_SCREENSHOT_FACTS_DRAFT_ALLOWED_PREFIX_V1)) {
    throw new OwnerScreenshotFactsDraftPathErrorV1(
      `draft output must be under ${BATCH_OWNER_SCREENSHOT_FACTS_DRAFT_ALLOWED_PREFIX_V1}`,
    );
  }

  if (!relPosix.endsWith(".json")) {
    throw new OwnerScreenshotFactsDraftPathErrorV1("draft output path must end with .json");
  }

  return { absolutePath: resolved, repoRelativePosix: relPosix };
}

export function buildOwnerScreenshotFactsTemplateDraftWriteSummaryV1(args: {
  output_path: string;
  template_row_count: number;
}): BatchOwnerScreenshotFactsTemplateDraftWriteSummaryV1 {
  return {
    contract: BATCH_OWNER_SCREENSHOT_FACTS_TEMPLATE_DRAFT_WRITE_CONTRACT_V1,
    data_mutation: false,
    production_mutation: false,
    wrote_draft_file: true,
    output_path: args.output_path,
    template_row_count: args.template_row_count,
    layer_6_founder_only_approval: "NOT_PROVEN",
    may_write_production_evidence: false,
  };
}

export type WriteOwnerScreenshotFactsTemplateDraftFsV1 = {
  exists: (absolutePath: string) => boolean;
  mkdir: (absolutePath: string, options: { recursive: true }) => void;
  writeFile: (absolutePath: string, content: string, encoding: "utf8") => void;
};

export function writeOwnerScreenshotFactsTemplateDraftV1(args: {
  repoRoot: string;
  outArg: string;
  template: BatchOwnerScreenshotFactsTemplateV1;
  force: boolean;
  fs: WriteOwnerScreenshotFactsTemplateDraftFsV1;
}): {
  summary: BatchOwnerScreenshotFactsTemplateDraftWriteSummaryV1;
  absolutePath: string;
  payload: OwnerScreenshotFactsDraftFilePayloadV1;
} {
  const { absolutePath, repoRelativePosix } = validateOwnerScreenshotFactsDraftOutputPathV1(
    args.repoRoot,
    args.outArg,
  );

  if (args.fs.exists(absolutePath) && !args.force) {
    throw new OwnerScreenshotFactsDraftOverwriteErrorV1(
      `refusing overwrite without --force: ${repoRelativePosix}`,
    );
  }

  const payload = buildOwnerScreenshotFactsDraftFilePayloadV1(args.template);
  const content = `${JSON.stringify(payload, null, 2)}\n`;

  args.fs.mkdir(path.dirname(absolutePath), { recursive: true });
  args.fs.writeFile(absolutePath, content, "utf8");

  return {
    summary: buildOwnerScreenshotFactsTemplateDraftWriteSummaryV1({
      output_path: repoRelativePosix,
      template_row_count: args.template.template_row_count,
    }),
    absolutePath,
    payload,
  };
}

/** PROVEN: draft write summary never grants production evidence write. */
export function ownerScreenshotFactsDraftWriteGrantsProductionWrite(
  summary: BatchOwnerScreenshotFactsTemplateDraftWriteSummaryV1,
): boolean {
  return (
    summary.may_write_production_evidence !== false ||
    summary.production_mutation !== false ||
    summary.data_mutation !== false ||
    summary.layer_6_founder_only_approval !== "NOT_PROVEN"
  );
}
