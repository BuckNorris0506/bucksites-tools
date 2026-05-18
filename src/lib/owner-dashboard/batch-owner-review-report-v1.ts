/**
 * Batch Owner Review Report v1 — human-readable Markdown from draft review JSON.
 * PROVEN: pure builder; lane-local draft writes only; no production evidence paths.
 */

import path from "node:path";

import {
  BATCH_OWNER_SCREENSHOT_DRAFT_PACKET_CONTRACT_V1,
  type BatchOwnerScreenshotDraftPacketV1,
  type BatchOwnerScreenshotDraftRowV1,
} from "./batch-owner-screenshot-draft-packet-v1";
import {
  BATCH_OWNER_SCREENSHOT_FACTS_DRAFT_ALLOWED_PREFIX_V1,
  BATCH_OWNER_SCREENSHOT_FACTS_DRAFT_FORBIDDEN_PREFIXES_V1,
  OwnerScreenshotFactsDraftOverwriteErrorV1,
  OwnerScreenshotFactsDraftPathErrorV1,
} from "./batch-owner-screenshot-facts-template-draft-write-v1";

export const BATCH_OWNER_REVIEW_REPORT_CONTRACT_V1 = "batch_owner_review_report_v1" as const;

export const BATCH_OWNER_REVIEW_REPORT_WRITE_CONTRACT_V1 =
  "batch_owner_review_report_write_v1" as const;

export const BATCH_OWNER_REVIEW_REPORT_DEFAULT_RELATIVE_V1 =
  "data/batch-production/drafts/owner-review.from-draft.md";

export const BATCH_OWNER_DECISION_OPTIONS_V1 = [
  "approve_for_next_planning_only",
  "reject",
  "request_more_evidence",
  "defer",
] as const;

export type BatchOwnerReviewReportSummaryV1 = {
  total_rows: number;
  owner_review_ready_rows: number;
  mutation_ready_rows: number;
  blocked_rows: number;
};

export type BatchOwnerReviewReportWriteSummaryV1 = {
  contract: typeof BATCH_OWNER_REVIEW_REPORT_WRITE_CONTRACT_V1;
  read_only: true;
  data_mutation: false;
  may_write_production_evidence: false;
  production_mutation: false;
  wrote_review_file: boolean;
  output_path: string | null;
  review_row_count: number;
  layer_6_founder_only_approval: "NOT_PROVEN";
};

function toRepoRelativePosix(repoRoot: string, absolutePath: string): string {
  const rel = path.relative(path.resolve(repoRoot), path.resolve(absolutePath));
  if (rel.startsWith("..") || path.isAbsolute(rel)) {
    throw new OwnerScreenshotFactsDraftPathErrorV1(
      "output path must stay inside repository root",
    );
  }
  return rel.split(path.sep).join("/");
}

export function parseBatchOwnerScreenshotDraftReviewV1(
  raw: unknown,
): BatchOwnerScreenshotDraftPacketV1 {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) {
    throw new Error("review input must be a JSON object");
  }
  const o = raw as Record<string, unknown>;
  if (o.contract !== BATCH_OWNER_SCREENSHOT_DRAFT_PACKET_CONTRACT_V1) {
    throw new Error(`review contract must be ${BATCH_OWNER_SCREENSHOT_DRAFT_PACKET_CONTRACT_V1}`);
  }
  if (!Array.isArray(o.rows)) {
    throw new Error("review input must include rows array");
  }
  return raw as BatchOwnerScreenshotDraftPacketV1;
}

export function validateBatchOwnerReviewReportOutputPathV1(
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
        `refusing review report write under forbidden path prefix: ${forbidden}`,
      );
    }
  }

  if (!relPosix.startsWith(BATCH_OWNER_SCREENSHOT_FACTS_DRAFT_ALLOWED_PREFIX_V1)) {
    throw new OwnerScreenshotFactsDraftPathErrorV1(
      `review report output must be under ${BATCH_OWNER_SCREENSHOT_FACTS_DRAFT_ALLOWED_PREFIX_V1}`,
    );
  }

  if (!relPosix.endsWith(".md")) {
    throw new OwnerScreenshotFactsDraftPathErrorV1("review report output path must end with .md");
  }

  return { absolutePath: resolved, repoRelativePosix: relPosix };
}

export function summarizeBatchOwnerReviewReportV1(
  review: BatchOwnerScreenshotDraftPacketV1,
): BatchOwnerReviewReportSummaryV1 {
  const rows = review.rows ?? [];
  const owner_review_ready_rows = rows.filter((r) => r.draft_ready_for_owner_review).length;
  const mutation_ready_rows = rows.filter((r) => {
    const mr = (r.draft_packet as { mutation_ready?: boolean } | null)?.mutation_ready;
    return mr === true;
  }).length;
  const blocked_rows = rows.length - owner_review_ready_rows;
  return {
    total_rows: rows.length,
    owner_review_ready_rows,
    mutation_ready_rows,
    blocked_rows,
  };
}

function escapeMdTableCell(value: string): string {
  return value.replace(/\|/g, "\\|").replace(/\r?\n/g, " ").trim();
}

function formatUsd(price: number | null | undefined): string {
  if (price == null || !Number.isFinite(price)) return "—";
  return `$${price.toFixed(2)}`;
}

function rowCanonicalUrl(row: BatchOwnerScreenshotDraftRowV1): string {
  const packet = row.draft_packet;
  if (!packet) return "—";
  return packet.canonical_url ?? packet.browser_evidence.amazon_pdp_url_canonical ?? "—";
}

function rowNotes(row: BatchOwnerScreenshotDraftRowV1): string {
  const notes = row.draft_packet?.product_relationship?.notes?.trim();
  if (notes) return notes;
  if (row.missing_owner_facts.length > 0) {
    return `Owner-review blockers: ${row.missing_owner_facts.join("; ")}`;
  }
  return "—";
}

function formatReviewTableRow(row: BatchOwnerScreenshotDraftRowV1): string {
  const packet = row.draft_packet;
  const verdict = packet?.owner_verdict ?? "—";
  const price = formatUsd(packet?.buyability_observation?.price_visible_usd);
  const stock = packet?.buyability_observation?.stock_status ?? "—";
  const buyPath =
    packet?.buyability_observation?.buy_path_visible === true
      ? "yes"
      : packet?.buyability_observation?.buy_path_visible === false
        ? "no"
        : "—";
  const oem = packet?.product_relationship?.oem_or_aftermarket ?? "—";
  const ready = row.draft_ready_for_owner_review ? "yes" : "no";
  const productionBlockers =
    row.production_evidence_commit_blockers.length > 0
      ? row.production_evidence_commit_blockers.join("; ")
      : "none";

  return [
    escapeMdTableCell(row.row_id),
    escapeMdTableCell(row.token ?? "—"),
    escapeMdTableCell(rowCanonicalUrl(row)),
    escapeMdTableCell(verdict),
    escapeMdTableCell(price),
    escapeMdTableCell(stock),
    escapeMdTableCell(buyPath),
    escapeMdTableCell(oem),
    escapeMdTableCell(ready),
    escapeMdTableCell(productionBlockers),
  ].join(" | ");
}

function formatRowNotesSection(row: BatchOwnerScreenshotDraftRowV1, index: number): string {
  const token = row.token ?? row.row_id;
  const notes = rowNotes(row);
  const ownerBlockers =
    row.missing_owner_facts.length > 0 ? row.missing_owner_facts.join("; ") : "none";
  return [
    `### Row ${index + 1}: ${token}`,
    "",
    `- **row_id:** \`${row.row_id}\``,
    `- **owner_verdict:** \`${row.draft_packet?.owner_verdict ?? "—"}\``,
    `- **draft_ready_for_owner_review:** \`${row.draft_ready_for_owner_review}\``,
    `- **mutation_ready:** \`${row.draft_packet?.mutation_ready ?? false}\` (must stay false)`,
    `- **owner-review blockers:** ${ownerBlockers}`,
    `- **production commit blockers:** ${
      row.production_evidence_commit_blockers.length > 0
        ? row.production_evidence_commit_blockers.join("; ")
        : "none"
    }`,
    "",
    "**Agent / observation notes:**",
    "",
    notes === "—" ? "_No notes._" : notes,
    "",
  ].join("\n");
}

/** Pure Markdown builder — no filesystem I/O. */
export function buildBatchOwnerReviewReportMarkdownV1(
  review: BatchOwnerScreenshotDraftPacketV1,
): string {
  const summary = summarizeBatchOwnerReviewReportV1(review);
  const generatedAt = review.generated_at ?? new Date().toISOString();

  const boundary = [
    "> **Boundary (read-only lane)**",
    "> ",
    "> | Field | Value |",
    "> |-------|-------|",
    "> | `read_only` | **true** |",
    "> | `data_mutation` | **false** |",
    "> | `may_mutate` | **false** (every row) |",
    "> | `may_write_production_evidence` | **false** |",
    "> | `layer_6_founder_only_approval` | **NOT_PROVEN** |",
    "> ",
    "> This report is for founder review only. It does not write `data/evidence/`, mutate Supabase, or change `retailer_links`.",
    "",
  ].join("\n");

  const summarySection = [
    "## Summary",
    "",
    "| Metric | Count |",
    "|--------|------:|",
    `| Total rows | ${summary.total_rows} |`,
    `| Owner-review-ready (draft_ready_for_owner_review) | ${summary.owner_review_ready_rows} |`,
    `| Mutation-ready (mutation_ready=true) | ${summary.mutation_ready_rows} |`,
    `| Blocked for owner review | ${summary.blocked_rows} |`,
    "",
    `Source review contract: \`${review.contract}\``,
    "",
    `Review generated: ${generatedAt}`,
    "",
  ].join("\n");

  const tableHeader = [
    "## Candidate table",
    "",
    "| row_id | token | canonical_url | verdict | price | stock | buy_path | oem_or_aftermarket | ready_for_owner_review | production_blockers |",
    "|--------|-------|---------------|---------|-------|-------|----------|-------------------|------------------------|---------------------|",
  ].join("\n");

  const tableBody = review.rows.map((row) => `| ${formatReviewTableRow(row)} |`).join("\n");

  const rowNotes = [
    "## Per-row notes",
    "",
    ...review.rows.map((row, i) => formatRowNotesSection(row, i)),
  ].join("\n");

  const ownerDecisions = [
    "## Owner decision options",
    "",
    "Record your decision separately (e.g. founder decision registry). **This Markdown file does not apply decisions automatically.**",
    "",
    "Choose one per row or cohort:",
    "",
    ...BATCH_OWNER_DECISION_OPTIONS_V1.map((opt) => `- **\`${opt}\`**`),
    "",
    "### Authority warning",
    "",
    "**Approving this review does not authorize:** Supabase writes, `retailer_links` mutation, writes under `data/evidence/`, affiliate URL changes, git commits, or deploys.",
    "",
    "`mutation_ready` remains **false** on every draft packet row. `approve_for_next_planning_only` means planning/read-model use only — **not** production mutation.",
    "",
  ].join("\n");

  const footer = [
    "---",
    "",
    `_Report contract: \`${BATCH_OWNER_REVIEW_REPORT_CONTRACT_V1}\` · machine JSON (\`batch_owner_screenshot_draft_packet_v1\`) is debug/CLI artifact only._`,
    "",
  ].join("\n");

  const header = [
    "# Batch Production Lane — Owner Review Report",
    "",
    boundary,
    summarySection,
    tableHeader,
    tableBody,
    "",
    rowNotes,
    ownerDecisions,
    footer,
  ].join("\n");

  return header.endsWith("\n") ? header : `${header}\n`;
}

export type WriteBatchOwnerReviewReportFsV1 = {
  exists: (absolutePath: string) => boolean;
  mkdir: (absolutePath: string, options: { recursive: true }) => void;
  writeFile: (absolutePath: string, content: string, encoding: "utf8") => void;
};

export function buildBatchOwnerReviewReportWriteSummaryV1(args: {
  output_path: string | null;
  review_row_count: number;
  wrote_review_file: boolean;
}): BatchOwnerReviewReportWriteSummaryV1 {
  return {
    contract: BATCH_OWNER_REVIEW_REPORT_WRITE_CONTRACT_V1,
    read_only: true,
    data_mutation: false,
    may_write_production_evidence: false,
    production_mutation: false,
    wrote_review_file: args.wrote_review_file,
    output_path: args.output_path,
    review_row_count: args.review_row_count,
    layer_6_founder_only_approval: "NOT_PROVEN",
  };
}

export function writeBatchOwnerReviewReportV1(args: {
  repoRoot: string;
  outArg: string;
  review: BatchOwnerScreenshotDraftPacketV1;
  force: boolean;
  fs: WriteBatchOwnerReviewReportFsV1;
}): {
  summary: BatchOwnerReviewReportWriteSummaryV1;
  absolutePath: string;
  markdown: string;
} {
  const { absolutePath, repoRelativePosix } = validateBatchOwnerReviewReportOutputPathV1(
    args.repoRoot,
    args.outArg,
  );

  if (args.fs.exists(absolutePath) && !args.force) {
    throw new OwnerScreenshotFactsDraftOverwriteErrorV1(
      `refusing overwrite without --force: ${repoRelativePosix}`,
    );
  }

  const markdown = buildBatchOwnerReviewReportMarkdownV1(args.review);
  const content = markdown.endsWith("\n") ? markdown : `${markdown}\n`;

  args.fs.mkdir(path.dirname(absolutePath), { recursive: true });
  args.fs.writeFile(absolutePath, content, "utf8");

  return {
    summary: buildBatchOwnerReviewReportWriteSummaryV1({
      output_path: repoRelativePosix,
      review_row_count: args.review.rows.length,
      wrote_review_file: true,
    }),
    absolutePath,
    markdown: content,
  };
}

/** PROVEN: review report write summary never grants production evidence write. */
export function batchOwnerReviewReportWriteGrantsProductionWrite(
  summary: BatchOwnerReviewReportWriteSummaryV1,
): boolean {
  return (
    summary.may_write_production_evidence !== false ||
    summary.production_mutation !== false ||
    summary.data_mutation !== false ||
    summary.read_only !== true ||
    summary.layer_6_founder_only_approval !== "NOT_PROVEN"
  );
}
