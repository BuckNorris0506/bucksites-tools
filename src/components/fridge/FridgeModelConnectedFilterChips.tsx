import React from "react";
import { FridgeTrustFunnelLink } from "@/components/analytics/FridgeTrustFunnelLink";
import type { FridgeTrustFunnelPayload } from "@/lib/analytics/fridge-trust-funnel";

import type { FridgeMappedFilterRow } from "@/lib/data/fridges";

/**
 * Compact, scannable OEM numbers for the fridge model hub — compare only; list order is not a ranking.
 */
export function FridgeModelConnectedFilterChips({
  filters,
  telemetryBase,
}: {
  filters: FridgeMappedFilterRow[];
  telemetryBase?: Omit<FridgeTrustFunnelPayload, "event_name" | "filter_slug">;
}) {
  if (filters.length === 0) return null;

  return (
    <section
      aria-label="Filter numbers to compare for this refrigerator"
      className="rounded-3xl bg-white/90 p-6 shadow-sm ring-1 ring-stone-200/45 sm:p-7"
    >
      <p className="text-sm font-semibold text-stone-800">Numbers to compare</p>
      <p className="mt-2 text-sm leading-snug text-stone-600">
        Not sorted as best to worst.
      </p>
      <div className="mt-4 flex flex-wrap gap-2.5">
        {filters.map((f) => (
          <FridgeTrustFunnelLink
            key={f.id}
            href={`/filter/${f.slug}`}
            className="inline-flex min-h-11 items-center rounded-2xl bg-gradient-to-b from-stone-50 to-white px-4 py-2.5 text-base font-semibold tracking-wide text-stone-900 shadow-sm ring-1 ring-stone-200/55 transition hover:-translate-y-0.5 hover:from-blue-50/95 hover:to-sky-50/80 hover:shadow-md hover:ring-blue-200/55 active:translate-y-0"
            payload={{
              event_name: "fridge_filter_chip_click",
              page_type: telemetryBase?.page_type ?? "fridge_model",
              page_slug: telemetryBase?.page_slug ?? "unknown",
              model_slug: telemetryBase?.model_slug ?? null,
              filter_slug: f.slug,
              trust_state: telemetryBase?.trust_state ?? "normal",
              source_tier_present: telemetryBase?.source_tier_present ?? false,
              has_safe_cta: telemetryBase?.has_safe_cta ?? false,
              is_quarantined: telemetryBase?.is_quarantined ?? false,
            }}
          >
            {f.oem_part_number}
          </FridgeTrustFunnelLink>
        ))}
      </div>
      <p className="mt-4 text-sm leading-snug text-stone-600">
        Do not guess. Match the number printed on your old filter.
      </p>
    </section>
  );
}
