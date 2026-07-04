import type { Metadata } from "next";
import Link from "next/link";
import { CategoryBrowseSections } from "@/components/catalog/CategoryBrowseSections";
import { SearchForm } from "@/components/SearchForm";
import {
  listBrowseBrands,
  listBrowseFilters,
  listBrowseModels,
} from "@/lib/catalog/browse";

export const metadata: Metadata = {
  title: "Air purifier filter replacement",
  description:
    "Find the air purifier replacement filter for your unit. Search by model number or filter number, then compare the part number with your old filter or manual before buying.",
};

export default async function AirPurifierHomePage() {
  let brands: Awaited<ReturnType<typeof listBrowseBrands>> = [];
  let models: Awaited<ReturnType<typeof listBrowseModels>> = [];
  let filters: Awaited<ReturnType<typeof listBrowseFilters>> = [];
  try {
    [brands, models, filters] = await Promise.all([
      listBrowseBrands("air_purifier"),
      listBrowseModels("air_purifier"),
      listBrowseFilters("air_purifier"),
    ]);
  } catch {
    // DB unavailable — still render search + shell.
  }

  return (
    <div className="space-y-10">
      <section className="space-y-4">
        <p className="text-sm text-neutral-500 dark:text-neutral-400">
          <Link href="/" className="hover:text-neutral-800 dark:hover:text-neutral-200">
            ← Home
          </Link>
        </p>
        <h1 className="text-balance text-3xl font-semibold tracking-tight text-neutral-900 dark:text-neutral-50 sm:text-4xl">
          Find the right air purifier filter replacement
        </h1>
        <p className="max-w-2xl text-pretty text-lg leading-relaxed text-neutral-600 dark:text-neutral-400">
          Search by the air purifier model number or the filter number printed on the part you’re
          replacing. BuckParts is opening air purifier filter lookup with truth-gated buying options—buying options appear only where listing checks pass, not on every filter.
        </p>
        <ul className="max-w-2xl list-inside list-disc space-y-1 text-sm text-neutral-600 dark:text-neutral-400">
          <li>Use the model number on your air purifier or the filter number on the old filter.</li>
          <li>If we have checked a retailer product page for that filter, we’ll show it as a buying option.</li>
          <li>If no buying option appears yet, use the part number or manual to keep comparing.</li>
          <li>Before buying, compare the part number with your old filter or manual.</li>
        </ul>
        <p className="text-sm font-medium text-neutral-700 dark:text-neutral-300">
          Free lookup · No account · BuckParts is not the seller
        </p>
        <SearchForm actionPath="/air-purifier/search" />
      </section>

      <CategoryBrowseSections
        categoryLabel="air purifier filters"
        searchPath="/air-purifier/search"
        brandBasePath="/air-purifier/brand"
        modelHref={(s) => `/air-purifier/model/${s}`}
        filterHref={(s) => `/air-purifier/filter/${s}`}
        brands={brands}
        models={models}
        filters={filters}
      />
    </div>
  );
}
