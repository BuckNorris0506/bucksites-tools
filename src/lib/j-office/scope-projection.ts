import type {
  FounderOperatingPicture,
  FunnelRecord,
  QueueItem,
} from "@/lib/j-office/types";

function belongsToScope(
  businessId: string | null | undefined,
  scopeId: string,
): boolean {
  if (scopeId === "all") return true;
  if (!businessId) return false;
  return businessId === scopeId;
}

function recount(records: FunnelRecord[]): Record<string, number> {
  const stuck = records.filter(
    (row) =>
      row.passed_first_filter &&
      !row.passed_second_filter &&
      row.rejected_or_closed,
  );
  return {
    originated: records.filter((row) => row.originated).length,
    passed_first_filter: records.filter((row) => row.passed_first_filter).length,
    passed_second_filter: records.filter((row) => row.passed_second_filter).length,
    active: records.filter((row) => row.active && !row.rejected_or_closed).length,
    waiting: records.filter((row) => row.waiting && !row.active).length,
    rejected_or_closed: records.filter((row) => row.rejected_or_closed).length,
    stuck_after_first_filter: stuck.length,
  };
}

/**
 * Presentation filter of the existing J projection.
 * Does not re-rank the queue or recompute economics.
 */
export function scopeFounderOperatingPicture(
  picture: FounderOperatingPicture,
  scopeId: string,
): FounderOperatingPicture {
  if (!scopeId || scopeId === "all") {
    return picture;
  }

  const origRecords = picture.funnel.records ?? [];
  const records = origRecords.filter((row) => belongsToScope(row.business_id, scopeId));
  const stuck = (picture.funnel.stuck_after_first_filter ?? []).filter((row) =>
    belongsToScope(row.business_id, scopeId),
  );
  const queue = (picture.next_queue ?? []).filter((row: QueueItem) =>
    belongsToScope(row.business_id ?? null, scopeId),
  );

  const outlook = { ...picture.economic_outlook };
  if (scopeId !== "buckparts") {
    delete outlook.buckparts;
    outlook.current_revenue_producing_paths = (
      outlook.current_revenue_producing_paths ?? []
    ).filter((row) => belongsToScope(String(row.business_id ?? ""), scopeId));
    outlook.material_current_economic_exposure = (
      outlook.material_current_economic_exposure ?? []
    ).filter((row) => {
      const bid = row.business_id;
      return bid == null || belongsToScope(String(bid), scopeId);
    });
    outlook.outlook_truth = { proven: [], inferred: [], unknown: [] };
    outlook.next_event_that_could_change_economics =
      "Channel-level BuckParts outlook is hidden in this scope. Switch to ALL or BuckParts.";
  }

  const nowBusiness = String(picture.now.business ?? "").toLowerCase();
  const nowInScope =
    nowBusiness.includes(scopeId) ||
    (scopeId === "buckparts" && nowBusiness.includes("buckparts"));

  return {
    ...picture,
    economic_outlook: outlook,
    now: nowInScope
      ? picture.now
      : {
          ...picture.now,
          identity: `J's current work is outside ${scopeId}. Switch to ALL to see it.`,
          empty_slot: true,
          empty_slot_response:
            "Scoped view hides another business's current work. J-wide NOW is unchanged.",
        },
    next_queue: queue,
    funnel: {
      ...picture.funnel,
      records,
      stuck_after_first_filter: stuck,
      counts: recount(records),
    },
    open_obligations: (picture.open_obligations ?? []).filter((row) =>
      belongsToScope(row.business_id ?? null, scopeId),
    ),
    what_changed: (picture.what_changed ?? []).filter((row) =>
      belongsToScope(row.business_id ?? null, scopeId),
    ),
    results_learning: (picture.results_learning ?? []).filter((row) => {
      const rec = origRecords.find((item) => item.id === row.id);
      return rec ? belongsToScope(rec.business_id, scopeId) : false;
    }),
    freshness:
      scopeId === "buckparts"
        ? picture.freshness
        : {
            generated_at: picture.freshness?.generated_at,
            amazon_stale: false,
            gsc_stale: false,
            gsc_unsettled_warning: "",
          },
  };
}
