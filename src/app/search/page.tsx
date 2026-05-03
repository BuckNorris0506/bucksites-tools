import type { Metadata } from "next";
import Link from "next/link";
import { SearchForm } from "@/components/SearchForm";
import {
  CATALOG_LABELS,
  CATALOG_REFRIGERATOR_WATER_FILTER,
  CATALOG_WHOLE_HOUSE_WATER_FILTERS,
  LAUNCH_SCOPE_CATALOG_IDS,
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
    return {
      title: `Search filters · ${SITE_DISPLAY_NAME}`,
      description: `Look up refrigerator water filters, room air purifier cartridges, and whole-house water cartridges by model or OEM part number on ${SITE_DISPLAY_NAME}. Compare what we match in our reference before you buy.`,
    };
  }
  return {
    title: `Search “${query}” · ${SITE_DISPLAY_NAME}`,
    description: `Search results for “${query}” on ${SITE_DISPLAY_NAME}: refrigerator water filters, air purifier cartridges, and whole-house water cartridges. Open a result to verify the part against your unit and old filter.`,
    robots: undefined,
  };
}

const searchResultCardClass =
  "block rounded-lg border border-neutral-200 bg-white p-4 shadow-sm transition-colors hover:border-neutral-300 hover:bg-neutral-50 dark:border-neutral-800 dark:bg-neutral-950 dark:hover:border-neutral-700 dark:hover:bg-neutral-900/80";

const searchResultCardStaticClass =
  "rounded-lg border border-neutral-200 bg-white p-4 dark:border-neutral-800 dark:bg-neutral-950";

function globalSearchModelHref(
  catalog: CatalogId,
  hit: SearchHitFridge | SearchHitModel,
): string | null {
  if (hit.kind === "fridge") {
    return catalogModelPath(CATALOG_REFRIGERATOR_WATER_FILTER, hit.slug);
  }
  if (
    hit.catalog === CATALOG_WHOLE_HOUSE_WATER_FILTERS &&
    hit.catalogDetailHref === null
  ) {
    return null;
  }
  return catalogModelPath(catalog, hit.slug);
}

function globalSearchFilterHref(catalog: CatalogId, hit: SearchHitFilter): string | null {
  if (
    hit.catalog === CATALOG_WHOLE_HOUSE_WATER_FILTERS &&
    hit.catalogDetailHref === null
  ) {
    return null;
  }
  return catalogFilterPath(catalog, hit.slug);
}

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
  href: string | null;
  catalogLabel: string;
}) {
  const parts = hit.compatible_filters ?? [];
  const primaryPart = parts[0];
  const moreCount = parts.length > 1 ? parts.length - 1 : 0;

  const body = (
    <>
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
      {href ? (
        <p className="mt-3 text-xs text-neutral-500 dark:text-neutral-400">
          Opens the page with fit check, timing if we have it, and where to buy.
        </p>
      ) : (
        <p className="mt-3 text-xs text-neutral-500 dark:text-neutral-400">
          Matched in search, but there is no published detail page for this link yet.
        </p>
      )}
      {hit.via === "alias" && hit.matchedAlias && (
        <p className="mt-2 text-xs text-neutral-500 dark:text-neutral-400">
          Matched using an alternate number: {hit.matchedAlias}
        </p>
      )}
    </>
  );

  if (href) {
    return (
      <Link href={href} data-catalog={hit.catalog} className={searchResultCardClass}>
        {body}
      </Link>
    );
  }

  return (
    <div data-catalog={hit.catalog} className={searchResultCardStaticClass}>
      {body}
    </div>
  );
}

function FilterHitCard({
  hit,
  href,
  catalogLabel,
}: {
  hit: SearchHitFilter;
  href: string | null;
  catalogLabel: string;
}) {
  const body = (
    <>
      <CatalogHitMeta catalogLabel={catalogLabel} kindLabel="Replacement part" />
      <p className="mt-3 font-mono text-base font-semibold text-neutral-900 dark:text-neutral-100">
        {hit.oem_part_number}
      </p>
      {hit.name && (
        <p className="mt-1 text-sm text-neutral-600 dark:text-neutral-400">{hit.name}</p>
      )}
      <p className="mt-2 text-sm text-neutral-600 dark:text-neutral-400">Brand: {hit.brand_name}</p>
      {href ? (
        <p className="mt-3 text-xs text-neutral-500 dark:text-neutral-400">
          Opens models this part fits, notes, and buying options.
        </p>
      ) : (
        <p className="mt-3 text-xs text-neutral-500 dark:text-neutral-400">
          Matched in search, but there is no published detail page for this link yet.
        </p>
      )}
      {hit.via === "alias" && hit.matchedAlias && (
        <p className="mt-2 text-xs text-neutral-500 dark:text-neutral-400">
          Matched using an alternate number: {hit.matchedAlias}
        </p>
      )}
    </>
  );

  if (href) {
    return (
      <Link href={href} data-catalog={hit.catalog} className={searchResultCardClass}>
        {body}
      </Link>
    );
  }

  return (
    <div data-catalog={hit.catalog} className={searchResultCardStaticClass}>
      {body}
    </div>
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
          Search replacement filters
        </h1>
        <p className="text-sm text-neutral-600 dark:text-neutral-400">
          One box, three lanes: fridge water filters, room air purifier cartridges, and whole-house
          water cartridges. We group what we find so you can spot your lane—then open a result and
          line it up with the numbers on your unit or old part.
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
          {LAUNCH_SCOPE_CATALOG_IDS.map((catalog) => {
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
                            href={globalSearchModelHref(catalog, hit)}
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
                            href={globalSearchFilterHref(catalog, hit)}
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
            <div className="rounded-lg border border-neutral-200 bg-neutral-50 px-4 py-4 dark:border-neutral-800 dark:bg-neutral-900/40">
              <p className="text-sm font-medium text-neutral-900 dark:text-neutral-100">
                No hits for “{query}”—that happens when the spelling or format does not line up
                with what we have on file.
              </p>
              <p className="mt-3 text-sm leading-relaxed text-neutral-700 dark:text-neutral-300">
                Here are a few calm next steps that usually help:
              </p>
              <ul className="mt-2 list-inside list-disc space-y-2 text-sm leading-relaxed text-neutral-700 dark:text-neutral-300">
                <li>
                  Grab the <strong className="font-medium">model number</strong> from the
                  nameplate or sticker on the appliance, the air purifier, or the whole-house housing,
                  or from the owner’s manual.
                </li>
                <li>
                  Read the <strong className="font-medium">OEM / part number</strong> printed on the
                  filter body, end cap, or foil label on the cartridge you are replacing.
                </li>
                <li>
                  Try a <strong className="font-medium">shorter</strong> chunk of the code, or the
                  same digits <strong className="font-medium">without spaces or dashes</strong>.
                </li>
                <li>
                  Search using <strong className="font-medium">exactly what is printed</strong> on
                  the old part—even if it looks like an odd mix of letters and numbers.
                </li>
              </ul>
              <p className="mt-4 text-sm leading-relaxed text-neutral-700 dark:text-neutral-300">
                Prefer to browse instead?{" "}
                <Link href="/catalog" className="font-semibold text-neutral-900 underline-offset-2 hover:underline dark:text-neutral-100">
                  Categories
                </Link>
                {" · "}
                <Link href="/" className="font-semibold text-neutral-900 underline-offset-2 hover:underline dark:text-neutral-100">
                  Home
                </Link>
                {" · "}
                <Link
                  href="/air-purifier"
                  className="font-semibold text-neutral-900 underline-offset-2 hover:underline dark:text-neutral-100"
                >
                  Air purifier filters
                </Link>
                {" · "}
                <Link
                  href="/whole-house-water"
                  className="font-semibold text-neutral-900 underline-offset-2 hover:underline dark:text-neutral-100"
                >
                  Whole-house water
                </Link>
                .
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
