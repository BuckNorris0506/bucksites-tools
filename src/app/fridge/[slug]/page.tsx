import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { FridgeModelFilterSection } from "@/components/fridge/FridgeModelFilterSection";
import { ManualEvidenceCallout } from "@/components/trust/ManualEvidenceCallout";
import { VisualReplacementMatchCard } from "@/components/trust/VisualReplacementMatchCard";
import { Prose } from "@/components/Prose";
import { getFridgeBySlug } from "@/lib/data/fridges";
import { getFridgeModelReviewOverride } from "@/lib/fridge/fridge-model-review-overrides";
import { loadRefrigeratorManualEvidenceForModel } from "@/lib/manuals/refrigerator-manual-evidence-loader";
import { classifyPageState } from "@/lib/page-state/page-state";
import { getRobotsFromPageState } from "@/lib/page-state/page-state-meta";

export const dynamic = "force-dynamic";

type Props = { params: { slug: string } };

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
  const reviewOverride = getFridgeModelReviewOverride(params.slug);
  const manualEvidence = reviewOverride
    ? null
    : await loadRefrigeratorManualEvidenceForModel(params.slug);

  const fridgeInterval = sharedFilterIntervalLabel(fridge.filters);
  const intervalHint =
    fridgeInterval != null ? `Suggested replacement timing: ${fridgeInterval}` : undefined;

  return (
    <section className="-mx-4 bg-gradient-to-b from-amber-50/35 via-white to-stone-50/45 px-4 py-8 sm:-mx-6 sm:px-6 sm:py-10 lg:-mx-8 lg:px-8 lg:py-12">
      <article className="mx-auto max-w-2xl space-y-10 sm:space-y-12">
        <VisualReplacementMatchCard
          variant="fridge_model"
          brandName={fridge.brand.name}
          brandSlug={fridge.brand.slug}
          modelNumber={fridge.model_number}
          mappedFilterCount={reviewOverride ? 0 : fridge.filters.length}
          connectedFilters={reviewOverride ? [] : fridge.filters}
          replacementIntervalHint={intervalHint}
        />

        {manualEvidence ? <ManualEvidenceCallout evidence={manualEvidence} /> : null}

        {!reviewOverride && fridge.notes ? (
          <div className="max-w-prose text-sm">
            <Prose>{fridge.notes}</Prose>
          </div>
        ) : null}

        <p className="text-base">
          <Link
            href={`/help/reset-water-filter-light/${fridge.brand.slug}`}
            className="font-semibold text-blue-950 underline decoration-blue-950/25 underline-offset-4 transition hover:decoration-blue-950/60"
          >
            Reset water filter indicator →
          </Link>
        </p>

        <FridgeModelFilterSection
          filters={fridge.filters}
          quarantineMessage={reviewOverride?.public_message ?? null}
        />

        {fridge.reset_instructions.length > 0 && (
          <section className="space-y-4">
            <h2 className="text-xl font-semibold text-stone-900">
              {fridge.brand.name} reset instructions
            </h2>
            {fridge.reset_instructions.map((r) => (
              <div
                key={r.id}
                className="rounded-2xl bg-stone-50/90 p-5 ring-1 ring-stone-200/45"
              >
                {r.title && <h3 className="font-semibold text-stone-900">{r.title}</h3>}
                <Prose>{r.body_markdown}</Prose>
              </div>
            ))}
          </section>
        )}
      </article>
    </section>
  );
}
