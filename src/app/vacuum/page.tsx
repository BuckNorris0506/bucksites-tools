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
  title: "Vacuum filters",
  description:
    "Find replacement vacuum filters and bags by model or OEM part number. Free lookup.",
};

export default async function VacuumHomePage() {
  let brands: Awaited<ReturnType<typeof listBrowseBrands>> = [];
  let models: Awaited<ReturnType<typeof listBrowseModels>> = [];
  let filters: Awaited<ReturnType<typeof listBrowseFilters>> = [];
  try {
    [brands, models, filters] = await Promise.all([
      listBrowseBrands("vacuum"),
      listBrowseModels("vacuum"),
      listBrowseFilters("vacuum"),
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
          Vacuum filters & bags
        </h1>
        <p className="max-w-2xl text-pretty text-lg leading-relaxed text-neutral-600 dark:text-neutral-400">
          Search by vacuum model or OEM filter part number to confirm fit before you buy.
        </p>
        <p className="text-sm font-medium text-neutral-700 dark:text-neutral-300">
          Free to use · No account
        </p>
        <SearchForm actionPath="/vacuum/search" />
      </section>

      <CategoryBrowseSections
        categoryLabel="vacuum filters"
        searchPath="/vacuum/search"
        brandBasePath="/vacuum/brand"
        modelHref={(s) => `/vacuum/model/${s}`}
        filterHref={(s) => `/vacuum/filter/${s}`}
        brands={brands}
        models={models}
        filters={filters}
      />
    </div>
  );
}
