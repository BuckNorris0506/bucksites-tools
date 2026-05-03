import type { Metadata } from "next";
import Link from "next/link";
import { SearchForm } from "@/components/SearchForm";
import { listBrowseFilters } from "@/lib/catalog/browse";
import { SITE_DISPLAY_NAME } from "@/lib/site-brand";

const homeMetaTitle = `Replacement filters lookup · ${SITE_DISPLAY_NAME}`;
const homeMetaDescription = `Search by model number or OEM part number on ${SITE_DISPLAY_NAME}, compare what we list against our reference, then open verified store links when we have them available.`;

export const metadata: Metadata = {
  title: homeMetaTitle,
  description: homeMetaDescription,
  openGraph: {
    title: homeMetaTitle,
    description: homeMetaDescription,
  },
  twitter: {
    card: "summary_large_image",
    title: homeMetaTitle,
    description: homeMetaDescription,
  },
};

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
      {/* Hero: open editorial section — not one continuous pale panel with later blocks */}
      <div className="mx-auto w-full max-w-7xl px-0 pb-14 pt-2 text-slate-900 sm:pb-16 sm:pt-4 lg:pb-20 lg:pt-6 dark:text-slate-100">
        <section aria-label="Home hero">
          <div className="grid grid-cols-1 gap-12 lg:grid-cols-12 lg:gap-x-14 lg:gap-y-14">
            <div className="order-1 space-y-9 lg:order-none lg:col-span-7 lg:space-y-10">
              <div className="space-y-5 lg:space-y-6">
                <h1 className="text-balance text-3xl font-semibold tracking-tight text-slate-900 sm:text-4xl lg:text-[2.875rem] lg:leading-[1.06] xl:text-[3.05rem] xl:leading-[1.06] dark:text-slate-50">
                  Find the right replacement filter before you buy
                </h1>
                <p className="max-w-2xl text-pretty text-lg leading-relaxed text-slate-600 sm:text-xl lg:max-w-none dark:text-slate-400">
                  If you can read the nameplate on the appliance or the OEM print on the cartridge you are
                  replacing, you have what you need to line it up with our reference before you shop.
                </p>
                <p className="text-base font-medium leading-snug text-slate-700 dark:text-slate-300">
                  Free to use · No account needed · Compare store options when available
                </p>
              </div>

              {/* Search: one clear anchor — no nested card-on-card */}
              <div className="relative max-w-2xl border-l-[3px] border-blue-950 pl-5 sm:pl-6 dark:border-blue-800">
                <SearchForm />
              </div>
            </div>

            {/* Intake / parts-reference card */}
            <aside className="order-2 border-t border-slate-200 pt-10 lg:order-none lg:col-span-5 lg:border-t-0 lg:pt-1 dark:border-slate-700">
              <div className="overflow-hidden rounded-md border border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-950">
                <div className="bg-blue-950 px-4 py-2.5 dark:bg-blue-950">
                  <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-white/95">
                    Examples only
                  </p>
                </div>
                <div className="px-4 py-4 sm:px-5 sm:py-5">
                  <p className="text-[15px] font-semibold tracking-tight text-slate-900 dark:text-slate-50">
                    Match these first
                  </p>
                  <p className="mt-1.5 text-xs leading-relaxed text-slate-600 dark:text-slate-400">
                    Illustrative entries—not matched to your appliance.
                  </p>
                  <dl className="mt-5 divide-y divide-slate-200 text-[13px] dark:divide-slate-700">
                    <div className="flex items-baseline justify-between gap-3 bg-slate-50 px-3 py-2.5 first:rounded-t-sm dark:bg-slate-900/50">
                      <dt className="shrink-0 text-[11px] font-bold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                        Model
                      </dt>
                      <dd className="text-right font-mono font-semibold tabular-nums text-slate-900 dark:text-slate-100">
                        WRS325SDHZ
                      </dd>
                    </div>
                    <div className="flex items-baseline justify-between gap-3 bg-white px-3 py-2.5 dark:bg-slate-950">
                      <dt className="shrink-0 text-[11px] font-bold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                        OEM / filter
                      </dt>
                      <dd className="text-right font-mono font-semibold tabular-nums text-slate-900 dark:text-slate-100">
                        4396508
                      </dd>
                    </div>
                    <div className="flex items-baseline justify-between gap-3 bg-slate-50 px-3 py-2.5 last:rounded-b-sm dark:bg-slate-900/50">
                      <dt className="shrink-0 text-[11px] font-bold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                        Old cartridge
                      </dt>
                      <dd className="text-right font-mono font-semibold tabular-nums text-slate-900 dark:text-slate-100">
                        EDR5RXD1
                      </dd>
                    </div>
                  </dl>
                  <p className="mt-4 text-xs leading-relaxed text-slate-600 dark:text-slate-400">
                    Use the numbers printed on your unit or old filter.
                  </p>
                </div>
              </div>
            </aside>

            <div className="order-3 text-sm leading-relaxed text-slate-600 sm:text-base lg:col-span-7 dark:text-slate-400">
              <span className="mb-2 block font-medium text-slate-700 sm:mb-0 sm:mr-2 sm:inline dark:text-slate-300">
                Browse by category:
              </span>
              <span className="inline-flex flex-wrap items-baseline gap-x-2 gap-y-2 sm:gap-x-2.5">
                <Link
                  href="/catalog"
                  className="font-semibold text-blue-950 underline decoration-blue-950/30 decoration-2 underline-offset-[3px] transition-colors hover:text-blue-900 hover:decoration-blue-950/55 dark:text-blue-300 dark:decoration-blue-400/40 dark:hover:text-blue-200 dark:hover:decoration-blue-300/55"
                >
                  Refrigerator water filters
                </Link>
                <span className="select-none text-slate-300 dark:text-slate-600" aria-hidden>
                  ·
                </span>
                <Link
                  href="/air-purifier"
                  className="font-semibold text-blue-950 underline decoration-blue-950/30 decoration-2 underline-offset-[3px] transition-colors hover:text-blue-900 hover:decoration-blue-950/55 dark:text-blue-300 dark:decoration-blue-400/40 dark:hover:text-blue-200 dark:hover:decoration-blue-300/55"
                >
                  Air purifier filters
                </Link>
                <span className="select-none text-slate-300 dark:text-slate-600" aria-hidden>
                  ·
                </span>
                <Link
                  href="/whole-house-water"
                  className="font-semibold text-blue-950 underline decoration-blue-950/30 decoration-2 underline-offset-[3px] transition-colors hover:text-blue-900 hover:decoration-blue-950/55 dark:text-blue-300 dark:decoration-blue-400/40 dark:hover:text-blue-200 dark:hover:decoration-blue-300/55"
                >
                  Whole{"\u2011"}house water filters
                </Link>
              </span>
            </div>
          </div>
        </section>
      </div>

      {/* Playbook: dedicated horizontal band — visually separate from hero */}
      <section
        aria-labelledby="playbook-heading"
        className="border-y border-slate-200 bg-white py-10 dark:border-slate-800 dark:bg-slate-950 sm:py-11"
      >
        <div className="mx-auto w-full max-w-7xl px-0 sm:px-0 lg:px-0">
          <div className="space-y-8 lg:space-y-9">
            <div className="max-w-3xl space-y-2">
              <p id="playbook-heading" className="text-base font-semibold tracking-tight text-slate-900 dark:text-slate-50">
                The BuckParts playbook
              </p>
              <p className="text-sm leading-relaxed text-slate-600 sm:text-[15px] dark:text-slate-400">
                Match the code first. Shop second.
              </p>
            </div>

            <ul className="m-0 list-none divide-y divide-slate-200 p-0 dark:divide-slate-700 lg:grid lg:grid-cols-3 lg:divide-y-0 lg:gap-x-10">
              <li className="flex gap-3 py-5 first:pt-0 lg:min-h-[4.5rem] lg:items-start lg:py-0 lg:pr-2">
                <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-blue-950 dark:bg-blue-400" aria-hidden />
                <span className="min-w-0 text-sm font-medium leading-snug text-slate-800 dark:text-slate-200">
                  We only show links we can verify to your exact filter code
                </span>
              </li>
              <li className="flex gap-3 py-5 lg:min-h-[4.5rem] lg:items-start lg:border-l lg:border-slate-200 lg:py-0 lg:pl-10 lg:pr-2 dark:lg:border-slate-700">
                <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-blue-950 dark:bg-blue-400" aria-hidden />
                <span className="min-w-0 text-sm font-medium leading-snug text-slate-800 dark:text-slate-200">
                  Check your current filter before buying
                </span>
              </li>
              <li className="flex gap-3 py-5 last:pb-0 lg:min-h-[4.5rem] lg:items-start lg:border-l lg:border-slate-200 lg:py-0 lg:pl-10 lg:pr-0 dark:lg:border-slate-700">
                <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-blue-950 dark:bg-blue-400" aria-hidden />
                <span className="min-w-0 text-sm font-medium leading-snug text-slate-800 dark:text-slate-200">
                  Compare store options when available
                </span>
              </li>
            </ul>
          </div>
        </div>
      </section>

      {popularFilters.length > 0 && (
        <div className="mx-auto w-full max-w-7xl px-0 pb-20 text-slate-900 lg:pb-24 dark:text-slate-100">
          <section className="space-y-6 border-t border-slate-200 pt-12 lg:space-y-8 lg:pt-16 dark:border-slate-800">
            <h2 className="text-lg font-semibold tracking-tight text-slate-900 sm:text-xl dark:text-slate-50">
              Fridge-water starting points
            </h2>
            <p className="max-w-3xl text-sm leading-relaxed text-slate-600 sm:text-[15px] dark:text-slate-400">
              A short list from our refrigerator-water browse data—not a bestseller chart.
            </p>
            <ul className="grid gap-4 sm:grid-cols-2 sm:gap-5 lg:grid-cols-3">
              {popularFilters.map((f) => (
                <li
                  key={f.slug}
                  className="flex flex-col border border-slate-200 bg-white px-4 py-4 sm:px-5 sm:py-5 dark:border-slate-700 dark:bg-slate-950"
                >
                  <p className="text-xs font-medium uppercase tracking-wide text-blue-950/80 dark:text-blue-300/90">
                    {SITE_DISPLAY_NAME}
                  </p>
                  <p className="mt-2 font-mono text-lg font-semibold text-slate-900 dark:text-slate-100">
                    {f.oem_part_number}
                  </p>
                  <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
                    {f.name?.trim() || "Check fit by matching your model number and part number."}
                  </p>
                  <Link
                    href={`/filter/${f.slug}`}
                    className="mt-4 inline-flex text-sm font-semibold text-blue-950 underline decoration-blue-950/30 underline-offset-2 hover:decoration-blue-950/55 dark:text-blue-200 dark:decoration-blue-400/40 dark:hover:text-blue-100"
                  >
                    View part
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        </div>
      )}
    </>
  );
}
