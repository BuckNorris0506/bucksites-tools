/**
 * R16 Phase B1 — snapshot, CSV tag strip, Supabase tag strip (guarded).
 *
 *   npx tsx scripts/report-buckparts-r16-amazon-stored-tag-normalization-v1.ts --mode snapshot
 *   npx tsx scripts/report-buckparts-r16-amazon-stored-tag-normalization-v1.ts --mode csv_dry_run
 *   npx tsx scripts/report-buckparts-r16-amazon-stored-tag-normalization-v1.ts --mode csv_write
 *   npx tsx scripts/report-buckparts-r16-amazon-stored-tag-normalization-v1.ts --mode supabase_dry_run
 *   BUCKPARTS_IO_CAPABILITY=MUTATION npx tsx ... --mode supabase_write
 */

import { mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import {
  applyR16CsvTagStripWriteV1,
  applyR16SupabaseTagStripWriteV1,
  buildR16CsvTagStripPlanV1,
  buildR16SupabaseTagStripPlanFromSnapshotsV1,
  loadR16SupabaseTargetSnapshotsV1,
  R16_AMAZON_STORED_TAG_NORMALIZATION_CSV_CLOSEOUT_JSON_REL_V1,
  R16_AMAZON_STORED_TAG_NORMALIZATION_SOURCE_COMMAND_V1,
  R16_AMAZON_STORED_TAG_NORMALIZATION_SUPABASE_CLOSEOUT_JSON_REL_V1,
  type R16AmazonStoredTagNormalizationModeV1,
  urlHasInactiveAmazonTag,
  verifyR16OwnerApprovalGatesV1,
  writeR16PreMutationSnapshotV1,
} from "./lib/buckparts-r16-amazon-stored-tag-normalization-v1";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.join(__dirname, "..");

function parseMode(argv: string[]): R16AmazonStoredTagNormalizationModeV1 {
  const i = argv.indexOf("--mode");
  const mode = i >= 0 ? argv[i + 1] : "csv_dry_run";
  if (
    mode === "snapshot" ||
    mode === "csv_dry_run" ||
    mode === "csv_write" ||
    mode === "supabase_dry_run" ||
    mode === "supabase_write"
  ) {
    return mode;
  }
  throw new Error(`invalid_mode:${String(mode)}`);
}

async function main(): Promise<void> {
  const mode = parseMode(process.argv.slice(2));
  const generated_at = new Date().toISOString();

  if (mode === "snapshot") {
    const result = await writeR16PreMutationSnapshotV1({ rootDir });
    process.stdout.write(`${JSON.stringify({ mode, ...result, generated_at }, null, 2)}\n`);
    process.exitCode = result.ok ? 0 : 1;
    return;
  }

  const approval = verifyR16OwnerApprovalGatesV1({ rootDir });

  if (mode === "csv_dry_run" || mode === "csv_write") {
    const plan = buildR16CsvTagStripPlanV1({ rootDir });
    if (!plan.ok) {
      process.stdout.write(
        `${JSON.stringify({ mode, ok: false, blockers: plan.blockers }, null, 2)}\n`,
      );
      process.exitCode = 1;
      return;
    }
    if (mode === "csv_dry_run") {
      process.stdout.write(
        `${JSON.stringify(
          {
            mode,
            ok: true,
            row_count: plan.updates.length,
            updates: plan.updates,
            approval,
          },
          null,
          2,
        )}\n`,
      );
      return;
    }
    if (!approval.ok) {
      process.stdout.write(
        `${JSON.stringify({ mode, ok: false, blockers: approval.blockers }, null, 2)}\n`,
      );
      process.exitCode = 1;
      return;
    }
    const applied = applyR16CsvTagStripWriteV1({ rootDir, updates: plan.updates });
    if (!applied.ok) {
      process.stdout.write(`${JSON.stringify({ mode, applied }, null, 2)}\n`);
      process.exitCode = 1;
      return;
    }
    const closeout = {
      contract: "r16_amazon_stored_tag_normalization_csv_closeout_v1",
      apply_status: "APPLIED",
      source_command: R16_AMAZON_STORED_TAG_NORMALIZATION_SOURCE_COMMAND_V1,
      generated_at,
      rows_updated: applied.rows_written,
      updated_filter_slugs: plan.updates.map((u) => u.filter_slug),
      inserts: 0,
      deletes: 0,
      supabase_mutated: false,
      tag_only: true,
      approval_decision_id: "decision-2026-10-11-r16-amazon-stored-tag-normalization",
      planned_updates: plan.updates,
    };
    const closeoutRel = R16_AMAZON_STORED_TAG_NORMALIZATION_CSV_CLOSEOUT_JSON_REL_V1;
    const closeoutAbs = path.join(rootDir, closeoutRel);
    mkdirSync(path.dirname(closeoutAbs), { recursive: true });
    writeFileSync(closeoutAbs, `${JSON.stringify(closeout, null, 2)}\n`, "utf8");
    process.stdout.write(
      `${JSON.stringify({ mode, ok: true, rows_written: applied.rows_written, closeout_rel: closeoutRel }, null, 2)}\n`,
    );
    return;
  }

  const supabaseLoad = await loadR16SupabaseTargetSnapshotsV1();
  if (supabaseLoad.status !== "CHECKED") {
    process.stdout.write(
      `${JSON.stringify({ mode, ok: false, blockers: [supabaseLoad.reason] }, null, 2)}\n`,
    );
    process.exitCode = 1;
    return;
  }
  const sbPlan = buildR16SupabaseTagStripPlanFromSnapshotsV1(supabaseLoad.rows);
  if (!sbPlan.ok) {
    process.stdout.write(
      `${JSON.stringify({ mode, ok: false, blockers: sbPlan.blockers }, null, 2)}\n`,
    );
    process.exitCode = 1;
    return;
  }

  if (mode === "supabase_dry_run") {
    process.stdout.write(
      `${JSON.stringify(
        {
          mode,
          ok: true,
          row_count: sbPlan.updates.length,
          updates: sbPlan.updates,
          approval,
        },
        null,
        2,
      )}\n`,
    );
    return;
  }

  if (!approval.ok) {
    process.stdout.write(
      `${JSON.stringify({ mode, ok: false, blockers: approval.blockers }, null, 2)}\n`,
    );
    process.exitCode = 1;
    return;
  }
  const applied = await applyR16SupabaseTagStripWriteV1({
    updates: sbPlan.updates,
    snapshots: supabaseLoad.rows,
  });
  if (!applied.ok) {
    process.stdout.write(`${JSON.stringify({ mode, applied }, null, 2)}\n`);
    process.exitCode = 1;
    return;
  }

  const readback = await loadR16SupabaseTargetSnapshotsV1();
  let tagged_count: number | null = null;
  if (readback.status === "CHECKED") {
    tagged_count = readback.rows.filter(
      (r) =>
        urlHasInactiveAmazonTag(r.affiliate_url) ||
        (r.destination_url != null && urlHasInactiveAmazonTag(r.destination_url)),
    ).length;
  }

  const closeout = {
    contract: "r16_amazon_stored_tag_normalization_supabase_closeout_v1",
    apply_status: "APPLIED",
    source_command: R16_AMAZON_STORED_TAG_NORMALIZATION_SOURCE_COMMAND_V1,
    generated_at,
    rows_updated: applied.rows_updated,
    tagged_rows_remaining: tagged_count,
    inserts: 0,
    deletes: 0,
    tag_only: true,
    approval_decision_id: "decision-2026-10-11-r16-amazon-stored-tag-normalization",
    planned_updates: sbPlan.updates,
  };
  const closeoutRel = R16_AMAZON_STORED_TAG_NORMALIZATION_SUPABASE_CLOSEOUT_JSON_REL_V1;
  const closeoutAbs = path.join(rootDir, closeoutRel);
  mkdirSync(path.dirname(closeoutAbs), { recursive: true });
  writeFileSync(closeoutAbs, `${JSON.stringify(closeout, null, 2)}\n`, "utf8");
  process.stdout.write(
    `${JSON.stringify(
      { mode, ok: true, rows_updated: applied.rows_updated, tagged_count, closeout_rel: closeoutRel },
      null,
      2,
    )}\n`,
  );
}

main().catch((err) => {
  process.stderr.write(`${err instanceof Error ? err.message : String(err)}\n`);
  process.exitCode = 1;
});
