import type { Metadata } from "next";
import Link from "next/link";
import type { ReactNode } from "react";
import { CATALOG_WHOLE_HOUSE_WATER_FILTERS } from "@/lib/catalog/constants";
import { catalogFilterPath, catalogModelPath } from "@/lib/catalog/paths";
import { SearchForm } from "@/components/SearchForm";
import {
  enrichWholeHouseWaterModelHitsWithFilters,
  searchWholeHouseWaterCatalog,
} from "@/lib/data/whole-house-water/search";

export const dynamic = "force-dynamic";

type Props = { searchParams: { q?: string } };

export async function generateMetadata({ searchParams }: Props): Promise<Metadata> {
  const query = searchParams.q?.trim() ?? "";
  if (!query) return { title: "Search whole-house water filters" };
  return {
    title: `Whole-house water search: ${query}`,
    description: `Systems and cartridges matching “${query}”.`,
  };
}

function ResultBadge({ children }: { children: ReactNode }) {
  return (
    <span className="inline-flex w-fit rounded-md bg-neutral-100 px-2 py-0.5 text-xs font-semibold uppercase tracking-wide text-neutral-700 dark:bg-neutral-800 dark:text-neutral-300">
      {children}
    </span>
  );
}

const cardLinkClass =
  "block rounded-lg border border-neutral-200 bg-white p-4 dark:border-neutral-800 dark:bg-neutral-950 transition-colors hover:border-neutral-300 hover:bg-neutral-50 dark:hover:border-neutral-700 dark:hover:bg-neutral-900/80";

const cardStaticClass =
  "rounded-lg border border-neutral-200 bg-white p-4 dark:border-neutral-800 dark:bg-neutral-950";

export default async function WholeHouseWaterSearchPage({ searchParams }: Props) {
  const query = searchParams.q?.trim() ?? "";
  let error: string | null = null;
  let hits: Awaited<ReturnType<typeof searchWholeHouseWaterCatalog>> = [];

  if (query.length >= 2) {
    try {
      const raw = await searchWholeHouseWaterCatalog(query);
      hits = await enrichWholeHouseWaterModelHitsWithFilters(raw);
    } catch (e) {
      error =
        e instanceof Error ? e.message : "Search is temporarily unavailable.";
      hits = [];
    }
  }

  const models = hits.filter((h) => h.kind === "model");
  const filters = hits.filter((h) => h.kind === "filter");

  return (
    <div className="space-y-10">
      <div className="space-y-4">
        <p className="text-sm text-neutral-500">
          <Link href="/whole-house-water">← Whole-house water home</Link>
        </p>
        <h1 className="text-2xl font-semibold tracking-tight text-neutral-900 dark:text-neutral-50 sm:text-3xl">
          Search whole-house water filters
        </h1>
        <SearchForm initialQuery={query} actionPath="/whole-house-water/search" />
      </div>

      {error && (
        <p className="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-800 dark:border-red-900 dark:bg-red-950 dark:text-red-200">
          {error}
        </p>
      )}

      {query.length > 0 && query.length < 2 && (
        <p className="text-sm text-neutral-600">Type at least two characters.</p>
      )}

      {query.length >= 2 && !error && (
        <div className="space-y-10">
          {models.length > 0 && (
            <section className="space-y-3">
              <h2 className="text-sm font-semibold text-neutral-900 dark:text-neutral-100">
                Systems / housings ({models.length})
              </h2>
              <ul className="space-y-2">
                {models.map((hit) => {
                  const href =
                    hit.catalogDetailHref === null
                      ? null
                      : catalogModelPath(CATALOG_WHOLE_HOUSE_WATER_FILTERS, hit.slug);
                  const inner = (
                    <>
                      <ResultBadge>Model</ResultBadge>
                      <p className="mt-2 font-mono font-semibold text-neutral-900 dark:text-neutral-100">
                        {hit.model_number}
                      </p>
                      <p className="mt-1 text-sm text-neutral-600">{hit.brand_name}</p>
                      {hit.compatible_filters && hit.compatible_filters.length > 0 && (
                        <p className="mt-2 text-sm text-neutral-600">
                          Cartridges:{" "}
                          {hit.compatible_filters.map((f, i) => (
                            <span key={f.slug}>
                              {i > 0 && ", "}
                              <span className="font-mono">{f.oem_part_number}</span>
                            </span>
                          ))}
                        </p>
                      )}
                      {hit.via === "alias" && hit.matchedAlias && (
                        <p className="mt-1 text-xs text-neutral-500">
                          Matched: {hit.matchedAlias}
                        </p>
                      )}
                      {!href && (
                        <p className="mt-2 text-xs text-neutral-500">
                          No published detail page for this match yet.
                        </p>
                      )}
                    </>
                  );
                  return (
                    <li key={hit.slug}>
                      {href ? (
                        <Link href={href} className={cardLinkClass}>
                          {inner}
                        </Link>
                      ) : (
                        <div className={cardStaticClass}>{inner}</div>
                      )}
                    </li>
                  );
                })}
              </ul>
            </section>
          )}

          {filters.length > 0 && (
            <section className="space-y-3">
              <h2 className="text-sm font-semibold text-neutral-900 dark:text-neutral-100">
                Cartridges ({filters.length})
              </h2>
              <ul className="space-y-2">
                {filters.map((hit) => {
                  const href =
                    hit.catalogDetailHref === null
                      ? null
                      : catalogFilterPath(CATALOG_WHOLE_HOUSE_WATER_FILTERS, hit.slug);
                  const inner = (
                    <>
                      <ResultBadge>Part SKU</ResultBadge>
                      <p className="mt-2 font-mono font-semibold">{hit.oem_part_number}</p>
                      {hit.name && <p className="text-sm text-neutral-600">{hit.name}</p>}
                      <p className="mt-1 text-sm text-neutral-600">{hit.brand_name}</p>
                      {!href && (
                        <p className="mt-2 text-xs text-neutral-500">
                          No published detail page for this match yet.
                        </p>
                      )}
                    </>
                  );
                  return (
                    <li key={hit.slug}>
                      {href ? (
                        <Link href={href} className={cardLinkClass}>
                          {inner}
                        </Link>
                      ) : (
                        <div className={cardStaticClass}>{inner}</div>
                      )}
                    </li>
                  );
                })}
              </ul>
            </section>
          )}

          {models.length === 0 && filters.length === 0 && (
            <p className="text-sm text-neutral-600">No matches for “{query}”.</p>
          )}
        </div>
      )}
    </div>
  );
}
