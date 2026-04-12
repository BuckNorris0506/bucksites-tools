import type { Metadata } from "next";
import Link from "next/link";
import { CategoryBrowseSections } from "@/components/catalog/CategoryBrowseSections";
import { SearchForm } from "@/components/SearchForm";
import {
  brandNameForBrowseChip,
  listBrowseBrands,
  listBrowseFilters,
  listBrowseModels,
} from "@/lib/catalog/browse";
import { SITE_DISPLAY_NAME } from "@/lib/site-brand";

export const metadata: Metadata = {
  title: "Replacement filters & parts lookup",
  description: `${SITE_DISPLAY_NAME} helps you match refrigerator water filters, room air purifier cartridges, and whole-house water cartridges to your model or OEM number—then compare store links when you’re ready to buy.`,
};

export default async function HomePage() {
  let browseBrands: Awaited<ReturnType<typeof listBrowseBrands>> = [];
  let browseModels: Awaited<ReturnType<typeof listBrowseModels>> = [];
  let browseFilters: Awaited<ReturnType<typeof listBrowseFilters>> = [];
  try {
    [browseBrands, browseModels, browseFilters] = await Promise.all([
      listBrowseBrands("refrigerator_water"),
      listBrowseModels("refrigerator_water"),
      listBrowseFilters("refrigerator_water"),
    ]);
  } catch {
    // DB unavailable — page still renders with search only.
  }

  const popularBrands = browseBrands.slice(0, 12);
  const resetBrandLinks = browseBrands.slice(0, 6);

  return (
    <div className="space-y-16 lg:space-y-24">
      <section className="space-y-8 lg:space-y-10">
        <div className="space-y-5 lg:space-y-6">
          <h1 className="text-balance text-3xl font-semibold tracking-tight text-neutral-900 dark:text-neutral-50 sm:text-4xl lg:text-5xl lg:leading-[1.1]">
            Look up replacement filters before you buy
          </h1>
          <p className="max-w-3xl text-pretty text-lg leading-relaxed text-neutral-600 dark:text-neutral-400 sm:text-xl sm:leading-relaxed">
            {SITE_DISPLAY_NAME} is a homeowner-focused reference: enter your appliance or system model number, or
            the OEM number printed on the cartridge you’re replacing. We show what we’ve matched in our
            database—including common alternates—so you can double-check fit, then open retailer links
            on your own terms.
          </p>
          <p className="text-base font-medium text-neutral-700 dark:text-neutral-300">
            Free to use · No account · Independent lookup (not a store)
          </p>
        </div>
        <SearchForm />
        <p className="text-sm text-neutral-600 dark:text-neutral-400">
          <Link
            href="/catalog"
            className="font-medium text-neutral-900 underline-offset-2 hover:underline dark:text-neutral-100"
          >
            Browse categories
          </Link>
          <span className="mx-2 text-neutral-400 dark:text-neutral-600">·</span>
          <Link
            href="/air-purifier"
            className="font-medium text-neutral-900 underline-offset-2 hover:underline dark:text-neutral-100"
          >
            Air purifier filters
          </Link>
          <span className="mx-2 text-neutral-400 dark:text-neutral-600">·</span>
          <Link
            href="/whole-house-water"
            className="font-medium text-neutral-900 underline-offset-2 hover:underline dark:text-neutral-100"
          >
            Whole-house water
          </Link>
        </p>
      </section>

      <CategoryBrowseSections
        categoryLabel="refrigerator water filters"
        searchPath="/search"
        brandBasePath="/brand"
        modelHref={(s) => `/fridge/${s}`}
        filterHref={(s) => `/filter/${s}`}
        filterColumnHeading="Water filters"
        brands={browseBrands}
        models={browseModels}
        filters={browseFilters}
      />

      {popularBrands.length > 0 && (
        <section className="space-y-4">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-neutral-500 dark:text-neutral-400">
            Popular brands
          </h2>
          <ul className="flex flex-wrap gap-2.5">
            {popularBrands.map((b) => (
              <li key={b.slug}>
                <Link
                  href={`/brand/${b.slug}`}
                  className="inline-flex rounded-full border border-neutral-200 bg-white px-3.5 py-2 text-sm font-medium text-neutral-800 transition-colors hover:border-neutral-300 hover:bg-neutral-50 dark:border-neutral-700 dark:bg-neutral-950 dark:text-neutral-200 dark:hover:border-neutral-600 dark:hover:bg-neutral-900"
                >
                  {brandNameForBrowseChip(b)}
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}

      <section className="space-y-6">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-neutral-500 dark:text-neutral-400">
          How it works
        </h2>
        <ol className="grid gap-5 sm:grid-cols-3 sm:gap-6 lg:gap-8">
          {[
            {
              step: "1",
              title: "Search",
              body: "Type the model from the nameplate, or the OEM part number on the old filter—refrigerator water filters, room air purifiers, or whole-house cartridges, depending on which catalog you’re in.",
            },
            {
              step: "2",
              title: "Confirm fit",
              body: "Open the model or part page for compatibility notes, suggested change timing when we have it, and any alternates we list.",
            },
            {
              step: "3",
              title: "Shop",
              body: "When you’re ready, use the store links on the page. We log outbound clicks in aggregate to see what’s useful—never required to use the lookup.",
            },
          ].map((item) => (
            <li
              key={item.step}
              className="rounded-lg border border-neutral-200 bg-neutral-50/80 p-5 dark:border-neutral-800 dark:bg-neutral-900/40 sm:p-6"
            >
              <span className="text-xs font-semibold uppercase tracking-wide text-neutral-500 dark:text-neutral-400">
                Step {item.step}
              </span>
              <h3 className="mt-2 text-base font-semibold text-neutral-900 dark:text-neutral-100">
                {item.title}
              </h3>
              <p className="mt-3 text-sm leading-relaxed text-neutral-600 dark:text-neutral-400 sm:text-[15px] sm:leading-relaxed">
                {item.body}
              </p>
            </li>
          ))}
        </ol>
      </section>

      <section className="space-y-5 border-t border-neutral-200 pt-12 dark:border-neutral-800 lg:pt-16">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-neutral-500 dark:text-neutral-400">
          Guides
        </h2>
        <ul className="space-y-3 text-sm sm:text-base">
          <li>
            <Link
              href="/help/how-to-find-refrigerator-model-number"
              className="font-medium text-neutral-900 underline-offset-4 hover:underline dark:text-neutral-100"
            >
              How to find your refrigerator model number
            </Link>
          </li>
          <li>
            <Link
              href="/help/how-often-to-replace-refrigerator-water-filter"
              className="font-medium text-neutral-900 underline-offset-4 hover:underline dark:text-neutral-100"
            >
              How often to replace a refrigerator water filter
            </Link>
          </li>
        </ul>
        {resetBrandLinks.length > 0 && (
          <div className="space-y-3 pt-2">
            <p className="text-sm font-medium text-neutral-800 dark:text-neutral-200 sm:text-base">
              Reset water filter light by brand
            </p>
            <ul className="flex flex-wrap gap-x-4 gap-y-2 text-sm text-neutral-600 dark:text-neutral-400 sm:text-[15px]">
              {resetBrandLinks.map((b) => (
                <li key={b.slug}>
                  <Link
                    href={`/help/reset-water-filter-light/${b.slug}`}
                    className="underline-offset-4 hover:text-neutral-900 hover:underline dark:hover:text-neutral-100"
                  >
                    {b.name}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        )}
      </section>
    </div>
  );
}
