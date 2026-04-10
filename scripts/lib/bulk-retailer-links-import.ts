import type { SupabaseClient } from "@supabase/supabase-js";

/** Chunk size for `IN (filter_id…)` prefetch queries (URL / row limits). */
const DEFAULT_FILTER_ID_CHUNK = 200;
/** Rows per insert / upsert batch (PostgREST payload size). */
const DEFAULT_WRITE_CHUNK = 500;

function linkLookupKey(filterId: string, affiliateUrl: string): string {
  return `${filterId}\u0000${affiliateUrl}`;
}

export type RetailerLinkImportOp = {
  filterId: string;
  affiliate_url: string;
  /** Full row for insert (includes affiliate_url and filter FK). */
  insertRow: Record<string, unknown>;
  /**
   * Subset for update by id (legacy row-wise path did not SET affiliate_url).
   * Bulk upsert still merges `affiliate_url` from {@link affiliate_url} so batched rows stay
   * homogeneous with NOT NULL `affiliate_url` (same value as the match key).
   */
  updateRow: Record<string, unknown>;
};

/**
 * Bulk retailer link apply: same semantics as the legacy per-row path
 * (match existing row by filter FK + affiliate_url; insert or update by id).
 *
 * - Prefetch existing ids in O(filter_id chunks) round-trips instead of O(csv rows).
 * - Writes in batched insert + upsert(onConflict: id).
 */
export async function bulkApplyRetailerLinksByAffiliateMatch(
  supabase: SupabaseClient,
  options: {
    table: string;
    filterFkColumn: string;
    ops: RetailerLinkImportOp[];
    filterIdChunkSize?: number;
    writeChunkSize?: number;
  },
): Promise<{
  inserted: number;
  updated: number;
  /** Distinct (filterId, affiliate_url) after last-wins dedupe. */
  uniquePairs: number;
}> {
  const {
    table,
    filterFkColumn,
    filterIdChunkSize = DEFAULT_FILTER_ID_CHUNK,
    writeChunkSize = DEFAULT_WRITE_CHUNK,
  } = options;

  const byCsvKey = new Map<string, RetailerLinkImportOp>();
  for (const op of options.ops) {
    byCsvKey.set(linkLookupKey(op.filterId, op.affiliate_url), op);
  }
  const ops = [...byCsvKey.values()];
  if (ops.length === 0) {
    return { inserted: 0, updated: 0, uniquePairs: 0 };
  }

  const filterIds = [...new Set(ops.map((o) => o.filterId))];
  const idByLinkKey = new Map<string, string>();

  for (let i = 0; i < filterIds.length; i += filterIdChunkSize) {
    const chunk = filterIds.slice(i, i + filterIdChunkSize);
    const { data, error } = await supabase
      .from(table)
      .select(`id, ${filterFkColumn}, affiliate_url`)
      .in(filterFkColumn, chunk);

    if (error) throw error;

    for (const row of data ?? []) {
      const fid = row[filterFkColumn as keyof typeof row] as string;
      const url = row.affiliate_url as string;
      const id = row.id as string;
      const k = linkLookupKey(fid, url);
      const prev = idByLinkKey.get(k);
      if (prev !== undefined) {
        throw new Error(
          `${table}: multiple DB rows share the same (${filterFkColumn}, affiliate_url); fix duplicates (ids ${prev}, ${id}).`,
        );
      }
      idByLinkKey.set(k, id);
    }
  }

  const toInsert: Record<string, unknown>[] = [];
  const toUpdate: Record<string, unknown>[] = [];

  for (const op of ops) {
    const k = linkLookupKey(op.filterId, op.affiliate_url);
    const existingId = idByLinkKey.get(k);
    // Supabase postgrest-js bulk insert/upsert adds `columns=` = union of keys on every row.
    // Any column in that union missing on a given object becomes NULL (breaking NOT NULL
    // columns). We always set FK + affiliate_url last so every row includes them; update
    // payloads intentionally omitted affiliate_url for legacy PATCH semantics, which nulled
    // affiliate_url on bulk upsert.
    if (existingId) {
      toUpdate.push({
        id: existingId,
        ...op.updateRow,
        [filterFkColumn]: op.filterId,
        affiliate_url: op.affiliate_url,
      });
    } else {
      toInsert.push({
        ...op.insertRow,
        [filterFkColumn]: op.filterId,
        affiliate_url: op.affiliate_url,
      });
    }
  }

  let inserted = 0;
  let updated = 0;

  for (let i = 0; i < toInsert.length; i += writeChunkSize) {
    const batch = toInsert.slice(i, i + writeChunkSize);
    const { error } = await supabase.from(table).insert(batch, {
      defaultToNull: false,
    });
    if (error) throw error;
    inserted += batch.length;
  }

  for (let i = 0; i < toUpdate.length; i += writeChunkSize) {
    const batch = toUpdate.slice(i, i + writeChunkSize);
    const { error } = await supabase.from(table).upsert(batch, {
      onConflict: "id",
      ignoreDuplicates: false,
      defaultToNull: false,
    });
    if (error) throw error;
    updated += batch.length;
  }

  return { inserted, updated, uniquePairs: ops.length };
}
