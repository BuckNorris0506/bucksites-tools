import type { Metadata } from "next";
import Link from "next/link";
import { RecentSearches } from "@/components/RecentSearches";
import { RevealOnScroll } from "@/components/RevealOnScroll";
import { SearchForm } from "@/components/SearchForm";
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
              {/* Tight headline block — main story before action */}
              <div className="space-y-3 sm:space-y-4">
                <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-bp-muted sm:text-xs sm:tracking-[0.2em]">
                  Replacement fit check
                </p>
                <h1 className="text-balance text-4xl font-semibold tracking-tight text-bp-text sm:text-5xl sm:leading-[1.08] lg:text-[3.15rem] lg:leading-[1.06]">
                  Find the right replacement before you buy the wrong one.
                </h1>
                <p className="max-w-2xl text-pretty text-base leading-relaxed text-bp-muted sm:text-lg">
                  Search a model number, part number, old filter label, or cartridge code. BuckParts shows what matched, what to compare, and whether purchase options are available after listing checks.
                </p>
              </div>

              {/* Primary action — immediately after promise */}
              <div className="max-w-2xl rounded-2xl border-2 border-bp-border bg-bp-surface p-4 sm:p-5">
                <p className="mb-3 text-[11px] font-semibold uppercase tracking-wide text-bp-muted">
                  Look up a code
                </p>
                <SearchForm />
                <RecentSearches actionPath="/search" />
              </div>

              <div className="flex flex-wrap gap-2" aria-label="Example codes to try in search">
                {EXAMPLE_CHIPS.map((c) => (
                  <Link
                    key={c.q}
                    href={`/search?q=${encodeURIComponent(c.q)}`}
                    className="bp-code inline-flex items-center rounded-full border border-bp-border bg-bp-bg px-3 py-1.5 text-sm font-semibold text-bp-text transition-colors hover:border-bp-trust/40 hover:bg-bp-trust-soft/50"
                  >
                    {c.label}
                  </Link>
                ))}
              </div>

              <div className="max-w-2xl space-y-2 text-sm leading-relaxed text-bp-muted sm:text-[15px]">
                <p className="font-medium text-bp-text/90">
                  Free to use · No account needed · Compare store options when available
                </p>
                <p>
                  See what matched and what is still uncertain before you pick a store path—instead of guessing from
                  a generic search listing alone.
                </p>
              </div>

              <p className="text-sm leading-relaxed text-bp-muted sm:text-base">
                <span className="font-medium text-bp-text/90">Browse replacement filter categories:</span>{" "}
                <Link
                  href="/catalog"
                  className="font-semibold text-bp-trust underline decoration-bp-trust/30 decoration-2 underline-offset-[3px] transition-colors hover:decoration-bp-trust/55"
                >
                  Open the category hub
                </Link>
              </p>
            </div>

            <RevealOnScroll as="aside" className="lg:col-span-5" delayMs={50}>
              <div className="overflow-hidden rounded-2xl border border-bp-border bg-bp-surface bp-card-interactive lg:sticky lg:top-20">
                {/* Signature band — authority without gradient */}
                <div className="border-b border-bp-trust/20 bg-bp-trust px-4 py-3 sm:px-5 sm:py-3.5">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="min-w-0">
                      <h2 className="text-sm font-semibold tracking-tight text-white sm:text-[15px]">
                        Fit check preview
                      </h2>
                      <p className="mt-0.5 text-[11px] leading-snug text-white/80 sm:text-xs">
                        Illustrative output—not your appliance.
                      </p>
                    </div>
                    <span className="shrink-0 rounded-md border border-white/25 bg-white/10 px-2.5 py-1 font-mono text-xs font-semibold tabular-nums tracking-wide text-white sm:text-sm">
                      DA29-00020B
                    </span>
                  </div>
                </div>

                <div className="space-y-5 p-4 sm:p-5">
                  <div>
                    <span className="inline-flex items-center rounded-md border border-bp-caution/30 bg-bp-caution-soft px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wide text-bp-caution sm:text-xs">
                      Likely replacement family found
                    </span>
                  </div>

                  <div>
                    <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-bp-muted">
                      How a fit readout flows
                    </p>
                    <ol className="m-0 mt-3 list-none space-y-0 p-0">
                      <li className="relative border-l border-bp-border pb-4 pl-4 last:border-l-0 last:pb-0">
                        <span
                          className="absolute -left-px top-1.5 h-2 w-2 -translate-x-1/2 rounded-full border-2 border-bp-surface bg-bp-trust"
                          aria-hidden
                        />
                        <p className="text-[10px] font-bold uppercase tracking-wide text-bp-muted">Part number</p>
                        <p className="mt-1">
                          <span className="bp-code text-sm font-semibold text-bp-text">DA29-00020B</span>
                        </p>
                      </li>
                      <li className="relative border-l border-bp-border pb-4 pl-4 last:border-l-0 last:pb-0">
                        <span
                          className="absolute -left-px top-1.5 h-2 w-2 -translate-x-1/2 rounded-full border-2 border-bp-surface bg-bp-trust"
                          aria-hidden
                        />
                        <p className="text-[10px] font-bold uppercase tracking-wide text-bp-muted">Evidence</p>
                        <p className="mt-1 text-sm leading-snug text-bp-text/90">
                          Matching lines on file for this code, plus the filter family we group it with.
                        </p>
                      </li>
                      <li className="relative border-l border-bp-border pb-4 pl-4 last:border-l-0 last:pb-0">
                        <span
                          className="absolute -left-px top-1.5 h-2 w-2 -translate-x-1/2 rounded-full border-2 border-bp-surface bg-bp-trust"
                          aria-hidden
                        />
                        <p className="text-[10px] font-bold uppercase tracking-wide text-bp-muted">Compare</p>
                        <p className="mt-1 text-sm leading-snug text-bp-text/90">
                          Old filter label, fridge model sticker, manual, or cartridge code on hand.
                        </p>
                      </li>
                      <li className="relative pl-4">
                        <span
                          className="absolute -left-px top-1.5 h-2 w-2 -translate-x-1/2 rounded-full border-2 border-bp-surface bg-bp-trust"
                          aria-hidden
                        />
                        <p className="text-[10px] font-bold uppercase tracking-wide text-bp-muted">Purchase options</p>
                        <p className="mt-1 text-sm leading-snug text-bp-text/90">
                          Store links appear only after BuckParts checks the listing against the part number.
                        </p>
                      </li>
                    </ol>
                  </div>

                  <div className="rounded-lg border border-bp-border bg-bp-trust-soft/30 p-3 sm:p-3.5">
                    <p className="text-[10px] font-bold uppercase tracking-wide text-bp-muted">Compare checklist</p>
                    <ul className="m-0 mt-2 list-none space-y-1.5 p-0 text-sm leading-snug text-bp-text/90">
                      <li>Old filter label</li>
                      <li>Fridge model sticker</li>
                      <li>Manual or cartridge code</li>
                    </ul>
                  </div>
                </div>
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
