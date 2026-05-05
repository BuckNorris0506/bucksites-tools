import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ManualEvidenceCallout } from "@/components/trust/ManualEvidenceCallout";
import { TrustAwareBuySection } from "@/components/trust/TrustAwareBuySection";
import { VisualReplacementMatchCard } from "@/components/trust/VisualReplacementMatchCard";
import { Prose } from "@/components/Prose";
import { getFridgeBySlug } from "@/lib/data/fridges";
import { loadRefrigeratorManualEvidenceForModel } from "@/lib/manuals/refrigerator-manual-evidence-loader";
import { classifyPageState } from "@/lib/page-state/page-state";
import { getRobotsFromPageState } from "@/lib/page-state/page-state-meta";
import { buyPathSortContextForFilter } from "@/lib/retailers/launch-buy-links";
import { buildPartPageTrust } from "@/lib/trust/part-trust";

export const dynamic = "force-dynamic";

type Props = { params: { slug: string } };

/** Softer suppress copy aligned with `/filter/[slug]` — avoids alarming homeowners when gates apply. */
const FRIDGE_MODEL_FILTER_BUY_SUPPRESS =
  "Compare your old filter or manual first — we're not showing a store button on this page yet.";

function intervalLabel(months: number | null | undefined): string | null {
  if (months == null || months <= 0) return null;
  if (months === 1) return "About every month";
  return `About every ${months} months`;
}

/** Header line when all mapped filters agree on interval (interval lives on filters, not fridges). */
function sharedFilterIntervalLabel(
  filters: { replacement_interval_months: number | null }[],
): string | null {
  const months = filters
    .map((f) => f.replacement_interval_months)
    .filter((m): m is number => m != null && m > 0);
  if (months.length === 0) return null;
  const unique = Array.from(new Set(months));
  if (unique.length !== 1) return null;
  return intervalLabel(unique[0]);
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const fridge = await getFridgeBySlug(params.slug);
  if (!fridge) {
    return { title: "Model not found" };
  }
  const hasAnyMappedFilters = fridge.filters.length > 0;
  const validCtaCount = fridge.filters.reduce((count, f) => count + f.retailer_links.length, 0);
  const pageState = classifyPageState({
    isIndexable: hasAnyMappedFilters,
    validCtaCount,
    hasDemandSignal: null,
  });
  const title = `${fridge.model_number} water filter`;
  return {
    title,
    description: `Compatible water filters and replacement schedule for ${fridge.brand.name} model ${fridge.model_number}.`,
    openGraph: { title: `${fridge.model_number} · ${fridge.brand.name}` },
    robots: getRobotsFromPageState(pageState),
  };
}

export default async function FridgePage({ params }: Props) {
  const fridge = await getFridgeBySlug(params.slug);
  if (!fridge) notFound();
  const manualEvidence = await loadRefrigeratorManualEvidenceForModel(params.slug);

  const fridgeInterval = sharedFilterIntervalLabel(fridge.filters);
  const intervalHint =
    fridgeInterval != null ? `Suggested replacement timing: ${fridgeInterval}` : undefined;

  return (
    <article className="space-y-8">
      <VisualReplacementMatchCard
        variant="fridge_model"
        brandName={fridge.brand.name}
        brandSlug={fridge.brand.slug}
        modelNumber={fridge.model_number}
        mappedFilterCount={fridge.filters.length}
        replacementIntervalHint={intervalHint}
      />

      {manualEvidence ? <ManualEvidenceCallout evidence={manualEvidence} /> : null}

      {fridge.notes ? (
        <div className="max-w-prose text-sm">
          <Prose>{fridge.notes}</Prose>
        </div>
      ) : null}

      <p className="text-sm">
        <Link
          href={`/help/reset-water-filter-light/${fridge.brand.slug}`}
          className="font-medium text-neutral-900 underline dark:text-neutral-100"
        >
          Reset water filter indicator →
        </Link>
      </p>

      <section className="space-y-4">
        <h2 className="text-lg font-medium text-neutral-900 dark:text-neutral-100">
          Compatible filters
        </h2>
        {fridge.filters.length === 0 ? (
          <p className="text-sm text-neutral-600 dark:text-neutral-400">
            No compatible filters mapped yet in the database.
          </p>
        ) : (
          <ul className="space-y-6">
            {fridge.filters.map((f) => {
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
                alsoKnownAs: f.also_known_as,
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
                      <span className="text-sm text-neutral-600 dark:text-neutral-400">
                        {f.name}
                      </span>
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

      {fridge.reset_instructions.length > 0 && (
        <section className="space-y-3">
          <h2 className="text-lg font-medium text-neutral-900 dark:text-neutral-100">
            {fridge.brand.name} reset instructions
          </h2>
          {fridge.reset_instructions.map((r) => (
            <div
              key={r.id}
              className="rounded-lg border border-neutral-200 bg-neutral-50 p-4 dark:border-neutral-800 dark:bg-neutral-900/50"
            >
              {r.title && (
                <h3 className="font-medium text-neutral-900 dark:text-neutral-100">
                  {r.title}
                </h3>
              )}
              <Prose>{r.body_markdown}</Prose>
            </div>
          ))}
        </section>
      )}
    </article>
  );
}
