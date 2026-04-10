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
  title: "Appliance air filters",
  description:
    "Find range hood, microwave, and refrigerator vent air filters by model or OEM part number.",
};

export default async function ApplianceAirHomePage() {
  let brands: Awaited<ReturnType<typeof listBrowseBrands>> = [];
  let models: Awaited<ReturnType<typeof listBrowseModels>> = [];
  let filters: Awaited<ReturnType<typeof listBrowseFilters>> = [];
  try {
    [brands, models, filters] = await Promise.all([
      listBrowseBrands("appliance_air"),
      listBrowseModels("appliance_air"),
      listBrowseFilters("appliance_air"),
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
          Appliance air filters
        </h1>
        <p className="max-w-2xl text-pretty text-lg leading-relaxed text-neutral-600 dark:text-neutral-400">
          Lookup OEM grease and charcoal filters for range hoods, over-the-range microwaves, and
          similar appliances.
        </p>
        <p className="text-sm font-medium text-neutral-700 dark:text-neutral-300">
          Free to use · No account
        </p>
        <SearchForm actionPath="/appliance-air/search" />
      </section>

      <CategoryBrowseSections
        categoryLabel="appliance air filters"
        searchPath="/appliance-air/search"
        brandBasePath="/appliance-air/brand"
        modelHref={(s) => `/appliance-air/model/${s}`}
        filterHref={(s) => `/appliance-air/filter/${s}`}
        brands={brands}
        models={models}
        filters={filters}
        filterColumnHeading="Filters & parts"
      />
    </div>
  );
}
