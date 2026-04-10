import type { Metadata } from "next";
import Link from "next/link";
import { SearchForm } from "@/components/SearchForm";
import {
  ALL_CATALOGS,
  CATALOG_LABELS,
  CATALOG_REFRIGERATOR_WATER_FILTER,
  type CatalogId,
} from "@/lib/catalog/constants";
import { catalogFilterPath, catalogModelPath } from "@/lib/catalog/paths";
import {
  enrichAllSearchHitsWithCompatibleFilters,
  searchCatalog,
  type SearchHit,
  type SearchHitFilter,
  type SearchHitFridge,
  type SearchHitModel,
} from "@/lib/data/search";
import { SITE_DISPLAY_NAME } from "@/lib/site-brand";

export const dynamic = "force-dynamic";

type Props = { searchParams: { q?: string } };

export async function generateMetadata({ searchParams }: Props): Promise<Metadata> {
  const query = searchParams.q?.trim() ?? "";
  if (!query) {
    return { title: "Search all catalogs" };
  }
  return {
    title: `Search: ${query}`,
    description: `Replacement filters and parts across ${SITE_DISPLAY_NAME} catalogs for “${query}”.`,
    robots: query ? undefined : { index: false },
  };
}

const searchResultCardClass =
  "block rounded-lg border border-neutral-200 bg-white p-4 shadow-sm transition-colors hover:border-neutral-300 hover:bg-neutral-50 dark:border-neutral-800 dark:bg-neutral-950 dark:hover:border-neutral-700 dark:hover:bg-neutral-900/80";

function CatalogHitMeta({
  catalogLabel,
  kindLabel,
}: {
  catalogLabel: string;
  kindLabel: string;
}) {
  return (
    <p className="text-xs font-medium text-neutral-600 dark:text-neutral-400">
      {catalogLabel}
      <span className="font-normal text-neutral-400 dark:text-neutral-500"> — </span>
      {kindLabel}
    </p>
  );
}

function modelHitsForCatalog(catalog: CatalogId, hits: SearchHit[]) {
  if (catalog === CATALOG_REFRIGERATOR_WATER_FILTER) {
    return hits.filter((h): h is SearchHitFridge => h.kind === "fridge");
  }
  return hits.filter(
    (h): h is SearchHitModel => h.kind === "model" && h.catalog === catalog,
  );
}

function filterHitsForCatalog(catalog: CatalogId, hits: SearchHit[]) {
  return hits.filter(
    (h): h is SearchHitFilter => h.kind === "filter" && h.catalog === catalog,
  );
}

function ModelHitCard({
  hit,
  href,
  catalogLabel,
}: {
  hit: SearchHitFridge | SearchHitModel;
  href: string;
  catalogLabel: string;
}) {
  const parts = hit.compatible_filters ?? [];
  const primaryPart = parts[0];
  const moreCount = parts.length > 1 ? parts.length - 1 : 0;

  return (
    <Link href={href} data-catalog={hit.catalog} className={searchResultCardClass}>
      <CatalogHitMeta catalogLabel={catalogLabel} kindLabel="Model or unit" />
      <p className="mt-3 font-mono text-base font-semibold text-neutral-900 dark:text-neutral-100">
        {hit.model_number}
      </p>
      <p className="mt-1 text-sm text-neutral-600 dark:text-neutral-400">
        Brand: {hit.brand_name}
      </p>
      {primaryPart && (
        <p className="mt-2 text-sm text-neutral-600 dark:text-neutral-400">
          <span className="font-medium text-neutral-700 dark:text-neutral-300">Typical replacement:</span>{" "}
          <span className="font-mono text-neutral-800 dark:text-neutral-200">
            {primaryPart.oem_part_number}
          </span>
          {moreCount > 0 && (
            <span className="text-neutral-500 dark:text-neutral-400"> (+{moreCount} more)</span>
          )}
        </p>
      )}
      <p className="mt-3 text-xs text-neutral-500 dark:text-neutral-400">
        Opens the page with fit check, timing if we have it, and where to buy.
      </p>
      {hit.via === "alias" && hit.matchedAlias && (
        <p className="mt-2 text-xs text-neutral-500 dark:text-neutral-400">
          Matched using an alternate number: {hit.matchedAlias}
        </p>
      )}
    </Link>
  );
}

function FilterHitCard({
  hit,
  href,
  catalogLabel,
}: {
  hit: SearchHitFilter;
  href: string;
  catalogLabel: string;
}) {
  return (
    <Link href={href} data-catalog={hit.catalog} className={searchResultCardClass}>
      <CatalogHitMeta catalogLabel={catalogLabel} kindLabel="Replacement part" />
      <p className="mt-3 font-mono text-base font-semibold text-neutral-900 dark:text-neutral-100">
        {hit.oem_part_number}
      </p>
      {hit.name && (
        <p className="mt-1 text-sm text-neutral-600 dark:text-neutral-400">{hit.name}</p>
      )}
      <p className="mt-2 text-sm text-neutral-600 dark:text-neutral-400">Brand: {hit.brand_name}</p>
      <p className="mt-3 text-xs text-neutral-500 dark:text-neutral-400">
        Opens models this part fits, notes, and buying options.
      </p>
      {hit.via === "alias" && hit.matchedAlias && (
        <p className="mt-2 text-xs text-neutral-500 dark:text-neutral-400">
          Matched using an alternate number: {hit.matchedAlias}
        </p>
      )}
    </Link>
  );
}

export default async function SearchPage({ searchParams }: Props) {
  const query = searchParams.q?.trim() ?? "";
  let error: string | null = null;
  let hits: SearchHit[] = [];

  if (query.length >= 2) {
    try {
      const raw = await searchCatalog(query);
      hits = await enrichAllSearchHitsWithCompatibleFilters(raw);
    } catch (e) {
      error =
        e instanceof Error
          ? e.message
          : "Search is temporarily unavailable. Check your Supabase configuration.";
      hits = [];
    }
  }

  const totalHits = hits.length;

  return (
    <div className="space-y-10">
      <div className="space-y-4">
        <h1 className="text-2xl font-semibold tracking-tight text-neutral-900 dark:text-neutral-50 sm:text-3xl">
          Search all catalogs
        </h1>
        <p className="text-sm text-neutral-600 dark:text-neutral-400">
          One search across refrigerator water filters, air purifiers, vacuums, humidifiers,
          appliance air filters, and whole-house water cartridges. Results are tagged by
          catalog.
        </p>
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
        <div className="space-y-12">
          {ALL_CATALOGS.map((catalog) => {
            const label = CATALOG_LABELS[catalog];
            const models = modelHitsForCatalog(catalog, hits);
            const filters = filterHitsForCatalog(catalog, hits);
            if (models.length === 0 && filters.length === 0) return null;

            return (
              <section key={catalog} className="space-y-6">
                <h2 className="border-b border-neutral-200 pb-2 text-base font-semibold text-neutral-900 dark:border-neutral-800 dark:text-neutral-100">
                  {label}
                  <span className="ml-2 font-normal text-sm text-neutral-500 dark:text-neutral-400">
                    ({models.length + filters.length} result
                    {models.length + filters.length !== 1 ? "s" : ""})
                  </span>
                </h2>

                {models.length > 0 && (
                  <div className="space-y-3">
                    <h3 className="text-sm font-medium text-neutral-800 dark:text-neutral-200">
                      Models & units
                    </h3>
                    <ul className="space-y-2">
                      {models.map((hit) => (
                        <li key={`${hit.catalog}-${hit.kind}-${hit.slug}`}>
                          <ModelHitCard
                            hit={hit}
                            href={catalogModelPath(catalog, hit.slug)}
                            catalogLabel={label}
                          />
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {filters.length > 0 && (
                  <div className="space-y-3">
                    <h3 className="text-sm font-medium text-neutral-800 dark:text-neutral-200">
                      Parts & filter SKUs
                    </h3>
                    <ul className="space-y-2">
                      {filters.map((hit) => (
                        <li key={`${hit.catalog}-${hit.kind}-${hit.slug}`}>
                          <FilterHitCard
                            hit={hit}
                            href={catalogFilterPath(catalog, hit.slug)}
                            catalogLabel={label}
                          />
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </section>
            );
          })}

          {totalHits === 0 && (
            <p className="text-sm leading-relaxed text-neutral-600 dark:text-neutral-400">
              No matches for “{query}”. Try a model number from the appliance or an OEM part
              number from the old cartridge.
            </p>
          )}
        </div>
      )}
    </div>
  );
}
