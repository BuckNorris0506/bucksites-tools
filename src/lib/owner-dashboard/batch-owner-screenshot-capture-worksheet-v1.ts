/**
 * Batch Owner Screenshot Capture Worksheet v1 — human-readable Markdown from facts template.
 * PROVEN: pure builder; no I/O; does not write production evidence.
 */

import path from "node:path";

import type { BatchOwnerScreenshotFactsTemplateV1 } from "./batch-owner-screenshot-facts-template-v1";
import {
  BATCH_OWNER_SCREENSHOT_FACTS_DRAFT_ALLOWED_PREFIX_V1,
  BATCH_OWNER_SCREENSHOT_FACTS_DRAFT_FORBIDDEN_PREFIXES_V1,
  OwnerScreenshotFactsDraftOverwriteErrorV1,
  OwnerScreenshotFactsDraftPathErrorV1,
} from "./batch-owner-screenshot-facts-template-draft-write-v1";

export const BATCH_OWNER_SCREENSHOT_CAPTURE_WORKSHEET_CONTRACT_V1 =
  "batch_owner_screenshot_capture_worksheet_v1" as const;

export const BATCH_OWNER_SCREENSHOT_CAPTURE_WORKSHEET_DEFAULT_RELATIVE_V1 =
  "data/batch-production/drafts/owner-screenshot-capture-worksheet.amazon-rescue-default.md";

export const BATCH_OWNER_SCREENSHOT_CAPTURE_WORKSHEET_FROM_PLAN_RELATIVE_V1 =
  "data/batch-production/drafts/owner-screenshot-capture-worksheet.from-plan.md";

export const BATCH_OWNER_SCREENSHOT_CAPTURE_WORKSHEET_WRITE_CONTRACT_V1 =
  "batch_owner_screenshot_capture_worksheet_write_v1" as const;

export const BATCH_OWNER_SCREENSHOT_CAPTURE_PAGE_KIND_VALUES_V1 = [
  "product_detail_page",
  "search_results_page",
  "other",
  "unknown",
] as const;

export const BATCH_OWNER_SCREENSHOT_CAPTURE_STOCK_STATUS_VALUES_V1 = [
  "in_stock",
  "out_of_stock",
  "unknown",
] as const;

export const BATCH_OWNER_SCREENSHOT_CAPTURE_OEM_VALUES_V1 = [
  "oem_official",
  "compatible_aftermarket",
  "unknown",
  "blocked_unsafe",
] as const;

export const BATCH_OWNER_SCREENSHOT_CAPTURE_HARD_REMINDERS_V1 = [
  "Do not use Amazon search results pages or category browse pages — use a product detail page (PDP) only.",
  "Do not use non-PDP pages as evidence.",
  "Do not mark the listing safe or buyable if the exact token is not visible on the PDP.",
  "Do not mark oem_or_aftermarket as oem_official unless seller/product copy proves OEM — compatible aftermarket must stay compatible_aftermarket.",
  "Do not write production evidence JSON under data/evidence/ from this worksheet — fill the lane draft JSON only.",
] as const;

export type BatchOwnerScreenshotCaptureWorksheetWriteSummaryV1 = {
  contract: typeof BATCH_OWNER_SCREENSHOT_CAPTURE_WORKSHEET_WRITE_CONTRACT_V1;
  read_only: true;
  data_mutation: false;
  may_write_production_evidence: false;
  production_mutation: false;
  wrote_worksheet_file: true;
  output_path: string;
  worksheet_row_count: number;
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

export function resolveOwnerScreenshotCaptureWorksheetOutputPathV1(args: {
  outArg: string | null | undefined;
  usedAmazonRescueDefaultSource: boolean;
}): string {
  if (args.outArg?.trim()) return args.outArg.trim();
  if (args.usedAmazonRescueDefaultSource) {
    return BATCH_OWNER_SCREENSHOT_CAPTURE_WORKSHEET_DEFAULT_RELATIVE_V1;
  }
  return BATCH_OWNER_SCREENSHOT_CAPTURE_WORKSHEET_FROM_PLAN_RELATIVE_V1;
}

export function validateOwnerScreenshotCaptureWorksheetOutputPathV1(
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
        `refusing worksheet write under forbidden path prefix: ${forbidden}`,
      );
    }
  }

  if (!relPosix.startsWith(BATCH_OWNER_SCREENSHOT_FACTS_DRAFT_ALLOWED_PREFIX_V1)) {
    throw new OwnerScreenshotFactsDraftPathErrorV1(
      `worksheet output must be under ${BATCH_OWNER_SCREENSHOT_FACTS_DRAFT_ALLOWED_PREFIX_V1}`,
    );
  }

  if (!relPosix.endsWith(".md")) {
    throw new OwnerScreenshotFactsDraftPathErrorV1("worksheet output path must end with .md");
  }

  return { absolutePath: resolved, repoRelativePosix: relPosix };
}

function formatJsonFieldsSection(row: BatchOwnerScreenshotFactsTemplateV1["rows"][number]): string {
  const ft = row.facts_template;
  return [
    "### JSON facts draft fields (edit `data/batch-production/drafts/owner-screenshot-facts-template*.json`)",
    "",
    "| JSON path | What to enter |",
    "|-----------|---------------|",
    `| \`facts[].row_id\` | \`${ft.row_id}\` (already set) |`,
    `| \`facts[].filter_slug\` | \`${ft.filter_slug ?? row.slug ?? ""}\` |`,
    `| \`facts[].browser_evidence.token_searched\` | \`${ft.browser_evidence.token_searched}\` (from plan token) |`,
    `| \`facts[].browser_evidence.asin\` | 10-character ASIN from PDP URL or page (required before durable commit) |`,
    `| \`facts[].browser_evidence.canonical_url\` | Full Amazon /dp/ASIN URL if visible |`,
    `| \`facts[].browser_evidence.seller_title_visible\` | Copy of seller-controlled title text you see |`,
    `| \`facts[].page_observation.page_kind\` | One of: ${BATCH_OWNER_SCREENSHOT_CAPTURE_PAGE_KIND_VALUES_V1.join(", ")} — **use product_detail_page for PDP** |`,
    `| \`facts[].page_observation.token_visible_in_pdp_title\` | \`true\` or \`false\` |`,
    `| \`facts[].page_observation.token_visible_elsewhere_on_page\` | \`true\` or \`false\` |`,
    `| \`facts[].page_observation.seller_controlled_pdp_identity\` | \`true\`, \`false\`, or omit |`,
    `| \`facts[].buyability_observation.buy_path_visible\` | \`true\` or \`false\` |`,
    `| \`facts[].buyability_observation.stock_status\` | One of: ${BATCH_OWNER_SCREENSHOT_CAPTURE_STOCK_STATUS_VALUES_V1.join(", ")} |`,
    `| \`facts[].buyability_observation.price_visible_usd\` | Number (USD) or \`null\` |`,
    `| \`facts[].seller_observation.sold_by\` | Seller name from PDP |`,
    `| \`facts[].seller_observation.fulfilled_by\` | e.g. Amazon / seller |`,
    `| \`facts[].seller_observation.brand_visible\` | Brand string from PDP |`,
    `| \`facts[].product_relationship.oem_or_aftermarket\` | One of: ${BATCH_OWNER_SCREENSHOT_CAPTURE_OEM_VALUES_V1.join(", ")} |`,
    `| \`facts[].product_relationship.notes\` | Short relationship note (e.g. compatible replacement; not OEM) |`,
    `| \`facts[].screenshot_sources[0].path\` | Repo path after you commit screenshot image |`,
    `| \`facts[].screenshot_sources[0].committed_to_repo\` | Set \`true\` only after screenshot is committed to repo |`,
    "",
  ].join("\n");
}

function formatRowSection(row: BatchOwnerScreenshotFactsTemplateV1["rows"][number], index: number): string {
  const token = row.token ?? row.facts_template.browser_evidence.token_searched;
  const searchText = token || "(token missing on plan row)";
  const lines = [
    `## Row ${index + 1}: ${token || row.row_id}`,
    "",
    `- **row_id:** \`${row.row_id}\``,
    `- **token:** \`${token ?? ""}\``,
    `- **Suggested Amazon exact search text:** \`${searchText}\``,
    `- **evidence_prefix (reference only):** \`${row.evidence_prefix ?? "unknown"}\``,
    `- **Suggested production evidence path (reference only — do not write from this worksheet):** \`${row.suggested_production_evidence_path ?? "unknown"}\``,
    "",
    formatJsonFieldsSection(row),
    "### Hard no-buy / no-use reminders",
    "",
    ...BATCH_OWNER_SCREENSHOT_CAPTURE_HARD_REMINDERS_V1.map((r) => `- ${r}`),
    "",
    "---",
    "",
  ];
  return lines.join("\n");
}

/**
 * Pure Markdown worksheet from `batch_owner_screenshot_facts_template_v1` rows.
 */
export function buildBatchOwnerScreenshotCaptureWorksheetMarkdownV1(
  template: BatchOwnerScreenshotFactsTemplateV1,
): string {
  const header = [
    "# Batch Owner Screenshot Capture Worksheet",
    "",
    "> **Worksheet only** — not founder approval, not mutation authority, not production evidence.",
    "",
    "| Boundary | Value |",
    "|----------|-------|",
    "| read_only | true |",
    "| data_mutation | false |",
    "| may_write_production_evidence | false |",
    "| layer_6_founder_only_approval | NOT_PROVEN |",
    "",
    `Contract: \`${BATCH_OWNER_SCREENSHOT_CAPTURE_WORKSHEET_CONTRACT_V1}\` (source template: \`${template.contract}\`)`,
    "",
    `Generated: ${template.generated_at}`,
    "",
    `Rows in cohort: **${template.template_row_count}**`,
    "",
    "## Workflow",
    "",
    "1. Open Amazon in browser and search using the exact token below for each row.",
    "2. Capture screenshot on a **product detail page (PDP)** with exact token visible.",
    "3. Fill the lane draft JSON at `data/batch-production/drafts/owner-screenshot-facts-template.amazon-rescue-default.json` (or your plan-specific draft path).",
    "4. Run `node --import tsx scripts/report-batch-owner-screenshot-drafts.ts --plan <plan.json> --facts <draft.json>` to preview read-only draft packets.",
    "5. Do **not** save files under `data/evidence/` until a separate explicit founder commit step.",
    "",
    "## Allowed enum values (quick reference)",
    "",
    `- **page_kind:** ${BATCH_OWNER_SCREENSHOT_CAPTURE_PAGE_KIND_VALUES_V1.join(", ")}`,
    `- **stock_status:** ${BATCH_OWNER_SCREENSHOT_CAPTURE_STOCK_STATUS_VALUES_V1.join(", ")}`,
    `- **oem_or_aftermarket:** ${BATCH_OWNER_SCREENSHOT_CAPTURE_OEM_VALUES_V1.join(", ")}`,
    "",
    "---",
    "",
  ].join("\n");

  const body = template.rows.map((row, i) => formatRowSection(row, i)).join("\n");

  const footer = [
    "## Global reminders",
    "",
    ...BATCH_OWNER_SCREENSHOT_CAPTURE_HARD_REMINDERS_V1.map((r) => `- ${r}`),
    "",
    "_End of worksheet._",
    "",
  ].join("\n");

  return `${header}${body}${footer}`;
}

export type WriteOwnerScreenshotCaptureWorksheetFsV1 = {
  exists: (absolutePath: string) => boolean;
  mkdir: (absolutePath: string, options: { recursive: true }) => void;
  writeFile: (absolutePath: string, content: string, encoding: "utf8") => void;
};

export function buildOwnerScreenshotCaptureWorksheetWriteSummaryV1(args: {
  output_path: string;
  worksheet_row_count: number;
}): BatchOwnerScreenshotCaptureWorksheetWriteSummaryV1 {
  return {
    contract: BATCH_OWNER_SCREENSHOT_CAPTURE_WORKSHEET_WRITE_CONTRACT_V1,
    read_only: true,
    data_mutation: false,
    may_write_production_evidence: false,
    production_mutation: false,
    wrote_worksheet_file: true,
    output_path: args.output_path,
    worksheet_row_count: args.worksheet_row_count,
    layer_6_founder_only_approval: "NOT_PROVEN",
  };
}

export function writeOwnerScreenshotCaptureWorksheetV1(args: {
  repoRoot: string;
  outArg: string;
  template: BatchOwnerScreenshotFactsTemplateV1;
  force: boolean;
  fs: WriteOwnerScreenshotCaptureWorksheetFsV1;
}): {
  summary: BatchOwnerScreenshotCaptureWorksheetWriteSummaryV1;
  absolutePath: string;
  markdown: string;
} {
  const { absolutePath, repoRelativePosix } = validateOwnerScreenshotCaptureWorksheetOutputPathV1(
    args.repoRoot,
    args.outArg,
  );

  if (args.fs.exists(absolutePath) && !args.force) {
    throw new OwnerScreenshotFactsDraftOverwriteErrorV1(
      `refusing overwrite without --force: ${repoRelativePosix}`,
    );
  }

  const markdown = buildBatchOwnerScreenshotCaptureWorksheetMarkdownV1(args.template);
  const content = markdown.endsWith("\n") ? markdown : `${markdown}\n`;

  args.fs.mkdir(path.dirname(absolutePath), { recursive: true });
  args.fs.writeFile(absolutePath, content, "utf8");

  return {
    summary: buildOwnerScreenshotCaptureWorksheetWriteSummaryV1({
      output_path: repoRelativePosix,
      worksheet_row_count: args.template.template_row_count,
    }),
    absolutePath,
    markdown: content,
  };
}

export function ownerScreenshotCaptureWorksheetWriteGrantsProductionWrite(
  summary: BatchOwnerScreenshotCaptureWorksheetWriteSummaryV1,
): boolean {
  return (
    summary.may_write_production_evidence !== false ||
    summary.production_mutation !== false ||
    summary.data_mutation !== false ||
    summary.read_only !== true ||
    summary.layer_6_founder_only_approval !== "NOT_PROVEN"
  );
}
