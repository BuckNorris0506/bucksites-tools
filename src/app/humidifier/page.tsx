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
  title: "Humidifier filters",
  description:
    "Find replacement humidifier wicks and filters by model or OEM part number. Free lookup.",
};

export default async function HumidifierHomePage() {
  let brands: Awaited<ReturnType<typeof listBrowseBrands>> = [];
  let models: Awaited<ReturnType<typeof listBrowseModels>> = [];
  let filters: Awaited<ReturnType<typeof listBrowseFilters>> = [];
  try {
    [brands, models, filters] = await Promise.all([
      listBrowseBrands("humidifier"),
      listBrowseModels("humidifier"),
      listBrowseFilters("humidifier"),
    ]);
  } catch {
    // DB unavailable
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
          Humidifier replacement filters
        </h1>
        <p className="max-w-2xl text-pretty text-lg leading-relaxed text-neutral-600 dark:text-neutral-400">
          Search by humidifier model or OEM cartridge number to confirm fit before you buy.
        </p>
        <p className="text-sm font-medium text-neutral-700 dark:text-neutral-300">
          Free to use · No account
        </p>
        <SearchForm actionPath="/humidifier/search" />
      </section>

      <CategoryBrowseSections
        categoryLabel="humidifier filters"
        searchPath="/humidifier/search"
        brandBasePath="/humidifier/brand"
        modelHref={(s) => `/humidifier/model/${s}`}
        filterHref={(s) => `/humidifier/filter/${s}`}
        brands={brands}
        models={models}
        filters={filters}
      />
    </div>
  );
}
