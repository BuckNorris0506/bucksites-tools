/**
 * Read-only BuckParts Quality Assurance packet for refrigerator model-first compat review v1.
 * Wrong-purchase prevention review artifact — no CSV/Supabase/public/buy-link apply.
 */

import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";

import {
  REFRIGERATOR_MODEL_FIRST_DEFAULT_MANIFEST_REL_V1,
  buildRefrigeratorModelFirstBatchResolverV1,
  type RefrigeratorModelFirstBatchModelRowV1,
  type RefrigeratorModelFirstBatchResolverV1,
} from "./refrigerator-model-first-batch-resolver-v1";
import {
  REFRIGERATOR_MODEL_FIRST_MAPPING_REVIEW_COMPAT_APPLY_PLAN_CONTRACT_V1,
  buildRefrigeratorModelFirstMappingReviewCompatApplyPlanV1,
  type MappingReviewCompatApplyPlanRowV1,
  type RefrigeratorModelFirstMappingReviewCompatApplyPlanV1,
} from "./refrigerator-model-first-mapping-review-compat-apply-plan-v1";

export const REFRIGERATOR_MODEL_FIRST_MAPPING_REVIEW_FOUNDER_APPROVAL_PACKET_CONTRACT_V1 =
  "refrigerator_model_first_mapping_review_founder_approval_packet_v1" as const;

export const REFRIGERATOR_MODEL_FIRST_FOUNDER_APPROVAL_DRAFT_ALLOWED_PREFIX_V1 =
  "data/fridge/batch-production/drafts/" as const;

export const REFRIGERATOR_MODEL_FIRST_FOUNDER_APPROVAL_DEFAULT_DRAFT_REL_V1 =
  `${REFRIGERATOR_MODEL_FIRST_FOUNDER_APPROVAL_DRAFT_ALLOWED_PREFIX_V1}refrigerator-model-first-mapping-review-founder-approval-packet-v1.md` as const;

export class RefrigeratorFounderApprovalDraftPathErrorV1 extends Error {
  constructor(message: string) {
    super(message);
    this.name = "RefrigeratorFounderApprovalDraftPathErrorV1";
  }
}

export type FounderApprovalPacketModelSectionV1 = {
  refrigerator_model: string;
  fridge_slug: string;
  official_filter_token_or_name: string;
  confidence: "MAPPING_REVIEW_REQUIRED";
  why_mapping_review_not_pass: string;
  rows_to_remove: string[];
  rows_to_keep: string[];
  rows_to_add: string[];
};

export type FounderApprovalPacketBrandSectionV1 = {
  brand_label: string;
  official_filter_families: string[];
  model_count: number;
  total_removals: number;
  total_keeps: number;
  total_additions: number;
  models: FounderApprovalPacketModelSectionV1[];
};

export type FounderApprovalPacketInspectSummaryV1 = {
  mapping_review_model_count: number;
  total_planned_removals: number;
  total_planned_additions: number;
  total_planned_keeps: number;
  apply_authorized: false;
  founder_approval_required: true;
  founder_approval_status: "pending";
  csv_apply_authorized: false;
  supabase_update_authorized: false;
  buy_link_mutation_authorized: false;
  public_page_change_authorized: false;
};

export type FounderApprovalPacketQaFramingV1 = {
  packet_purpose: "quality_assurance_wrong_purchase_prevention";
  what_this_is: string;
  what_this_is_not: string;
  wrong_purchase_risk_summary: string;
  mapping_review_required_meaning: string;
  pass_proven_status: string;
  qa_gate_role: string;
};

export type RefrigeratorModelFirstMappingReviewFounderApprovalPacketV1 = {
  contract: typeof REFRIGERATOR_MODEL_FIRST_MAPPING_REVIEW_FOUNDER_APPROVAL_PACKET_CONTRACT_V1;
  classification: "non-runtime";
  packet_framing: "quality_assurance_wrong_purchase_prevention";
  read_only: true;
  data_mutation: false;
  apply_authorized: false;
  founder_approval_required: true;
  founder_approval_status: "pending";
  generated_at: string;
  source_manifest_path: string;
  source_apply_plan_contract: typeof REFRIGERATOR_MODEL_FIRST_MAPPING_REVIEW_COMPAT_APPLY_PLAN_CONTRACT_V1;
  qa_framing: FounderApprovalPacketQaFramingV1;
  inspect_summary: FounderApprovalPacketInspectSummaryV1;
  brand_sections: FounderApprovalPacketBrandSectionV1[];
  explicit_warnings: string[];
  markdown: string;
};

const BRAND_SECTION_ORDER_V1: Array<{
  brand_prefix: string;
  brand_label: string;
  families: string[];
}> = [
  { brand_prefix: "lg-", brand_label: "LG", families: ["LT1000P"] },
  {
    brand_prefix: "samsung-",
    brand_label: "Samsung",
    families: ["HAF-QIN", "HAF-CIN"],
  },
  { brand_prefix: "ge-", brand_label: "GE", families: ["RPWFE"] },
  {
    brand_prefix: "whirlpool-",
    brand_label: "Whirlpool",
    families: ["EDR1RXD1", "EDR2RXD1", "EDR4RXD1"],
  },
  {
    brand_prefix: "frigidaire-",
    brand_label: "Frigidaire",
    families: ["EPTWFU01", "ULTRAWF"],
  },
];

const QA_FRAMING_V1: FounderApprovalPacketQaFramingV1 = {
  packet_purpose: "quality_assurance_wrong_purchase_prevention",
  what_this_is:
    "A BuckParts Quality Assurance review packet. It proposes corrections to existing compatibility_mappings.csv rows that conflict with official manufacturer filter evidence. This is data cleanup to prevent wrong purchases — not a request to add new filter products or buy links.",
  what_this_is_not:
    "This is not new product onboarding, not a buy-link rollout, and not a public-page publish. No customer-facing surface should change from this packet alone.",
  wrong_purchase_risk_summary:
    "Each model below lists legacy BuckParts compat rows that point at the wrong filter family for that refrigerator. If those rows were surfaced publicly without correction, a shopper could buy a filter that does not match their fridge.",
  mapping_review_required_meaning:
    "MAPPING_REVIEW_REQUIRED means official manufacturer proof exists for the correct filter token, but current BuckParts mappings still conflict — they include extra wrong-family rows, omit the correct row, or both.",
  pass_proven_status:
    "PASS and PROVEN remain 0 for this batch because compatibility_mappings.csv has not been reconciled yet. QA approval is required before any CSV apply closes the loop.",
  qa_gate_role:
    "Quality Assurance is the gate between committed official evidence and customer-facing confidence. Review this packet first; only after explicit approval should a separate gated apply step touch compatibility_mappings.csv.",
};

const EXPLICIT_WARNINGS_V1 = [
  "Wrong-purchase prevention only: this packet corrects existing compat-risk rows — it does not authorize adding new filter SKUs or retailer buy links.",
  "No buy-link changes are authorized by this packet.",
  "No public page changes are authorized by this packet.",
  "No Supabase changes are authorized by this packet.",
  "No compatibility_mappings.csv apply is authorized until explicit QA/founder approval after review.",
  "Nothing in this packet marks any model PASS or PROVEN — all 20 rows remain MAPPING_REVIEW_REQUIRED until CSV reconciliation is approved and applied in a separate gated step.",
] as const;

function toRepoRelativePosix(rootDir: string, absolutePath: string): string {
  const rel = path.relative(path.resolve(rootDir), path.resolve(absolutePath));
  if (rel.startsWith("..") || path.isAbsolute(rel)) {
    throw new RefrigeratorFounderApprovalDraftPathErrorV1(
      "output path must stay inside repository root",
    );
  }
  return rel.split(path.sep).join("/");
}

export function validateRefrigeratorFounderApprovalDraftOutputPathV1(args: {
  rootDir: string;
  outArg: string;
}): { absolutePath: string; repoRelativePosix: string } {
  const root = path.resolve(args.rootDir);
  const resolved = path.isAbsolute(args.outArg)
    ? path.resolve(args.outArg)
    : path.resolve(root, args.outArg);

  const rootWithSep = root.endsWith(path.sep) ? root : `${root}${path.sep}`;
  if (resolved !== root && !resolved.startsWith(rootWithSep)) {
    throw new RefrigeratorFounderApprovalDraftPathErrorV1(
      "refusing absolute output path outside repository root",
    );
  }

  const relPosix = toRepoRelativePosix(root, resolved);
  if (relPosix.includes("..")) {
    throw new RefrigeratorFounderApprovalDraftPathErrorV1("refusing path traversal in output path");
  }

  if (!relPosix.startsWith(REFRIGERATOR_MODEL_FIRST_FOUNDER_APPROVAL_DRAFT_ALLOWED_PREFIX_V1)) {
    throw new RefrigeratorFounderApprovalDraftPathErrorV1(
      `approval packet output must be under ${REFRIGERATOR_MODEL_FIRST_FOUNDER_APPROVAL_DRAFT_ALLOWED_PREFIX_V1}`,
    );
  }

  if (!relPosix.endsWith(".md")) {
    throw new RefrigeratorFounderApprovalDraftPathErrorV1(
      "approval packet output path must end with .md",
    );
  }

  return { absolutePath: resolved, repoRelativePosix: relPosix };
}

function whyMappingReviewNotPass(args: {
  resolverRow: RefrigeratorModelFirstBatchModelRowV1 | undefined;
  applyRow: MappingReviewCompatApplyPlanRowV1;
}): string {
  const official = args.applyRow.official_filter_token_or_name;
  const removeCount = args.applyRow.planned_removals.length;
  const keepCount = args.applyRow.planned_keeps.length;
  const addCount = args.applyRow.planned_additions.length;

  if (args.resolverRow?.plain_english_next_action) {
    return (
      `Wrong-purchase risk: ${args.resolverRow.plain_english_next_action} ` +
      `Planned QA fix: remove ${removeCount} wrong-family row(s)` +
      (keepCount > 0 ? `, keep ${keepCount} correct row(s)` : "") +
      (addCount > 0 ? `, add ${addCount} missing row(s) for ${official}.` : ".") +
      " CSV not reconciled yet — not PASS/PROVEN."
    );
  }

  return (
    `Wrong-purchase risk: official manufacturer filter is ${official}, but legacy CSV still maps conflicting filter families. ` +
    `Planned QA fix: remove ${removeCount} row(s)` +
    (keepCount > 0 ? `, keep ${keepCount} row(s)` : "") +
    (addCount > 0 ? `, add ${addCount} row(s).` : ".") +
    " CSV not reconciled yet — not PASS/PROVEN."
  );
}

function buildModelSection(args: {
  applyRow: MappingReviewCompatApplyPlanRowV1;
  resolverRow: RefrigeratorModelFirstBatchModelRowV1 | undefined;
}): FounderApprovalPacketModelSectionV1 {
  return {
    refrigerator_model: args.applyRow.refrigerator_model,
    fridge_slug: args.applyRow.fridge_slug,
    official_filter_token_or_name: args.applyRow.official_filter_token_or_name,
    confidence: "MAPPING_REVIEW_REQUIRED",
    why_mapping_review_not_pass: whyMappingReviewNotPass({
      resolverRow: args.resolverRow,
      applyRow: args.applyRow,
    }),
    rows_to_remove: args.applyRow.planned_removals.map((r) => r.csv_row_key).sort(),
    rows_to_keep: [...args.applyRow.planned_keeps].sort(),
    rows_to_add: args.applyRow.planned_additions.map((r) => r.csv_row_key).sort(),
  };
}

function buildBrandSections(args: {
  applyPlan: RefrigeratorModelFirstMappingReviewCompatApplyPlanV1;
  resolverBySlug: Map<string, RefrigeratorModelFirstBatchModelRowV1>;
}): FounderApprovalPacketBrandSectionV1[] {
  return BRAND_SECTION_ORDER_V1.map((brandDef) => {
    const models = args.applyPlan.rows
      .filter((row) => row.fridge_slug.startsWith(brandDef.brand_prefix))
      .sort((a, b) => {
        const familyOrder = brandDef.families.indexOf(a.official_filter_token_or_name) -
          brandDef.families.indexOf(b.official_filter_token_or_name);
        if (familyOrder !== 0) return familyOrder;
        return a.fridge_slug.localeCompare(b.fridge_slug);
      })
      .map((applyRow) =>
        buildModelSection({
          applyRow,
          resolverRow: args.resolverBySlug.get(applyRow.fridge_slug),
        }),
      );

    const total_removals = models.reduce((sum, m) => sum + m.rows_to_remove.length, 0);
    const total_keeps = models.reduce((sum, m) => sum + m.rows_to_keep.length, 0);
    const total_additions = models.reduce((sum, m) => sum + m.rows_to_add.length, 0);

    return {
      brand_label: brandDef.brand_label,
      official_filter_families: brandDef.families,
      model_count: models.length,
      total_removals,
      total_keeps,
      total_additions,
      models,
    };
  }).filter((section) => section.model_count > 0);
}

function bulletList(items: string[]): string {
  if (items.length === 0) return "- _(none)_";
  return items.map((item) => `- \`${item}\``).join("\n");
}

function renderMarkdown(args: {
  packet: Omit<RefrigeratorModelFirstMappingReviewFounderApprovalPacketV1, "markdown">;
}): string {
  const {
    inspect_summary,
    brand_sections,
    explicit_warnings,
    generated_at,
    source_manifest_path,
    qa_framing,
  } = args.packet;

  const lines: string[] = [
    "# BuckParts Quality Assurance — refrigerator wrong-purchase prevention packet",
    "",
    `Generated: ${generated_at}`,
    "",
    "Classification: **non-runtime QA draft** — review only; no product data has been changed.",
    "",
    "## What this packet is",
    "",
    qa_framing.what_this_is,
    "",
    "**What this is not:** " + qa_framing.what_this_is_not,
    "",
    "## Wrong-purchase risk (plain language)",
    "",
    qa_framing.wrong_purchase_risk_summary,
    "",
    "## QA status definitions",
    "",
    `- **MAPPING_REVIEW_REQUIRED:** ${qa_framing.mapping_review_required_meaning}`,
    `- **PASS / PROVEN (this batch):** ${qa_framing.pass_proven_status}`,
    `- **QA gate role:** ${qa_framing.qa_gate_role}`,
    "",
    "## Summary",
    "",
    "| Metric | Count |",
    "| --- | ---: |",
    `| Models (MAPPING_REVIEW_REQUIRED) | ${inspect_summary.mapping_review_model_count} |`,
    `| Planned compat row removals (wrong-family cleanup) | ${inspect_summary.total_planned_removals} |`,
    `| Planned compat row additions (missing correct family) | ${inspect_summary.total_planned_additions} |`,
    `| Planned compat row keeps (already correct) | ${inspect_summary.total_planned_keeps} |`,
    `| Models at PASS / PROVEN | 0 |`,
    "",
    "| Gate | Status |",
    "| --- | --- |",
    "| CSV apply authorized | **NO** |",
    "| QA / founder approval | **REQUIRED (pending)** |",
    "| Supabase update authorized | **NO** |",
    "| Buy-link mutation authorized | **NO** |",
    "| Public page change authorized | **NO** |",
    "",
    `Source manifest: \`${source_manifest_path}\``,
    "",
    "## Authorization boundaries (read before approving)",
    "",
    ...explicit_warnings.map((w) => `- **${w}**`),
    "",
  ];

  for (const section of brand_sections) {
    lines.push(`## ${section.brand_label} → ${section.official_filter_families.join(" / ")}`);
    lines.push("");
    lines.push(
      `QA section totals: ${section.model_count} model(s); ${section.total_removals} wrong-family removal(s); ${section.total_keeps} keep(s); ${section.total_additions} missing-row addition(s).`,
    );
    lines.push("");

    for (const model of section.models) {
      lines.push(`### ${model.refrigerator_model} (\`${model.fridge_slug}\`)`);
      lines.push("");
      lines.push(`- **Official filter (manufacturer evidence):** \`${model.official_filter_token_or_name}\``);
      lines.push(`- **QA status:** \`${model.confidence}\` — not PASS / not PROVEN until CSV is reconciled`);
      lines.push(`- **Wrong-purchase risk / why not PASS yet:** ${model.why_mapping_review_not_pass}`);
      lines.push("- **Rows to remove (wrong-family / compat-risk cleanup):");
      lines.push(bulletList(model.rows_to_remove));
      lines.push("- **Rows to keep (already match official family):");
      lines.push(bulletList(model.rows_to_keep));
      lines.push("- **Rows to add (missing correct family):");
      lines.push(bulletList(model.rows_to_add));
      lines.push("");
    }
  }

  lines.push("## QA approval decision (do not apply from this file)");
  lines.push("");
  lines.push(
    "After QA review, record explicit approval in a separate gated apply step. This packet documents wrong-purchase risks and proposed compat corrections only — it does not execute CSV writes, buy-link changes, or public page updates.",
  );
  lines.push("");

  return lines.join("\n");
}

export function buildRefrigeratorModelFirstMappingReviewFounderApprovalPacketV1(args: {
  rootDir: string;
  manifestRelPath?: string;
  now?: () => Date;
  applyPlan?: RefrigeratorModelFirstMappingReviewCompatApplyPlanV1;
  resolver?: RefrigeratorModelFirstBatchResolverV1;
}): RefrigeratorModelFirstMappingReviewFounderApprovalPacketV1 {
  const now = args.now ?? (() => new Date());
  const manifestRelPath = args.manifestRelPath ?? REFRIGERATOR_MODEL_FIRST_DEFAULT_MANIFEST_REL_V1;

  const resolver =
    args.resolver ??
    buildRefrigeratorModelFirstBatchResolverV1({
      rootDir: args.rootDir,
      manifestRelPath,
      now: args.now,
    });

  const applyPlan =
    args.applyPlan ??
    buildRefrigeratorModelFirstMappingReviewCompatApplyPlanV1({
      rootDir: args.rootDir,
      manifestRelPath,
      now: args.now,
    });

  const resolverBySlug = new Map(resolver.model_rows.map((row) => [row.fridge_slug, row]));
  const brand_sections = buildBrandSections({ applyPlan, resolverBySlug });

  const inspect_summary: FounderApprovalPacketInspectSummaryV1 = {
    mapping_review_model_count: applyPlan.inspect_summary.mapping_review_model_count,
    total_planned_removals: applyPlan.inspect_summary.total_planned_removals,
    total_planned_additions: applyPlan.inspect_summary.total_planned_additions,
    total_planned_keeps: applyPlan.inspect_summary.total_planned_keeps,
    apply_authorized: false,
    founder_approval_required: true,
    founder_approval_status: "pending",
    csv_apply_authorized: false,
    supabase_update_authorized: false,
    buy_link_mutation_authorized: false,
    public_page_change_authorized: false,
  };

  const withoutMarkdown: Omit<
    RefrigeratorModelFirstMappingReviewFounderApprovalPacketV1,
    "markdown"
  > = {
    contract: REFRIGERATOR_MODEL_FIRST_MAPPING_REVIEW_FOUNDER_APPROVAL_PACKET_CONTRACT_V1,
    classification: "non-runtime",
    packet_framing: "quality_assurance_wrong_purchase_prevention",
    read_only: true,
    data_mutation: false,
    apply_authorized: false,
    founder_approval_required: true,
    founder_approval_status: "pending",
    generated_at: now().toISOString(),
    source_manifest_path: manifestRelPath,
    source_apply_plan_contract: REFRIGERATOR_MODEL_FIRST_MAPPING_REVIEW_COMPAT_APPLY_PLAN_CONTRACT_V1,
    qa_framing: QA_FRAMING_V1,
    inspect_summary,
    brand_sections,
    explicit_warnings: [...EXPLICIT_WARNINGS_V1],
  };

  const markdown = renderMarkdown({ packet: withoutMarkdown });

  return { ...withoutMarkdown, markdown };
}

export function writeRefrigeratorModelFirstMappingReviewFounderApprovalPacketDraftV1(args: {
  rootDir: string;
  outArg: string;
  packet: RefrigeratorModelFirstMappingReviewFounderApprovalPacketV1;
  force?: boolean;
}): { wrote: boolean; output_path: string } {
  const { absolutePath, repoRelativePosix } = validateRefrigeratorFounderApprovalDraftOutputPathV1({
    rootDir: args.rootDir,
    outArg: args.outArg,
  });

  if (existsSync(absolutePath) && !args.force) {
    throw new RefrigeratorFounderApprovalDraftPathErrorV1(
      `refusing overwrite without --force: ${repoRelativePosix}`,
    );
  }

  mkdirSync(path.dirname(absolutePath), { recursive: true });
  writeFileSync(absolutePath, args.packet.markdown, "utf8");

  return { wrote: true, output_path: repoRelativePosix };
}

export function readProductCsvSnapshotForFounderApprovalPacketTestV1(
  rootDir: string,
  relPaths: string[],
): Map<string, string> {
  return new Map(
    relPaths.map((rel) => [rel, readFileSync(path.join(rootDir, rel), "utf8")] as const),
  );
}
