import Link from "next/link";
import React from "react";
import { FridgeTrustFunnelLink } from "@/components/analytics/FridgeTrustFunnelLink";
import { Prose } from "@/components/Prose";
import { TrustAwareBuySection } from "@/components/trust/TrustAwareBuySection";
import type { FridgeMappedFilterRow } from "@/lib/data/fridges";
import type { FridgeTrustFunnelPayload } from "@/lib/analytics/fridge-trust-funnel";
import { publicFacingRefrigeratorFilterNotes } from "@/lib/copy/fridge-filter-notes-public";
import { buyPathSortContextForFilter } from "@/lib/retailers/launch-buy-links";
import { buildPartPageTrust } from "@/lib/trust/part-trust";

const FRIDGE_MODEL_FILTER_BUY_SUPPRESS =
  "No buying options yet. We haven’t found a product page we’re comfortable showing for this filter number.";

function intervalLabel(months: number | null | undefined): string | null {
  if (months == null || months <= 0) return null;
  if (months === 1) return "About every month";
  return `About every ${months} months`;
}

function filterNotesHtml(notes: string | null | undefined): string | null {
  return publicFacingRefrigeratorFilterNotes(notes);
}

export function FridgeModelFilterSection({
  filters,
  quarantineMessage,
  telemetryBase,
}: {
  filters: FridgeMappedFilterRow[];
  quarantineMessage?: string | null;
  telemetryBase?: Omit<FridgeTrustFunnelPayload, "event_name" | "filter_slug">;
}) {
  if (quarantineMessage) {
    return (
      <section className="space-y-5">
        <h2 className="text-xl font-semibold text-stone-900">Filter guidance</h2>
        <div className="rounded-3xl border border-amber-200/65 bg-gradient-to-b from-amber-50/90 to-amber-50/50 p-6 text-[15px] leading-relaxed text-amber-950 shadow-sm">
          {quarantineMessage}
        </div>
      </section>
    );
  }

  return (
    <section className="space-y-8">
      <div className="space-y-3">
        <h2 className="text-xl font-semibold text-stone-900">Full detail for each number</h2>
        <p className="max-w-prose text-base leading-relaxed text-stone-600">
          Same numbers as the chips above—here with notes and buying options.{" "}
          <strong className="font-medium text-stone-800">Not a ranked list.</strong> Open filter
          details before using any buying option.
        </p>
      </div>

      {filters.length === 0 ? (
        <p className="text-sm leading-relaxed text-stone-600">
          We do not have mapped filter numbers for this model in our reference yet. If you have the filter number from your
          old filter, try search or check back after catalog updates.
        </p>
      ) : (
        <ul className="m-0 list-none space-y-8 p-0">
          {filters.map((f) => {
            const fInterval = intervalLabel(f.replacement_interval_months);
            const filterHref = `/filter/${f.slug}`;
            const buyPathSortContext = buyPathSortContextForFilter(
              f.slug,
              f.name,
              f.oem_part_number,
            );
            const trustSummary = buildPartPageTrust({
              modelsCount: f.compatible_fridge_model_count,
              retailerLinks: f.retailer_links,
              oemPartNumber: f.oem_part_number,
              alsoKnownAs: f.also_known_as,
              notes: f.notes,
              buyPathSortContext,
            });
            const notesHtml = filterNotesHtml(f.notes);
            const aliases = f.also_known_as ?? [];

            return (
              <li
                key={f.id}
                className="overflow-hidden rounded-3xl bg-white p-6 shadow-sm ring-1 ring-stone-200/45 sm:p-7"
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0 flex-1 space-y-4">
                    <p className="text-xs font-semibold uppercase tracking-wide text-stone-500">
                      Number to compare
                    </p>
                    <Link
                      href={filterHref}
                      className="block text-2xl font-bold tabular-nums tracking-tight text-stone-900 underline decoration-stone-300 decoration-2 underline-offset-[0.2em] transition hover:decoration-blue-950/50"
                    >
                      {f.oem_part_number}
                    </Link>
                    <div>
                      <FridgeTrustFunnelLink
                        href={filterHref}
                        className="inline-flex min-h-12 items-center justify-center rounded-2xl bg-blue-950 px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-900 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-400 focus-visible:ring-offset-2"
                        payload={{
                          event_name: "fridge_filter_detail_click_from_model",
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
                        Open filter details<span aria-hidden> →</span>
                      </FridgeTrustFunnelLink>
                    </div>
                    {f.name?.trim() ? (
                      <p className="text-sm text-stone-700">{f.name.trim()}</p>
                    ) : null}
                    {aliases.length > 0 ? (
                      <p className="text-sm text-stone-600">
                        <span className="font-medium text-stone-800">Also listed as:</span>{" "}
                        <span className="font-semibold tabular-nums text-stone-800">
                          {aliases.join(" · ")}
                        </span>
                      </p>
                    ) : null}
                    <p className="text-sm font-medium text-stone-800">
                      Compare this number to the text on your existing cartridge before you buy.
                    </p>
                    {fInterval ? (
                      <p className="text-xs text-stone-600">
                        Typical replacement timing on file: {fInterval}
                      </p>
                    ) : null}
                  </div>
                </div>

                {notesHtml ? (
                  <div className="mt-5 border-t border-stone-200/70 pt-5 text-sm">
                    <Prose>{notesHtml}</Prose>
                  </div>
                ) : null}

                <div className="mt-6 rounded-2xl bg-stone-50/95 p-5 ring-1 ring-stone-200/35">
                  <p className="text-xs font-medium text-stone-600">
                    Buying options (secondary—only after this number matches what you need)
                  </p>
                  <div className="mt-4">
                    <TrustAwareBuySection
                      trust={trustSummary}
                      links={f.retailer_links}
                      goBase="/go"
                      primaryCtaLabel="Open reviewed listing"
                      suppressMessage={FRIDGE_MODEL_FILTER_BUY_SUPPRESS}
                      gateSuppressionSummary={f.buy_path_gate_suppression}
                      buyPathSortContext={buyPathSortContext}
                    />
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
