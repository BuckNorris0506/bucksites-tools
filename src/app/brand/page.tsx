import type { Metadata } from "next";
import Link from "next/link";
import { listBrandsForNav } from "@/lib/data/brands";
import { canonicalAlternatesForPath } from "@/lib/seo/canonical";
import { SITE_DISPLAY_NAME } from "@/lib/site-brand";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Refrigerator filter brands",
  description:
    "Browse refrigerator water filter brands on BuckParts—models and part numbers by manufacturer.",
  openGraph: { title: `Refrigerator brands · ${SITE_DISPLAY_NAME}` },
  ...canonicalAlternatesForPath("/brand"),
};

export default async function BrandIndexPage() {
  const brands = await listBrandsForNav();

  return (
    <article className="space-y-8">
      <header className="space-y-2">
        <h1 className="text-2xl font-semibold text-neutral-900 dark:text-neutral-50">
          Refrigerator filter brands
        </h1>
        <p className="max-w-2xl text-sm leading-relaxed text-neutral-600 dark:text-neutral-400">
          Pick a brand to browse fridge models and water filter numbers. Search is still the fastest
          path when you already have a model or part code.
        </p>
        <p className="text-sm font-medium">
          <Link href="/search" className="text-neutral-900 underline dark:text-neutral-100">
            Search model or part number
          </Link>
          {" · "}
          <Link href="/catalog" className="text-neutral-900 underline dark:text-neutral-100">
            All categories
          </Link>
        </p>
      </header>
      <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {brands.map((brand) => (
          <li key={brand.slug}>
            <Link
              href={`/brand/${brand.slug}`}
              className="block rounded-xl border border-neutral-200 bg-white px-4 py-3 text-base font-medium text-neutral-900 shadow-sm transition-colors hover:border-neutral-300 hover:bg-neutral-50 dark:border-neutral-800 dark:bg-neutral-950 dark:text-neutral-50 dark:hover:border-neutral-700 dark:hover:bg-neutral-900/50"
            >
              {brand.name}
            </Link>
          </li>
        ))}
      </ul>
    </article>
  );
}
