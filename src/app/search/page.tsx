import type { Metadata } from "next";
import Link from "next/link";
import { SearchForm } from "@/components/SearchForm";
import { searchCatalog } from "@/lib/data/search";

export const dynamic = "force-dynamic";

type Props = { searchParams: { q?: string } };

export async function generateMetadata({ searchParams }: Props): Promise<Metadata> {
  const query = searchParams.q?.trim() ?? "";
  if (!query) {
    return { title: "Search" };
  }
  return {
    title: `Search: ${query}`,
    description: `Results for refrigerator models and water filters matching “${query}”.`,
    robots: query ? undefined : { index: false },
  };
}

export default async function SearchPage({ searchParams }: Props) {
  const query = searchParams.q?.trim() ?? "";
  let error: string | null = null;
  let hits: Awaited<ReturnType<typeof searchCatalog>> = [];

  if (query.length >= 2) {
    try {
      hits = await searchCatalog(query);
    } catch (e) {
      error =
        e instanceof Error
          ? e.message
          : "Search is temporarily unavailable. Check your Supabase configuration.";
      hits = [];
    }
  }

  const fridges = hits.filter((h) => h.kind === "fridge");
  const filters = hits.filter((h) => h.kind === "filter");

  return (
    <div className="space-y-8">
      <div className="space-y-3">
        <h1 className="text-xl font-semibold text-neutral-900 dark:text-neutral-50 sm:text-2xl">
          Search
        </h1>
        <SearchForm initialQuery={query} />
      </div>

      {error && (
        <p className="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-800 dark:border-red-900 dark:bg-red-950 dark:text-red-200">
          {error}
        </p>
      )}

      {query.length > 0 && query.length < 2 && (
        <p className="text-sm text-neutral-600 dark:text-neutral-400">
          Type at least two characters to search.
        </p>
      )}

      {query.length >= 2 && !error && (
        <div className="space-y-6">
          {fridges.length > 0 && (
            <section className="space-y-2">
              <h2 className="text-sm font-medium uppercase tracking-wide text-neutral-500">
                Refrigerator models ({fridges.length})
              </h2>
              <ul className="divide-y divide-neutral-200 rounded-lg border border-neutral-200 bg-white dark:divide-neutral-800 dark:border-neutral-800 dark:bg-neutral-950">
                {fridges.map((hit) => (
                  <li key={hit.slug}>
                    <Link
                      href={`/fridge/${hit.slug}`}
                      className="block px-4 py-3 hover:bg-neutral-50 dark:hover:bg-neutral-900"
                    >
                      <span className="font-medium text-neutral-900 dark:text-neutral-100">
                        {hit.model_number}
                      </span>
                      <span className="ml-2 text-sm text-neutral-500">
                        {hit.brand_name}
                      </span>
                      {hit.via === "alias" && hit.matchedAlias && (
                        <span className="mt-1 block text-xs text-neutral-500">
                          Matched alternate: {hit.matchedAlias}
                        </span>
                      )}
                    </Link>
                  </li>
                ))}
              </ul>
            </section>
          )}

          {filters.length > 0 && (
            <section className="space-y-2">
              <h2 className="text-sm font-medium uppercase tracking-wide text-neutral-500">
                Filters ({filters.length})
              </h2>
              <ul className="divide-y divide-neutral-200 rounded-lg border border-neutral-200 bg-white dark:divide-neutral-800 dark:border-neutral-800 dark:bg-neutral-950">
                {filters.map((hit) => (
                  <li key={hit.slug}>
                    <Link
                      href={`/filter/${hit.slug}`}
                      className="block px-4 py-3 hover:bg-neutral-50 dark:hover:bg-neutral-900"
                    >
                      <span className="font-mono text-sm font-medium text-neutral-900 dark:text-neutral-100">
                        {hit.oem_part_number}
                      </span>
                      {hit.name && (
                        <span className="ml-2 text-sm text-neutral-600 dark:text-neutral-400">
                          {hit.name}
                        </span>
                      )}
                      <span className="ml-2 text-sm text-neutral-500">
                        {hit.brand_name}
                      </span>
                      {hit.via === "alias" && hit.matchedAlias && (
                        <span className="mt-1 block text-xs text-neutral-500">
                          Matched alternate: {hit.matchedAlias}
                        </span>
                      )}
                    </Link>
                  </li>
                ))}
              </ul>
            </section>
          )}

          {fridges.length === 0 && filters.length === 0 && (
            <p className="text-sm text-neutral-600 dark:text-neutral-400">
              No matches for “{query}”. Try another model or part number.
            </p>
          )}
        </div>
      )}
    </div>
  );
}
