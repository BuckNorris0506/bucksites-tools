import type { Metadata } from "next";
import Link from "next/link";
import { RevealOnScroll } from "@/components/RevealOnScroll";
import {
  PUBLIC_CATEGORY_HUB_BROWSE_DISCLAIMER,
  buildPublicCategoryHubCards,
} from "@/lib/catalog/public-category-hub";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Browse replacement filters",
  description:
    "Browse replacement filter categories on BuckParts—refrigerator water, air purifier, whole-house water, vacuum, humidifier, and appliance air. Search is still the fastest path when you know a model or part number.",
};

export default function CatalogPage() {
  const categories = buildPublicCategoryHubCards();

  return (
    <div className="space-y-10">
      <header className="space-y-3">
        <h1 className="text-balance text-3xl font-semibold tracking-tight text-neutral-900 dark:text-neutral-50 sm:text-4xl">
          Browse replacement filters
        </h1>
        <p className="max-w-2xl text-pretty text-lg leading-relaxed text-neutral-600 dark:text-neutral-400">
          Pick a category to browse models and part numbers, or use search when you already have a
          code. Only the refrigerator water category is fully launched for public discovery; other
          categories are browse previews while we verify listings.
        </p>
        <div className="max-w-2xl rounded-lg border border-neutral-200 bg-neutral-50/80 p-4 text-sm leading-relaxed text-neutral-700 dark:border-neutral-800 dark:bg-neutral-900/40 dark:text-neutral-300">
          BuckParts may show models, filter numbers, alternates, or pages to compare. Use the model
          or part number on your unit and the filter number printed on the old part, then compare
          with your manual before buying. Buying options appear only when the destination looks safe
          enough to show.
        </div>
        <p className="max-w-2xl text-sm leading-relaxed text-neutral-600 dark:text-neutral-400">
          {PUBLIC_CATEGORY_HUB_BROWSE_DISCLAIMER}
        </p>
        <p className="text-sm font-medium text-neutral-700 dark:text-neutral-300">
          <Link
            href="/search"
            className="text-neutral-900 underline-offset-2 hover:underline dark:text-neutral-100"
          >
            Search model or part number
          </Link>
        </p>
      </header>

      <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {categories.map((c, i) => (
          <RevealOnScroll as="li" key={c.category} delayMs={40 + i * 50}>
            <Link
              href={c.href}
              className="bp-card-interactive flex h-full flex-col rounded-xl border border-neutral-200 bg-white p-5 shadow-sm transition-colors hover:border-neutral-300 hover:bg-neutral-50 dark:border-neutral-800 dark:bg-neutral-950 dark:hover:border-neutral-700 dark:hover:bg-neutral-900/50"
            >
              <div className="flex flex-wrap items-start gap-2">
                <span className="text-lg font-semibold text-neutral-900 dark:text-neutral-50">
                  {c.title}
                </span>
                {c.statusLabel && (
                  <span className="rounded-full border border-amber-200 bg-amber-50 px-2 py-0.5 text-xs font-medium text-amber-900 dark:border-amber-900/50 dark:bg-amber-950/40 dark:text-amber-100">
                    {c.statusLabel}
                  </span>
                )}
              </div>
              <span className="mt-2 text-sm leading-relaxed text-neutral-600 dark:text-neutral-400">
                {c.description}
              </span>
              {c.statusNote && (
                <span className="mt-2 text-xs leading-relaxed text-neutral-500 dark:text-neutral-500">
                  {c.statusNote}
                </span>
              )}
              <span className="mt-4 text-sm font-medium text-neutral-900 dark:text-neutral-100">
                Open category →
              </span>
            </Link>
          </RevealOnScroll>
        ))}
      </ul>
    </div>
  );
}
