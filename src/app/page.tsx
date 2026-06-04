import type { Metadata } from "next";
import Link from "next/link";
import { RecentSearches } from "@/components/RecentSearches";
import { RevealOnScroll } from "@/components/RevealOnScroll";
import { SearchForm } from "@/components/SearchForm";
import { StatusLegend } from "@/components/StatusLegend";
import { VerifiedLinkCard } from "@/components/marketing/VerifiedLinkCard";
import { NoVerifiedLinkCard } from "@/components/marketing/NoVerifiedLinkCard";
import { listBrowseFilters } from "@/lib/catalog/browse";
import {
  SITE_SOCIAL_OG_DESCRIPTION,
  SITE_SOCIAL_OG_TITLE,
} from "@/lib/site-social-metadata";
import { SITE_DISPLAY_NAME } from "@/lib/site-brand";

export const metadata: Metadata = {
  title: SITE_SOCIAL_OG_TITLE,
  description: SITE_SOCIAL_OG_DESCRIPTION,
  openGraph: {
    title: SITE_SOCIAL_OG_TITLE,
    description: SITE_SOCIAL_OG_DESCRIPTION,
  },
  twitter: {
    card: "summary_large_image",
    title: SITE_SOCIAL_OG_TITLE,
    description: SITE_SOCIAL_OG_DESCRIPTION,
  },
};

const EXAMPLE_CHIPS = [
  { label: "DA29-00020B", q: "DA29-00020B" },
  { label: "GE MWF", q: "GE MWF" },
  { label: "LFXS26973S", q: "LFXS26973S" },
] as const;

export default async function HomePage() {
  let browseFilters: Awaited<ReturnType<typeof listBrowseFilters>> = [];
  try {
    browseFilters = await listBrowseFilters("refrigerator_water");
  } catch {
    // DB unavailable — page still renders with search only.
  }

  const popularFilters = browseFilters.slice(0, 6);

  return (
    <>
      <div className="mx-auto w-full max-w-7xl px-0 pb-16 pt-2 text-bp-text sm:pb-20 sm:pt-3 lg:pb-24 lg:pt-5">
        {/* Hero polish: search high in viewport, signature evidence card right */}
        <section aria-label="Home hero">
          <div className="grid grid-cols-1 gap-8 lg:grid-cols-12 lg:gap-x-10 lg:gap-y-10">
            <div className="flex flex-col gap-5 lg:col-span-7 lg:gap-6">
              <div className="space-y-3 sm:space-y-4">
                <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-bp-muted sm:text-xs sm:tracking-[0.2em]">Replacement fit check</p>
                <h1 className="text-balance text-5xl font-extrabold tracking-tight sm:text-6xl sm:leading-[1.02] lg:text-[3.4rem] lg:leading-[1.0]">
                  <span className="text-bp-muted">Wrong Buck.</span>{" "}
                  <span className="bp-hook-resolve">Right Parts<span className="text-bp-action">.</span></span>
                </h1>
                <p className="max-w-2xl text-pretty text-base leading-relaxed text-bp-muted sm:text-lg">
                  BuckParts checks replacement-filter links before it points you anywhere.
                </p>
              </div>

              <div className="max-w-2xl rounded-2xl border border-bp-border bg-bp-surface p-4 sm:p-5">
                <p className="mb-3 text-[11px] font-semibold uppercase tracking-wide text-bp-muted">Look up a code</p>
                <SearchForm />
                <RecentSearches actionPath="/search" />
              </div>

              <div className="flex flex-wrap gap-2" aria-label="Example codes to try in search">
                {EXAMPLE_CHIPS.map((c) => (
                  <Link key={c.q} href={`/search?q=${encodeURIComponent(c.q)}`} className="bp-code inline-flex items-center rounded-full border border-bp-border bg-bp-bg px-3 py-1.5 text-sm font-semibold text-bp-text transition-colors hover:border-bp-trust/40 hover:bg-bp-trust-soft/50">{c.label}</Link>
                ))}
              </div>

              <StatusLegend />

              <p className="max-w-2xl text-sm leading-relaxed text-bp-muted sm:text-[15px]">
                <span className="font-medium text-bp-text/90">Free to use · No account needed.</span> We only show a place to buy once the checks clear.
              </p>
            </div>

            <RevealOnScroll as="aside" className="lg:col-span-5" delayMs={50}>
              <div className="space-y-4 lg:sticky lg:top-20">
                <p className="text-[11px] font-semibold uppercase tracking-wide text-bp-muted">Illustrative — not your appliance</p>
                <VerifiedLinkCard illustrative destinationLabel="Official manufacturer path" checkedDate="2026-06-02" />
                <NoVerifiedLinkCard illustrative />
              </div>
            </RevealOnScroll>
          </div>
        </section>

        <RevealOnScroll className="mt-16 border-t border-bp-border pt-14 sm:mt-20 sm:pt-16 lg:mt-24 lg:pt-20">
        <section aria-labelledby="how-heading">
          <h2
            id="how-heading"
            className="max-w-3xl text-2xl font-semibold tracking-tight text-bp-text sm:text-[1.65rem]"
          >
            How BuckParts keeps you from guessing
          </h2>
          <p className="mt-2 max-w-2xl text-sm leading-relaxed text-bp-muted sm:text-[15px]">
            Three calm steps from code on your unit to a confident next move.
          </p>

          <ul className="mt-8 grid list-none grid-cols-1 gap-4 p-0 md:grid-cols-3 md:gap-5 lg:mt-10">
            <RevealOnScroll as="li" delayMs={40} className="flex flex-col rounded-xl border border-bp-border bg-bp-surface bp-card-interactive p-5 sm:p-6">
              <span className="text-xs font-bold uppercase tracking-wide text-bp-trust">Step 1</span>
              <h3 className="mt-2 text-lg font-semibold tracking-tight text-bp-text">Search any number you have</h3>
              <p className="mt-3 flex-1 text-sm leading-relaxed text-bp-muted">
                Model number, part number, cartridge code, or old filter label.
              </p>
            </RevealOnScroll>
            <RevealOnScroll as="li" delayMs={80} className="flex flex-col rounded-xl border border-bp-border bg-bp-surface bp-card-interactive p-5 sm:p-6">
              <span className="text-xs font-bold uppercase tracking-wide text-bp-trust">Step 2</span>
              <h3 className="mt-2 text-lg font-semibold tracking-tight text-bp-text">Check the evidence</h3>
              <p className="mt-3 flex-1 text-sm leading-relaxed text-bp-muted">
                See what matched, what still needs comparing, and where uncertainty remains.
              </p>
            </RevealOnScroll>
            <RevealOnScroll as="li" delayMs={120} className="flex flex-col rounded-xl border border-bp-border bg-bp-surface bp-card-interactive p-5 sm:p-6">
              <span className="text-xs font-bold uppercase tracking-wide text-bp-trust">Step 3</span>
              <h3 className="mt-2 text-lg font-semibold tracking-tight text-bp-text">Shop only after checks pass</h3>
              <p className="mt-3 flex-1 text-sm leading-relaxed text-bp-muted">
                BuckParts shows purchase options only when the listing matches the part number well enough to pass our checks.
              </p>
            </RevealOnScroll>
          </ul>
        </section>
        </RevealOnScroll>
      </div>

      {popularFilters.length > 0 && (
        <div className="mx-auto w-full max-w-7xl px-0 pb-20 text-bp-text lg:pb-24">
          <RevealOnScroll className="space-y-6 border-t border-bp-border pt-12 lg:space-y-8 lg:pt-16">
          <section className="space-y-6 lg:space-y-8">
            <h2 className="text-lg font-semibold tracking-tight text-bp-text sm:text-xl">
              Refrigerator water filter starting points
            </h2>
            <p className="max-w-3xl text-sm leading-relaxed text-bp-muted sm:text-[15px]">
              A short browse sample from refrigerator water filter data—not a popularity ranking,
              sales chart, or bestseller list.
            </p>
            <ul className="grid gap-4 sm:grid-cols-2 sm:gap-5 lg:grid-cols-3">
              {popularFilters.map((f, i) => (
                <RevealOnScroll
                  as="li"
                  key={f.slug}
                  delayMs={40 + i * 45}
                  className="flex flex-col border border-bp-border bg-bp-surface bp-card-interactive px-4 py-4 sm:px-5 sm:py-5"
                >
                  <p className="text-xs font-medium uppercase tracking-wide text-bp-trust/90">
                    {SITE_DISPLAY_NAME}
                  </p>
                  <p className="bp-code mt-2 inline-block w-fit max-w-full text-lg font-semibold text-bp-text">
                    {f.oem_part_number}
                  </p>
                  <p className="mt-1 text-sm text-bp-muted">
                    {f.name?.trim() || "Check fit by matching your model number and part number."}
                  </p>
                  <Link
                    href={`/filter/${f.slug}`}
                    className="mt-4 inline-flex text-sm font-semibold text-bp-trust underline decoration-bp-trust/30 underline-offset-2 hover:decoration-bp-trust/55"
                  >
                    View part
                  </Link>
                </RevealOnScroll>
              ))}
            </ul>
          </section>
          </RevealOnScroll>
        </div>
      )}
    </>
  );
}
