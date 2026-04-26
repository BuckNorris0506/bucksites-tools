import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { TrustAwareBuySection } from "@/components/trust/TrustAwareBuySection";
import { FridgeWinnerFamilyRail } from "@/components/fridge/FridgeWinnerFamilyRail";
import { Prose } from "@/components/Prose";
import { FILTER_PAGE_FIT_CONFIRMATION } from "@/lib/copy/vertical-fit";
import { getFilterBySlug } from "@/lib/data/filters";
import { SITE_DISPLAY_NAME } from "@/lib/site-brand";
import { buyPathSortContextForFilter } from "@/lib/retailers/launch-buy-links";
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
  const buyPathSortContext = buyPathSortContextForFilter(
    filter.slug,
    filter.name,
    filter.oem_part_number,
  );
  const trustSummary = buildPartPageTrust({
    modelsCount: filter.fridge_models.length,
    retailerLinks: filter.retailer_links,
    oemPartNumber: filter.oem_part_number,
    alsoKnownAs: filter.also_known_as,
    notes: filter.notes,
    buyPathSortContext,
  });

  return (
    <article className="space-y-10">
      <FridgeWinnerFamilyRail currentSlug={filter.slug} />

      <div className="rounded-2xl border border-neutral-200 bg-white p-5 shadow-sm dark:border-neutral-800 dark:bg-neutral-950 sm:p-7">
        <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_280px] lg:items-center lg:gap-10">
          <div>
            <p className="text-xs font-medium uppercase tracking-wide text-neutral-500 dark:text-neutral-400">
              Brand
            </p>
            <Link
              href={`/brand/${filter.brand.slug}`}
              className="mt-1 block text-lg font-semibold text-neutral-900 hover:text-neutral-700 dark:text-neutral-50 dark:hover:text-neutral-200"
            >
              {filter.brand.name}
            </Link>

            <h1 className="mt-6 font-mono text-3xl font-semibold tracking-tight text-neutral-900 dark:text-neutral-50 sm:text-[2rem]">
              {filter.oem_part_number}
            </h1>

            <div className="mt-3 space-y-1.5 text-sm text-neutral-700 dark:text-neutral-300">
              <p>
                <span className="font-medium text-neutral-900 dark:text-neutral-100">OEM:</span>{" "}
                {filter.oem_part_number}
              </p>
              {interval ? <p>{interval}</p> : null}
            </div>

            <div className="mt-4 flex flex-wrap gap-2">
              <span className="inline-flex rounded-full bg-neutral-100 px-2.5 py-1 text-xs font-semibold text-neutral-900 ring-1 ring-inset ring-neutral-300 dark:bg-neutral-900 dark:text-neutral-100 dark:ring-neutral-700">
                {fitConfidenceLabel(trustSummary.match_confidence)}
              </span>
              <span className="inline-flex rounded-full bg-neutral-900 px-2.5 py-1 text-xs font-semibold text-white dark:bg-neutral-100 dark:text-neutral-900">
                OEM part
              </span>
            </div>

            <div className="mt-5 rounded-lg border border-neutral-200 bg-neutral-50 px-4 py-3 dark:border-neutral-700 dark:bg-neutral-900/50">
              <p className="text-xs font-medium uppercase tracking-wide text-neutral-500 dark:text-neutral-400">
                Why this fits
              </p>
              <ul className="mt-2 space-y-2 text-sm text-neutral-700 dark:text-neutral-300">
                <li className="flex items-start gap-2">
                  <IconBullet />
                  <span>
                    {filter.fridge_models.length} compatible model
                    {filter.fridge_models.length === 1 ? "" : "s"} in our reference
                  </span>
                </li>
                <li className="flex items-start gap-2">
                  <IconBullet />
                  <span>{filter.notes ? "Notes available" : "No notes listed"}</span>
                </li>
                <li className="flex items-start gap-2">
                  <IconBullet />
                  <span>
                    {trustSummary.buyer_path_state === "suppress_buy"
                      ? "Retail links not verified yet"
                      : "Retail links passed buy-link checks"}
                  </span>
                </li>
              </ul>
            </div>

            <p className="mt-3 text-xs font-medium text-neutral-600 dark:text-neutral-400">
              Model compatibility shown here comes from our reference data.
            </p>

            {trustSummary.requires_manual_verification && (
              <p className="mt-4 rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm leading-relaxed text-amber-900 dark:border-amber-900 dark:bg-amber-950/40 dark:text-amber-100">
                Do not buy yet until you verify the model number or the part you removed against
                your manual, unit label, or the OEM number on the old part.
              </p>
            )}
          </div>

          <RefrigeratorIllustrationCard />
        </div>

        <p className="mt-5 rounded-lg border border-neutral-200 bg-neutral-50 px-3 py-2.5 text-sm leading-relaxed text-neutral-800 dark:border-neutral-700 dark:bg-neutral-900/50 dark:text-neutral-200">
          {FILTER_PAGE_FIT_CONFIRMATION}
        </p>

        {filter.also_known_as.length > 0 ? (
          <p className="mt-3 text-sm text-neutral-600 dark:text-neutral-400">
            <span className="font-medium text-neutral-700 dark:text-neutral-300">Also known as:</span>{" "}
            {filter.also_known_as.join(" · ")}
          </p>
        ) : null}

        {filter.name && (
          <p className="mt-3 text-base text-neutral-700 dark:text-neutral-300">{filter.name}</p>
        )}

        {filter.notes ? (
          <div className="mt-5">
            <Prose>{filter.notes}</Prose>
          </div>
        ) : null}

        <div className="mt-7 border-t border-neutral-100 pt-6 dark:border-neutral-800">
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
              buyPathSortContext={buyPathSortContext}
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
            No models are listed yet.
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

function RefrigeratorIllustrationCard() {
  return (
    <aside className="rounded-xl border border-neutral-200 bg-neutral-50 p-4 dark:border-neutral-800 dark:bg-neutral-900/40">
      <div className="rounded-lg border border-neutral-200 bg-white p-4 dark:border-neutral-700 dark:bg-neutral-950">
        <svg
          viewBox="0 0 180 220"
          className="mx-auto h-auto w-full max-w-[160px] text-neutral-900 dark:text-neutral-100"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <rect x="25" y="8" width="130" height="204" rx="10" fill="currentColor" />
          <rect x="31" y="14" width="118" height="192" rx="8" fill="white" />
          <rect x="31" y="92" width="118" height="2" fill="currentColor" />
          <rect x="119" y="48" width="5" height="28" rx="2.5" fill="currentColor" />
          <rect x="119" y="119" width="5" height="52" rx="2.5" fill="currentColor" />
          <circle cx="90" cy="204" r="4" fill="currentColor" />
        </svg>
      </div>
      <p className="mt-3 text-center text-xs font-medium uppercase tracking-wide text-neutral-500 dark:text-neutral-400">
        Refrigerator filter
      </p>
    </aside>
  );
}

function IconBullet() {
  return (
    <svg
      aria-hidden
      viewBox="0 0 16 16"
      className="mt-[3px] h-3.5 w-3.5 shrink-0 text-neutral-700 dark:text-neutral-300"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <circle cx="8" cy="8" r="5.25" stroke="currentColor" strokeWidth="1.5" />
      <path d="M5.5 8L7.2 9.7L10.5 6.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}

function fitConfidenceLabel(confidence: "high" | "medium" | "unknown"): string {
  if (confidence === "high") return "Fit confidence: strong";
  if (confidence === "medium") return "Fit confidence: review";
  return "Fit confidence: verify";
}
