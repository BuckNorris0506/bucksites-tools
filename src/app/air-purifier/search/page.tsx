import type { Metadata } from "next";
import Link from "next/link";
import type { ReactNode } from "react";
import { SearchForm } from "@/components/SearchForm";
import {
  enrichAirPurifierModelHitsWithFilters,
  searchAirPurifierCatalog,
} from "@/lib/data/air-purifier/search";

export const dynamic = "force-dynamic";

type Props = { searchParams: { q?: string } };

export async function generateMetadata({ searchParams }: Props): Promise<Metadata> {
  const query = searchParams.q?.trim() ?? "";
  if (!query) {
    return { title: "Search air purifier filters" };
  }
  return {
    title: `Air purifier search: ${query}`,
    description: `Results for air purifier models and filters matching “${query}”.`,
    robots: query ? undefined : { index: false },
  };
}

function ResultBadge({ children }: { children: ReactNode }) {
  return (
    <span className="inline-flex w-fit rounded-md bg-neutral-100 px-2 py-0.5 text-xs font-semibold uppercase tracking-wide text-neutral-700 dark:bg-neutral-800 dark:text-neutral-300">
      {children}
    </span>
  );
}

export default async function AirPurifierSearchPage({ searchParams }: Props) {
  const query = searchParams.q?.trim() ?? "";
  let error: string | null = null;
  let hits: Awaited<ReturnType<typeof searchAirPurifierCatalog>> = [];

  if (query.length >= 2) {
    try {
      const raw = await searchAirPurifierCatalog(query);
      hits = await enrichAirPurifierModelHitsWithFilters(raw);
    } catch (e) {
      error =
        e instanceof Error
          ? e.message
          : "Search is temporarily unavailable. Check your Supabase configuration.";
      hits = [];
    }
  }

  const models = hits.filter((h) => h.kind === "model");
  const filters = hits.filter((h) => h.kind === "filter");

  return (
    <div className="space-y-10">
      <div className="space-y-4">
        <p className="text-sm text-neutral-500 dark:text-neutral-400">
          <Link href="/air-purifier" className="hover:text-neutral-800 dark:hover:text-neutral-200">
            ← Air purifier home
          </Link>
        </p>
        <h1 className="text-2xl font-semibold tracking-tight text-neutral-900 dark:text-neutral-50 sm:text-3xl">
          Search air purifier filters
        </h1>
        <p className="text-sm text-neutral-600 dark:text-neutral-400">
          Results show units and replacement filters separately.
        </p>
        <SearchForm initialQuery={query} actionPath="/air-purifier/search" />
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
        <div className="space-y-10">
          {models.length > 0 && (
            <section className="space-y-3">
              <h2 className="text-sm font-semibold text-neutral-900 dark:text-neutral-100">
                Air purifier models
                <span className="ml-2 font-normal text-neutral-500 dark:text-neutral-400">
                  ({models.length})
                </span>
              </h2>
              <ul className="space-y-2">
                {models.map((hit) => (
                  <li key={hit.slug}>
                    <Link
                      href={`/air-purifier/model/${hit.slug}`}
                      className="block rounded-lg border border-neutral-200 bg-white p-4 transition-colors hover:border-neutral-300 hover:bg-neutral-50 dark:border-neutral-800 dark:bg-neutral-950 dark:hover:border-neutral-700 dark:hover:bg-neutral-900/80"
                    >
                      <ResultBadge>Unit model</ResultBadge>
                      <p className="mt-2 font-mono text-base font-semibold text-neutral-900 dark:text-neutral-100">
                        {hit.model_number}
                      </p>
                      <p className="mt-1 text-sm text-neutral-600 dark:text-neutral-400">
                        <span className="font-medium text-neutral-700 dark:text-neutral-300">
                          Brand:
                        </span>{" "}
                        {hit.brand_name}
                      </p>
                      {hit.compatible_filters && hit.compatible_filters.length > 0 && (
                        <p className="mt-2 text-sm text-neutral-600 dark:text-neutral-400">
                          <span className="font-medium text-neutral-700 dark:text-neutral-300">
                            Compatible filter
                            {hit.compatible_filters.length > 1 ? "s" : ""}:
                          </span>{" "}
                          {hit.compatible_filters.map((f, i) => (
                            <span key={f.slug}>
                              {i > 0 && ", "}
                              <span className="font-mono text-neutral-800 dark:text-neutral-200">
                                {f.oem_part_number}
                              </span>
                            </span>
                          ))}
                        </p>
                      )}
                      {hit.via === "alias" && hit.matchedAlias && (
                        <p className="mt-2 text-xs text-neutral-500 dark:text-neutral-400">
                          Matched alternate: {hit.matchedAlias}
                        </p>
                      )}
                    </Link>
                  </li>
                ))}
              </ul>
            </section>
          )}

          {filters.length > 0 && (
            <section className="space-y-3">
              <h2 className="text-sm font-semibold text-neutral-900 dark:text-neutral-100">
                Replacement filters
                <span className="ml-2 font-normal text-neutral-500 dark:text-neutral-400">
                  ({filters.length})
                </span>
              </h2>
              <ul className="space-y-2">
                {filters.map((hit) => (
                  <li key={hit.slug}>
                    <Link
                      href={`/air-purifier/filter/${hit.slug}`}
                      className="block rounded-lg border border-neutral-200 bg-white p-4 transition-colors hover:border-neutral-300 hover:bg-neutral-50 dark:border-neutral-800 dark:bg-neutral-950 dark:hover:border-neutral-700 dark:hover:bg-neutral-900/80"
                    >
                      <ResultBadge>Filter SKU</ResultBadge>
                      <p className="mt-2 text-xs font-medium uppercase tracking-wide text-neutral-500 dark:text-neutral-400">
                        OEM part number
                      </p>
                      <p className="font-mono text-base font-semibold text-neutral-900 dark:text-neutral-100">
                        {hit.oem_part_number}
                      </p>
                      {hit.name && (
                        <p className="mt-1 text-sm text-neutral-600 dark:text-neutral-400">
                          {hit.name}
                        </p>
                      )}
                      <p className="mt-2 text-sm text-neutral-600 dark:text-neutral-400">
                        <span className="font-medium text-neutral-700 dark:text-neutral-300">
                          Brand:
                        </span>{" "}
                        {hit.brand_name}
                      </p>
                      {hit.via === "alias" && hit.matchedAlias && (
                        <p className="mt-2 text-xs text-neutral-500 dark:text-neutral-400">
                          Matched alternate: {hit.matchedAlias}
                        </p>
                      )}
                    </Link>
                  </li>
                ))}
              </ul>
            </section>
          )}

          {models.length === 0 && filters.length === 0 && (
            <p className="text-sm leading-relaxed text-neutral-600 dark:text-neutral-400">
              No matches for “{query}”. Try the model number on the unit or an OEM
              filter number from your current cartridge.
            </p>
          )}
        </div>
      )}
    </div>
  );
}
