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
  title: "Whole-house water filter cartridges",
  description:
    "Match sediment, carbon, and combo cartridges to your whole-home system or housing model. OEM numbers, compatible models, and buying links—free homeowner lookup.",
};

export default async function WholeHouseWaterHomePage() {
  let brands: Awaited<ReturnType<typeof listBrowseBrands>> = [];
  let models: Awaited<ReturnType<typeof listBrowseModels>> = [];
  let filters: Awaited<ReturnType<typeof listBrowseFilters>> = [];
  try {
    [brands, models, filters] = await Promise.all([
      listBrowseBrands("whole_house_water"),
      listBrowseModels("whole_house_water"),
      listBrowseFilters("whole_house_water"),
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
          Whole-house water filter cartridges
        </h1>
        <p className="max-w-2xl text-pretty text-lg leading-relaxed text-neutral-600 dark:text-neutral-400">
          Point-of-entry and big blue–style housings need the right length, diameter, and micron
          rating—not just a similar-looking cartridge. Search by system model or the OEM number on
          the filter you’re replacing; we list what our data ties together so you can verify against
          your installed hardware.
        </p>
        <ul className="max-w-2xl list-inside list-disc space-y-1 text-sm text-neutral-600 dark:text-neutral-400">
          <li>Model page: cartridges matched to your system or housing SKU.</li>
          <li>Cartridge page: which systems use that part number.</li>
          <li>Double-check dimensions and rating with what’s in the sump.</li>
        </ul>
        <p className="text-sm font-medium text-neutral-700 dark:text-neutral-300">
          Free reference · No account · Not a retailer
        </p>
        <SearchForm actionPath="/whole-house-water/search" />
      </section>

      <CategoryBrowseSections
        categoryLabel="whole-house water filters"
        searchPath="/whole-house-water/search"
        brandBasePath="/whole-house-water/brand"
        modelHref={(s) => `/whole-house-water/model/${s}`}
        filterHref={(s) => `/whole-house-water/filter/${s}`}
        brands={brands}
        models={models}
        filters={filters}
        filterColumnHeading="Cartridges & parts"
      />
    </div>
  );
}
