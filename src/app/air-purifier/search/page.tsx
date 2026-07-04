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
  };
}

const searchResultCardClass =
  "bp-card-interactive block rounded-lg border border-bp-border bg-bp-surface p-4 transition-colors hover:border-bp-muted/50 hover:bg-bp-trust-soft/40";

function ResultBadge({ children }: { children: ReactNode }) {
  return (
    <span className="inline-flex w-fit rounded-md border border-bp-border bg-bp-trust-soft/40 px-2 py-0.5 text-xs font-semibold uppercase tracking-wide text-bp-trust">
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
    } catch {
      error = "Search is temporarily unavailable. Please try again in a moment.";
      hits = [];
    }
  }

  const models = hits.filter((h) => h.kind === "model");
  const filters = hits.filter((h) => h.kind === "filter");

  return (
    <div className="space-y-10 text-bp-text">
      <div className="space-y-4">
        <p className="text-sm text-bp-muted">
          <Link href="/air-purifier" className="transition-colors hover:text-bp-text">
            ← Air purifier home
          </Link>
        </p>
        <h1 className="text-2xl font-semibold tracking-tight text-bp-text sm:text-3xl">
          Search air purifier filters
        </h1>
        <p className="text-sm text-bp-muted">
          Results show units and replacement filters separately.
        </p>
        <SearchForm initialQuery={query} actionPath="/air-purifier/search" />
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
        <div className="space-y-10">
          {models.length > 0 && (
            <section className="space-y-3">
              <h2 className="text-sm font-semibold text-bp-text">
                Air purifier models
                <span className="ml-2 font-normal text-bp-muted">
                  ({models.length})
                </span>
              </h2>
              <ul className="space-y-2">
                {models.map((hit) => (
                  <li key={hit.slug}>
                    <Link href={`/air-purifier/model/${hit.slug}`} className={searchResultCardClass}>
                      <ResultBadge>Unit model</ResultBadge>
                      <p className="bp-code mt-2 text-base font-semibold text-bp-text">
                        {hit.model_number}
                      </p>
                      <p className="mt-1 text-sm text-bp-muted">
                        <span className="font-medium text-bp-text/90">
                          Brand:
                        </span>{" "}
                        {hit.brand_name}
                      </p>
                      {hit.compatible_filters && hit.compatible_filters.length > 0 && (
                        <p className="mt-2 text-sm text-bp-muted">
                          <span className="font-medium text-bp-text/90">
                            Compatible filter
                            {hit.compatible_filters.length > 1 ? "s" : ""}:
                          </span>{" "}
                          {hit.compatible_filters.map((f, i) => (
                            <span key={f.slug}>
                              {i > 0 && ", "}
                              <span className="bp-code text-sm font-medium text-bp-text">
                                {f.oem_part_number}
                              </span>
                            </span>
                          ))}
                        </p>
                      )}
                      {hit.via === "alias" && hit.matchedAlias && (
                        <p className="mt-2 text-xs text-bp-muted">
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
              <h2 className="text-sm font-semibold text-bp-text">
                Replacement filters
                <span className="ml-2 font-normal text-bp-muted">
                  ({filters.length})
                </span>
              </h2>
              <ul className="space-y-2">
                {filters.map((hit) => (
                  <li key={hit.slug}>
                    <Link href={`/air-purifier/filter/${hit.slug}`} className={searchResultCardClass}>
                      <ResultBadge>Filter number</ResultBadge>
                      <p className="mt-2 text-xs font-medium uppercase tracking-wide text-bp-muted">
                        Part number
                      </p>
                      <p className="bp-code text-base font-semibold text-bp-text">
                        {hit.oem_part_number}
                      </p>
                      {hit.name && (
                        <p className="mt-1 text-sm text-bp-muted">
                          {hit.name}
                        </p>
                      )}
                      <p className="mt-2 text-sm text-bp-muted">
                        <span className="font-medium text-bp-text/90">
                          Brand:
                        </span>{" "}
                        {hit.brand_name}
                      </p>
                      {hit.via === "alias" && hit.matchedAlias && (
                        <p className="mt-2 text-xs text-bp-muted">
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
            <p className="text-sm leading-relaxed text-bp-muted">
              No matches for “{query}”. Try the model number on the unit or a
              filter number from your current cartridge.
            </p>
          )}
        </div>
      )}
    </div>
  );
}
