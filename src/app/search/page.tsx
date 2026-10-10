import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { RecentSearches } from "@/components/RecentSearches";
import { SearchForm } from "@/components/SearchForm";
import {
  SearchRecoveryExperience,
  SearchResolutionExperience,
} from "@/components/search/customer/SearchCustomerExperience";
import {
  enrichAllSearchHitsWithCompatibleFilters,
  searchCatalog,
  type SearchHit,
} from "@/lib/data/search";
import { resolveCustomerSearchRouteV1 } from "@/lib/search/customer-search-route-v1";
import { canonicalAlternatesForPath } from "@/lib/seo/canonical";
import { SITE_DISPLAY_NAME } from "@/lib/site-brand";
import "@/app/search-customer.css";

export const dynamic = "force-dynamic";

type Props = { searchParams: { q?: string } };

export async function generateMetadata({ searchParams }: Props): Promise<Metadata> {
  const query = searchParams.q?.trim() ?? "";
  const canonical = canonicalAlternatesForPath("/search");
  if (!query) {
    return {
      title: `Search filters · ${SITE_DISPLAY_NAME}`,
      description: `Look up refrigerator water filters by fridge model or filter number on ${SITE_DISPLAY_NAME}. Compare what we list on file with your old filter before you buy.`,
      ...canonical,
    };
  }
  return {
    title: `Search “${query}” · ${SITE_DISPLAY_NAME}`,
    description: `Search results for “${query}” on ${SITE_DISPLAY_NAME}: refrigerator water filters first; other categories we maintain may appear when they match. Open a result to verify the part against your unit and old filter.`,
    robots: undefined,
    ...canonical,
  };
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

  let customerRoute: ReturnType<typeof resolveCustomerSearchRouteV1> | null = null;
  if (query.length >= 2 && !error) {
    customerRoute = resolveCustomerSearchRouteV1(query, hits);
    if (customerRoute.kind === "direct_model" || customerRoute.kind === "direct_part") {
      redirect(customerRoute.href);
    }
  }

  return (
    <div className={`space-y-10${customerRoute ? " bp-search-customer" : ""}`}>
      <div className="space-y-4">
        <h1 className="text-2xl font-semibold tracking-tight text-bp-text sm:text-3xl">
          Search replacement filters
        </h1>
        <p className="text-sm text-bp-muted">
          Start with your <strong className="font-medium text-bp-text">fridge model</strong>{" "}
          or <strong className="font-medium text-bp-text">filter number</strong> from the nameplate
          and old cartridge.
        </p>
        <SearchForm initialQuery={query} />
        <RecentSearches actionPath="/search" />
      </div>

      {error && (
        <p className="rounded-md border border-bp-block/25 bg-bp-block-soft p-3 text-sm text-bp-block">
          {error}
        </p>
      )}

      {query.length > 0 && query.length < 2 && (
        <p className="text-sm text-bp-muted">Type at least two characters to search.</p>
      )}

      {query.length >= 2 && !error && customerRoute?.kind === "resolution" && (
        <SearchResolutionExperience query={customerRoute.query} hits={customerRoute.hits} />
      )}

      {query.length >= 2 && !error && customerRoute?.kind === "recovery" && (
        <SearchRecoveryExperience query={customerRoute.query} />
      )}
    </div>
  );
}
