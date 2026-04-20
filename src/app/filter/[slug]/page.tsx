import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { PartTrustPanel } from "@/components/trust/PartTrustPanel";
import { TrustAwareBuySection } from "@/components/trust/TrustAwareBuySection";
import { FridgeWinnerFamilyRail } from "@/components/fridge/FridgeWinnerFamilyRail";
import { Prose } from "@/components/Prose";
import { FILTER_PAGE_FIT_CONFIRMATION } from "@/lib/copy/vertical-fit";
import { getFilterBySlug } from "@/lib/data/filters";
import { SITE_DISPLAY_NAME } from "@/lib/site-brand";
import { buildPartPageTrust } from "@/lib/trust/part-trust";
import { intervalLabel } from "@/lib/vertical/interval";

export const dynamic = "force-dynamic";

type Props = { params: { slug: string } };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const filter = await getFilterBySlug(params.slug);
  if (!filter) {
    return { title: "Filter not found" };
  }
  const title = `${filter.oem_part_number} refrigerator filter`;
  return {
    title,
    description: `OEM part ${filter.oem_part_number}. Compatible refrigerators and replacement interval.`,
    openGraph: { title: `${filter.oem_part_number} · ${SITE_DISPLAY_NAME}` },
  };
}

export default async function FilterPage({ params }: Props) {
  const filter = await getFilterBySlug(params.slug);
  if (!filter) notFound();

  const interval = intervalLabel(filter.replacement_interval_months);
  const trustSummary = buildPartPageTrust({
    modelsCount: filter.fridge_models.length,
    retailerLinks: filter.retailer_links,
    oemPartNumber: filter.oem_part_number,
    alsoKnownAs: filter.also_known_as,
    notes: filter.notes,
  });

  return (
    <article className="space-y-10">
      <FridgeWinnerFamilyRail currentSlug={filter.slug} />

      <div className="rounded-xl border border-neutral-200 bg-white p-5 shadow-sm dark:border-neutral-800 dark:bg-neutral-950 sm:p-6">
        <p className="text-xs font-medium uppercase tracking-wide text-neutral-500 dark:text-neutral-400">
          Brand
        </p>
        <Link
          href={`/brand/${filter.brand.slug}`}
          className="mt-1 block text-lg font-semibold text-neutral-900 hover:text-neutral-700 dark:text-neutral-50 dark:hover:text-neutral-200"
        >
          {filter.brand.name}
        </Link>

        <p className="mt-5 rounded-lg border border-neutral-200 bg-neutral-50 px-3 py-2.5 text-sm leading-relaxed text-neutral-800 dark:border-neutral-700 dark:bg-neutral-900/50 dark:text-neutral-200">
          {FILTER_PAGE_FIT_CONFIRMATION}
        </p>

        <h1 className="mt-6 font-mono text-2xl font-semibold tracking-tight text-neutral-900 dark:text-neutral-50">
          {filter.oem_part_number}
        </h1>
        {filter.name && (
          <p className="mt-2 text-base text-neutral-700 dark:text-neutral-300">{filter.name}</p>
        )}
        {interval && (
          <p className="mt-3 text-sm text-neutral-700 dark:text-neutral-300">{interval}</p>
        )}
        {filter.also_known_as.length > 0 ? (
          <p className="mt-3 text-sm text-neutral-600 dark:text-neutral-400">
            <span className="font-medium text-neutral-700 dark:text-neutral-300">
              Also known as:
            </span>{" "}
            {filter.also_known_as.join(" · ")}
          </p>
        ) : null}

        <PartTrustPanel trust={trustSummary} />

        {filter.notes ? (
          <div className="mt-4">
            <Prose>{filter.notes}</Prose>
          </div>
        ) : null}

        <div className="mt-6 border-t border-neutral-100 pt-6 dark:border-neutral-800">
          <p className="text-xs font-medium uppercase tracking-wide text-neutral-500 dark:text-neutral-400">
            Where to buy
          </p>
          <div className="mt-3">
            <TrustAwareBuySection
              trust={trustSummary}
              links={filter.retailer_links}
              goBase="/go"
              primaryCtaLabel="Buy this part at"
              suppressMessage="BuckParts does not have enough proof to show a buy button for this refrigerator filter yet. Verify the OEM number against the old part or your manual first."
              gateSuppressionSummary={filter.buy_path_gate_suppression}
            />
          </div>
        </div>
      </div>

      <section className="space-y-3">
        <h2 className="text-sm font-semibold text-neutral-900 dark:text-neutral-100">
          Compatible refrigerator models ({filter.fridge_models.length})
        </h2>
        {filter.fridge_models.length === 0 ? (
          <p className="text-sm text-neutral-600 dark:text-neutral-400">
            No models mapped yet.
          </p>
        ) : (
          <ul className="divide-y divide-neutral-200 rounded-lg border border-neutral-200 dark:divide-neutral-800 dark:border-neutral-800">
            {filter.fridge_models.map((m) => (
              <li key={m.id}>
                <Link
                  href={`/fridge/${m.slug}`}
                  className="block px-4 py-2.5 text-sm hover:bg-neutral-50 dark:hover:bg-neutral-900"
                >
                  <span className="font-medium text-neutral-900 dark:text-neutral-100">
                    {m.model_number}
                  </span>
                  <span className="ml-2 text-neutral-500">{m.brand.name}</span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>
    </article>
  );
}
