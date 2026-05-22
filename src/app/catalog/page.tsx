import type { Metadata } from "next";
import Link from "next/link";
import { RevealOnScroll } from "@/components/RevealOnScroll";
import { listPopulatedCatalogCards } from "@/lib/catalog/catalog-availability";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Catalog",
  description:
    "Browse refrigerator water filter models and cartridges with active listings. Search is still the fastest path when you know a model or part number.",
};

export default async function CatalogPage() {
  let cards: Awaited<ReturnType<typeof listPopulatedCatalogCards>> = [];
  try {
    cards = await listPopulatedCatalogCards();
  } catch {
    cards = [];
  }

  return (
    <div className="space-y-10">
      <header className="space-y-3">
        <h1 className="text-balance text-3xl font-semibold tracking-tight text-neutral-900 dark:text-neutral-50 sm:text-4xl">
          Refrigerator water filters
        </h1>
        <p className="max-w-2xl text-pretty text-lg leading-relaxed text-neutral-600 dark:text-neutral-400">
          This hub highlights refrigerator water filters with active listings. Search is still the
          fastest path when you know a fridge model or filter number.
        </p>
        <div className="max-w-2xl rounded-lg border border-neutral-200 bg-neutral-50/80 p-4 text-sm leading-relaxed text-neutral-700 dark:border-neutral-800 dark:bg-neutral-900/40 dark:text-neutral-300">
          BuckParts may show models, filter numbers, alternates, or pages to compare. Use the
          model number on your refrigerator or the filter number printed on the old part, then
          compare it with your manual before buying. Buying options appear only when the
          destination looks safe enough to show.
        </div>
        <p className="text-sm font-medium text-neutral-700 dark:text-neutral-300">
          <Link
            href="/search"
            className="text-neutral-900 underline-offset-2 hover:underline dark:text-neutral-100"
          >
            Search refrigerator model or filter number
          </Link>
        </p>
      </header>

      {cards.length === 0 ? (
        <div className="rounded-xl border border-neutral-200 bg-neutral-50/80 p-6 dark:border-neutral-800 dark:bg-neutral-900/40">
          <p className="text-sm leading-relaxed text-neutral-600 dark:text-neutral-400">
            No categories have listings yet. Use search when you have a model or part number, or
            check back after your catalog data is loaded.
          </p>
          <p className="mt-4 text-sm font-medium">
            <Link
              href="/search"
              className="text-neutral-900 underline-offset-2 hover:underline dark:text-neutral-100"
            >
              Go to search
            </Link>
            <span className="text-neutral-400 dark:text-neutral-500"> · </span>
            <Link
              href="/"
              className="text-neutral-900 underline-offset-2 hover:underline dark:text-neutral-100"
            >
              Home
            </Link>
          </p>
        </div>
      ) : (
        <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {cards.map((c, i) => (
            <RevealOnScroll as="li" key={c.href} delayMs={40 + i * 50}>
              <Link
                href={c.href}
                className="bp-card-interactive flex h-full flex-col rounded-xl border border-neutral-200 bg-white p-5 shadow-sm transition-colors hover:border-neutral-300 hover:bg-neutral-50 dark:border-neutral-800 dark:bg-neutral-950 dark:hover:border-neutral-700 dark:hover:bg-neutral-900/50"
              >
                <span className="text-lg font-semibold text-neutral-900 dark:text-neutral-50">
                  {c.title}
                </span>
                <span className="mt-2 text-sm leading-relaxed text-neutral-600 dark:text-neutral-400">
                  {c.description}
                </span>
                <span className="mt-4 text-sm font-medium text-neutral-900 dark:text-neutral-100">
                  Open category →
                </span>
              </Link>
            </RevealOnScroll>
          ))}
        </ul>
      )}
    </div>
  );
}
