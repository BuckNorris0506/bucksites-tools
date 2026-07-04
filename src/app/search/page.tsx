import type { Metadata } from "next";
import Link from "next/link";
import { RecentSearches } from "@/components/RecentSearches";
import { RevealOnScroll } from "@/components/RevealOnScroll";
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
import { resolveFridgeSearchModelHitDisplayV1 } from "@/lib/fridge/fridge-filter-pdp-customer-safety-v1";
import { SITE_DISPLAY_NAME } from "@/lib/site-brand";

export const dynamic = "force-dynamic";

type Props = { searchParams: { q?: string } };

export async function generateMetadata({ searchParams }: Props): Promise<Metadata> {
  const query = searchParams.q?.trim() ?? "";
  if (!query) {
    return {
      title: `Search filters · ${SITE_DISPLAY_NAME}`,
      description: `Look up refrigerator water filters by fridge model or filter number on ${SITE_DISPLAY_NAME}. Compare what we list on file with your old filter before you buy.`,
    };
  }
  return {
    title: `Search “${query}” · ${SITE_DISPLAY_NAME}`,
    description: `Search results for “${query}” on ${SITE_DISPLAY_NAME}: refrigerator water filters first; other categories we maintain may appear when they match. Open a result to verify the part against your unit and old filter.`,
    robots: undefined,
  };
}

const searchResultCardClass =
  "bp-card-interactive block rounded-lg border border-bp-border bg-bp-surface p-4 transition-colors hover:border-bp-muted/50 hover:bg-bp-trust-soft/40";

const searchResultCardStaticClass =
  "bp-card-interactive rounded-lg border border-bp-border bg-bp-surface p-4";

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
    <p className="text-xs font-medium text-bp-muted">
      {catalogLabel}
      <span className="font-normal text-bp-border"> — </span>
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
  const fridgeSearchDisplay =
    hit.kind === "fridge"
      ? resolveFridgeSearchModelHitDisplayV1({ fridgeModelSlug: hit.slug })
      : null;

  const body = (
    <>
      <CatalogHitMeta catalogLabel={catalogLabel} kindLabel="Model or unit" />
      <p className="mt-3 bp-code inline-block text-base font-semibold text-bp-text">
        {hit.model_number}
      </p>
      <p className="mt-1 text-sm text-bp-muted">
        Brand: {hit.brand_name}
      </p>
      {fridgeSearchDisplay?.status_line ? (
        <p className="mt-2 text-sm text-bp-caution">{fridgeSearchDisplay.status_line}</p>
      ) : null}
      {primaryPart && fridgeSearchDisplay?.show_typical_replacement !== false && (
        <p className="mt-2 text-sm text-bp-muted">
          <span className="font-medium text-bp-text/90">Typical replacement:</span>{" "}
          <span className="bp-code text-sm font-medium text-bp-text">
            {primaryPart.oem_part_number}
          </span>
          {moreCount > 0 && (
            <span className="text-bp-muted"> (+{moreCount} more)</span>
          )}
        </p>
      )}
      {href ? (
        <p className="mt-3 text-xs text-bp-muted">
          Opens the page with fit check, timing if we have it, and where to buy.
        </p>
      ) : (
        <p className="mt-3 text-xs text-bp-muted">
          Matched in search, but there is no published detail page for this link yet.
        </p>
      )}
      {hit.via === "alias" && hit.matchedAlias && (
        <p className="mt-2 text-xs text-bp-muted">
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
      <p className="mt-3 bp-code inline-block text-base font-semibold text-bp-text">
        {hit.oem_part_number}
      </p>
      {hit.name && (
        <p className="mt-1 text-sm text-bp-muted">{hit.name}</p>
      )}
      <p className="mt-2 text-sm text-bp-muted">Brand: {hit.brand_name}</p>
      {href ? (
        <p className="mt-3 text-xs text-bp-muted">
          Opens models this part fits, notes, and buying options.
        </p>
      ) : (
        <p className="mt-3 text-xs text-bp-muted">
          Matched in search, but there is no published detail page for this link yet.
        </p>
      )}
      {hit.via === "alias" && hit.matchedAlias && (
        <p className="mt-2 text-xs text-bp-muted">
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
    } catch {
      error = "Search is temporarily unavailable. Please try again in a moment.";
      hits = [];
    }
  }

  const totalHits = hits.length;

  return (
    <div className="space-y-10">
      <div className="space-y-4">
        <h1 className="text-2xl font-semibold tracking-tight text-bp-text sm:text-3xl">
          Search replacement filters
        </h1>
        <p className="text-sm text-bp-muted">
          Start with your <strong className="font-medium text-bp-text">fridge model</strong>{" "}
          or <strong className="font-medium text-bp-text">filter number</strong> from
          the nameplate and old cartridge. We lead with refrigerator water filters; when another category we
          maintain matches your spelling, it appears in its own section below.
        </p>
        <div className="rounded-lg border border-bp-border bg-bp-trust-soft/50 p-4 text-sm leading-relaxed text-bp-text/90">
          Search can return models, filter numbers, alternates, or pages to compare. Open a
          result to check what BuckParts found, then compare the part number with your old filter
          or manual. Store buttons only show after BuckParts checks the listing against the part number on that page—so not every
          result includes a way to buy.
        </div>
        <SearchForm initialQuery={query} />
        <RecentSearches actionPath="/search" />
      </div>

      {error && (
        <p className="rounded-md border border-bp-block/25 bg-bp-block-soft p-3 text-sm text-bp-block">
          {error}
        </p>
      )}

      {query.length > 0 && query.length < 2 && (
        <p className="text-sm text-bp-muted">
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
              <RevealOnScroll key={catalog} as="section" className="space-y-6">
                <h2 className="border-b border-bp-border pb-2 text-base font-semibold text-bp-text">
                  {label}
                  <span className="ml-2 font-normal text-sm text-bp-muted">
                    ({models.length + filters.length} result
                    {models.length + filters.length !== 1 ? "s" : ""})
                  </span>
                </h2>

                {models.length > 0 && (
                  <div className="space-y-3">
                    <h3 className="text-sm font-medium text-bp-text">
                      Models & units
                    </h3>
                    <ul className="space-y-2">
                      {models.map((hit, i) => (
                        <RevealOnScroll
                          as="li"
                          key={`${hit.catalog}-${hit.kind}-${hit.slug}`}
                          delayMs={25 + i * 35}
                        >
                          <ModelHitCard
                            hit={hit}
                            href={globalSearchModelHref(catalog, hit)}
                            catalogLabel={label}
                          />
                        </RevealOnScroll>
                      ))}
                    </ul>
                  </div>
                )}

                {filters.length > 0 && (
                  <div className="space-y-3">
                    <h3 className="text-sm font-medium text-bp-text">
                      Parts & filter numbers
                    </h3>
                    <ul className="space-y-2">
                      {filters.map((hit, i) => (
                        <RevealOnScroll
                          as="li"
                          key={`${hit.catalog}-${hit.kind}-${hit.slug}`}
                          delayMs={25 + i * 35}
                        >
                          <FilterHitCard
                            hit={hit}
                            href={globalSearchFilterHref(catalog, hit)}
                            catalogLabel={label}
                          />
                        </RevealOnScroll>
                      ))}
                    </ul>
                  </div>
                )}
              </RevealOnScroll>
            );
          })}

          {totalHits === 0 && (
            <div className="rounded-lg border border-bp-border bg-bp-trust-soft/35 px-4 py-4">
              <p className="text-sm font-medium text-bp-text">
                No hits for “{query}”—that happens when the spelling or format does not line up
                with what we have on file.
              </p>
              <p className="mt-3 text-sm leading-relaxed text-bp-text/90">
                Here are a few calm next steps that usually help:
              </p>
              <ul className="mt-2 list-inside list-disc space-y-2 text-sm leading-relaxed text-bp-text/90">
                <li>
                  Grab the <strong className="font-medium">refrigerator model number</strong> from the
                  nameplate or sticker inside the fridge (often on a side wall or ceiling), or from
                  the owner’s manual.
                </li>
                <li>
                  Read the <strong className="font-medium">filter or part number</strong> printed on the
                  water filter body, end cap, or foil label on the cartridge you are replacing.
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
              <p className="mt-4 text-sm leading-relaxed text-bp-text/90">
                Prefer to browse instead?{" "}
                <Link href="/catalog" className="font-semibold text-bp-trust underline-offset-2 hover:underline">
                  Refrigerator water catalog
                </Link>
                {" · "}
                <Link href="/" className="font-semibold text-bp-trust underline-offset-2 hover:underline">
                  Home
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
