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
  title: "Air purifier replacement filters",
  description:
    "Look up room air purifier cartridges by unit model or OEM filter number. See which models a part fits, typical change timing when available, and store links—free, no account.",
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
          Air purifier replacement filters
        </h1>
        <p className="max-w-2xl text-pretty text-lg leading-relaxed text-neutral-600 dark:text-neutral-400">
          Room air purifiers use different cartridge shapes and OEM numbers. Search by the model on
          the nameplate or the part number on the filter you’re tossing—we show matches from our
          reference so you can line them up with what you have before you shop.
        </p>
        <ul className="max-w-2xl list-inside list-disc space-y-1 text-sm text-neutral-600 dark:text-neutral-400">
          <li>Model page: “What filter does this purifier take?”</li>
          <li>Filter page: “Which units use this cartridge?”</li>
          <li>Always compare the OEM number with your old filter or manual.</li>
        </ul>
        <p className="text-sm font-medium text-neutral-700 dark:text-neutral-300">
          Free reference · No account · Not a retailer
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
