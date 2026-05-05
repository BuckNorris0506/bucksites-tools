import Link from "next/link";
import { Prose } from "@/components/Prose";
import { TrustAwareBuySection } from "@/components/trust/TrustAwareBuySection";
import type { FridgeMappedFilterRow } from "@/lib/data/fridges";
import { buyPathSortContextForFilter } from "@/lib/retailers/launch-buy-links";
import { buildPartPageTrust } from "@/lib/trust/part-trust";

const FRIDGE_MODEL_FILTER_BUY_SUPPRESS =
  "Compare your old filter or manual first — we're not showing a store button on this page yet.";

function intervalLabel(months: number | null | undefined): string | null {
  if (months == null || months <= 0) return null;
  if (months === 1) return "About every month";
  return `About every ${months} months`;
}

export function FridgeModelFilterSection({
  filters,
  quarantineMessage,
}: {
  filters: FridgeMappedFilterRow[];
  quarantineMessage?: string | null;
}) {
  if (quarantineMessage) {
    return (
      <section className="space-y-4">
        <h2 className="text-lg font-medium text-neutral-900 dark:text-neutral-100">Filter guidance</h2>
        <div className="rounded-lg border border-amber-300 bg-amber-50 p-4 text-sm leading-relaxed text-amber-900 dark:border-amber-700 dark:bg-amber-950/40 dark:text-amber-100">
          {quarantineMessage}
        </div>
      </section>
    );
  }

  return (
    <section className="space-y-4">
      <h2 className="text-lg font-medium text-neutral-900 dark:text-neutral-100">Compatible filters</h2>
      {filters.length === 0 ? (
        <p className="text-sm text-neutral-600 dark:text-neutral-400">
          No compatible filters mapped yet in the database.
        </p>
      ) : (
        <ul className="space-y-6">
          {filters.map((f) => {
            const fInterval = intervalLabel(f.replacement_interval_months);
            const buyPathSortContext = buyPathSortContextForFilter(
              f.slug,
              f.name,
              f.oem_part_number,
            );
            const trustSummary = buildPartPageTrust({
              modelsCount: f.compatible_fridge_model_count,
              retailerLinks: f.retailer_links,
              oemPartNumber: f.oem_part_number,
              alsoKnownAs: [],
              notes: f.notes,
              buyPathSortContext,
            });
            return (
              <li
                key={f.id}
                className="rounded-lg border border-neutral-200 bg-white p-4 dark:border-neutral-800 dark:bg-neutral-950"
              >
                <div className="flex flex-wrap items-baseline gap-2">
                  <Link
                    href={`/filter/${f.slug}`}
                    className="font-mono text-base font-medium text-neutral-900 dark:text-neutral-100"
                  >
                    {f.oem_part_number}
                  </Link>
                  {f.name && (
                    <span className="text-sm text-neutral-600 dark:text-neutral-400">{f.name}</span>
                  )}
                </div>
                {fInterval && (
                  <p className="mt-2 text-sm text-neutral-700 dark:text-neutral-300">
                    Replacement interval: {fInterval}
                  </p>
                )}
                <div className="mt-2">
                  <Prose>{f.notes}</Prose>
                </div>
                <div className="mt-4 border-t border-neutral-100 pt-4 dark:border-neutral-800">
                  <p className="mb-2 text-xs font-medium uppercase tracking-wide text-neutral-500">
                    Where to buy
                  </p>
                  <TrustAwareBuySection
                    trust={trustSummary}
                    links={f.retailer_links}
                    goBase="/go"
                    primaryCtaLabel="Buy this part at"
                    suppressMessage={FRIDGE_MODEL_FILTER_BUY_SUPPRESS}
                    gateSuppressionSummary={f.buy_path_gate_suppression}
                    buyPathSortContext={buyPathSortContext}
                  />
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
