/**
 * Path validation for batch owner approval lane outputs.
 */

import path from "node:path";

import {
  BATCH_OWNER_SCREENSHOT_FACTS_DRAFT_ALLOWED_PREFIX_V1,
  BATCH_OWNER_SCREENSHOT_FACTS_DRAFT_FORBIDDEN_PREFIXES_V1,
  OwnerScreenshotFactsDraftOverwriteErrorV1,
  OwnerScreenshotFactsDraftPathErrorV1,
} from "./batch-owner-screenshot-facts-template-draft-write-v1";

export const BATCH_OWNER_APPROVAL_DRAFT_DEFAULT_RELATIVE_V1 =
  "data/batch-production/drafts/batch-owner-approval.from-draft.json";

export const BATCH_OWNER_APPROVAL_CHECKLIST_DEFAULT_RELATIVE_V1 =
  "data/batch-production/drafts/batch-owner-approval-checklist.from-draft.md";

export const BATCH_OWNER_APPROVAL_REGISTRY_EXPORT_DEFAULT_RELATIVE_V1 =
  "data/owner-decisions/batch-non-amazon-pdp-owner-approval.json";

const OWNER_DECISIONS_PREFIX_V1 = "data/owner-decisions/" as const;

/** Forbidden for registry export (owner-decisions/ is the allowed target). */
const REGISTRY_EXPORT_FORBIDDEN_PREFIXES_V1 = [
  "data/evidence/",
  "data/retailer_links",
  "data/batch-production/",
  ".github/",
  "src/",
  "app/",
  "pages/",
  "scripts/",
] as const;

function toRepoRelativePosix(repoRoot: string, absolutePath: string): string {
  const rel = path.relative(path.resolve(repoRoot), path.resolve(absolutePath));
  if (rel.startsWith("..") || path.isAbsolute(rel)) {
    throw new OwnerScreenshotFactsDraftPathErrorV1(
      "output path must stay inside repository root",
    );
  }
  return rel.split(path.sep).join("/");
}

function assertInsideRepoAndNoTraversal(repoRoot: string, resolved: string): string {
  const root = path.resolve(repoRoot);
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
  return relPosix;
}

function assertNotForbiddenPrefix(relPosix: string, label: string): void {
  for (const forbidden of BATCH_OWNER_SCREENSHOT_FACTS_DRAFT_FORBIDDEN_PREFIXES_V1) {
    if (relPosix === forbidden.replace(/\/$/, "") || relPosix.startsWith(forbidden)) {
      throw new OwnerScreenshotFactsDraftPathErrorV1(
        `refusing ${label} write under forbidden path prefix: ${forbidden}`,
      );
    }
  }
}

export function validateBatchOwnerApprovalPacketOutputPathV1(
  repoRoot: string,
  outArg: string,
): { absolutePath: string; repoRelativePosix: string } {
  const root = path.resolve(repoRoot);
  const resolved = path.isAbsolute(outArg) ? path.resolve(outArg) : path.resolve(root, outArg);
  const relPosix = assertInsideRepoAndNoTraversal(root, resolved);
  assertNotForbiddenPrefix(relPosix, "approval packet");
  if (!relPosix.startsWith(BATCH_OWNER_SCREENSHOT_FACTS_DRAFT_ALLOWED_PREFIX_V1)) {
    throw new OwnerScreenshotFactsDraftPathErrorV1(
      `approval packet output must be under ${BATCH_OWNER_SCREENSHOT_FACTS_DRAFT_ALLOWED_PREFIX_V1}`,
    );
  }
  if (!relPosix.endsWith(".json")) {
    throw new OwnerScreenshotFactsDraftPathErrorV1("approval packet output path must end with .json");
  }
  return { absolutePath: resolved, repoRelativePosix: relPosix };
}

export function validateBatchOwnerApprovalChecklistOutputPathV1(
  repoRoot: string,
  outArg: string,
): { absolutePath: string; repoRelativePosix: string } {
  const root = path.resolve(repoRoot);
  const resolved = path.isAbsolute(outArg) ? path.resolve(outArg) : path.resolve(root, outArg);
  const relPosix = assertInsideRepoAndNoTraversal(root, resolved);
  assertNotForbiddenPrefix(relPosix, "approval checklist");
  if (!relPosix.startsWith(BATCH_OWNER_SCREENSHOT_FACTS_DRAFT_ALLOWED_PREFIX_V1)) {
    throw new OwnerScreenshotFactsDraftPathErrorV1(
      `approval checklist output must be under ${BATCH_OWNER_SCREENSHOT_FACTS_DRAFT_ALLOWED_PREFIX_V1}`,
    );
  }
  if (!relPosix.endsWith(".md")) {
    throw new OwnerScreenshotFactsDraftPathErrorV1("approval checklist output path must end with .md");
  }
  return { absolutePath: resolved, repoRelativePosix: relPosix };
}

export function validateBatchOwnerApprovalRegistryExportPathV1(
  repoRoot: string,
  outArg: string,
): { absolutePath: string; repoRelativePosix: string } {
  const root = path.resolve(repoRoot);
  const resolved = path.isAbsolute(outArg) ? path.resolve(outArg) : path.resolve(root, outArg);
  const relPosix = assertInsideRepoAndNoTraversal(root, resolved);
  for (const forbidden of REGISTRY_EXPORT_FORBIDDEN_PREFIXES_V1) {
    if (relPosix === forbidden.replace(/\/$/, "") || relPosix.startsWith(forbidden)) {
      throw new OwnerScreenshotFactsDraftPathErrorV1(
        `refusing registry export under forbidden path prefix: ${forbidden}`,
      );
    }
  }
  if (!relPosix.startsWith(OWNER_DECISIONS_PREFIX_V1)) {
    throw new OwnerScreenshotFactsDraftPathErrorV1(
      `registry export must be under ${OWNER_DECISIONS_PREFIX_V1}`,
    );
  }
  if (!relPosix.endsWith(".json")) {
    throw new OwnerScreenshotFactsDraftPathErrorV1("registry export path must end with .json");
  }
  return { absolutePath: resolved, repoRelativePosix: relPosix };
}

export type WriteBatchOwnerApprovalFsV1 = {
  exists: (absolutePath: string) => boolean;
  mkdir: (absolutePath: string, options: { recursive: true }) => void;
  writeFile: (absolutePath: string, content: string, encoding: "utf8") => void;
};

export { OwnerScreenshotFactsDraftOverwriteErrorV1, OwnerScreenshotFactsDraftPathErrorV1 };
