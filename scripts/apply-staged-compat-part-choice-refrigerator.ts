import { HOMEKEEP_WEDGE_CATALOG } from "@/lib/catalog/identity";
import { loadEnv } from "./lib/load-env";
import { getSupabaseAdmin } from "./lib/supabase-admin";

function arg(flag: string): string | null {
  const i = process.argv.indexOf(flag);
  if (i === -1) return null;
  return process.argv[i + 1] ?? null;
}

function isUuid(v: string | null): boolean {
  if (!v) return false;
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(v);
}

async function main() {
  loadEnv();
  const supabase = getSupabaseAdmin();
  const write = process.argv.includes("--write");
  const stagedIdRaw = arg("--staged-id");
  const filterId = arg("--filter-id");
  const stagedId = stagedIdRaw ? Number.parseInt(stagedIdRaw, 10) : Number.NaN;

  if (!Number.isFinite(stagedId)) {
    throw new Error("Missing/invalid --staged-id");
  }
  if (!isUuid(filterId)) {
    throw new Error("Missing/invalid --filter-id (must be UUID)");
  }

  const { data: stagedRows, error: stagedErr } = await supabase
    .from("staged_compatibility_mapping_additions")
    .select("id, catalog, status, model_id, part_id")
    .eq("id", stagedId)
    .limit(1);
  if (stagedErr) throw stagedErr;
  const staged = (stagedRows ?? [])[0] as
    | { id: number; catalog: string; status: string; model_id: string; part_id: string }
    | undefined;
  if (!staged) throw new Error(`staged row not found: ${stagedId}`);
  if (staged.catalog !== HOMEKEEP_WEDGE_CATALOG.refrigerator_water) {
    throw new Error(`staged row ${stagedId} is not ${HOMEKEEP_WEDGE_CATALOG.refrigerator_water}`);
  }
  if (!["reviewing", "queued", "ready"].includes(staged.status)) {
    throw new Error(`staged row ${stagedId} status must be reviewing/queued/ready`);
  }
  if (!isUuid(staged.model_id)) {
    throw new Error(`staged row ${stagedId} model_id must be a real UUID before applying part`);
  }

  const { data: filters, error: fErr } = await supabase
    .from("filters")
    .select("id")
    .eq("id", filterId)
    .limit(1);
  if (fErr) throw fErr;
  if ((filters ?? []).length === 0) {
    throw new Error(`filter not found: ${filterId}`);
  }

  // Idempotent: if already set to this filter + ready, no-op.
  const alreadyDone = staged.part_id === filterId && staged.status === "ready";
  if (alreadyDone) {
    console.log(
      JSON.stringify(
        {
          dry_run: !write,
          changed: false,
          reason: "already_ready_with_same_filter",
          staged_id: stagedId,
          filter_id: filterId,
        },
        null,
        2,
      ),
    );
    return;
  }

  if (write) {
    const { error: upErr } = await supabase
      .from("staged_compatibility_mapping_additions")
      .update({ part_id: filterId, status: "ready" })
      .eq("id", stagedId)
      .in("status", ["reviewing", "queued", "ready"]);
    if (upErr) throw upErr;
  }

  console.log(
    JSON.stringify(
      {
        dry_run: !write,
        changed: !alreadyDone,
        staged_id: stagedId,
        model_id: staged.model_id,
        part_id: filterId,
        next_status: "ready",
      },
      null,
      2,
    ),
  );
}

main().catch((err) => {
  console.error("[apply-staged-compat-part-choice-refrigerator] failed", err);
  process.exit(1);
});
