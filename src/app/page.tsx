import type { Metadata } from "next";
import Image from "next/image";
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
    <div className="space-y-14 lg:space-y-16">
      <section className="space-y-8 border-b border-neutral-200 pb-10 dark:border-neutral-800 lg:space-y-10 lg:pb-12">
        <div className="space-y-4 lg:space-y-5">
          <h1 className="text-balance text-3xl font-semibold tracking-tight text-neutral-900 dark:text-neutral-50 sm:text-4xl lg:text-5xl lg:leading-[1.1]">
            Find the right replacement filter before you buy
          </h1>
          <p className="max-w-3xl text-pretty text-lg leading-relaxed text-neutral-700 dark:text-neutral-300 sm:text-xl">
            If you can read the nameplate on the appliance or the OEM print on the cartridge you are
            replacing, you have what you need to line it up with our reference before you shop.
          </p>
          <p className="text-base font-medium text-neutral-700 dark:text-neutral-300">
            Free to use · No account needed · Compare store options when available
          </p>
        </div>

        <div className="max-w-3xl">
          <SearchForm />
        </div>

        <p className="text-sm text-neutral-700 dark:text-neutral-300">
          Browse by category:{" "}
          <Link href="/catalog" className="font-semibold text-neutral-900 underline-offset-2 hover:underline dark:text-neutral-100">
            Refrigerator water filters
          </Link>{" "}
          ·{" "}
          <Link href="/air-purifier" className="font-semibold text-neutral-900 underline-offset-2 hover:underline dark:text-neutral-100">
            Air purifier filters
          </Link>{" "}
          ·{" "}
          <Link href="/whole-house-water" className="font-semibold text-neutral-900 underline-offset-2 hover:underline dark:text-neutral-100">
            Whole-house water filters
          </Link>
        </p>
      </section>

      <section className="rounded-lg border border-neutral-200 bg-neutral-50 px-5 py-4 dark:border-neutral-800 dark:bg-neutral-900/40 sm:px-6">
        <p className="mb-3 text-sm font-medium text-neutral-800 dark:text-neutral-200">
          A few things we take seriously around here:
        </p>
        <ul className="m-0 flex list-none flex-col gap-0 p-0 text-sm font-medium text-neutral-700 dark:text-neutral-300 sm:flex-row sm:flex-wrap sm:items-center sm:gap-x-0 sm:gap-y-2">
          <li className="min-w-0 border-t border-neutral-200 py-3 first:border-t-0 first:pt-0 dark:border-neutral-700 sm:max-w-[min(100%,22rem)] sm:border-t-0 sm:py-0">
            We only show links we can verify to your exact filter code
          </li>
          <li aria-hidden="true" className="hidden shrink-0 select-none sm:flex sm:items-center sm:px-3">
            <Image
              src="/buckparts-logo-black-transparent.png"
              alt=""
              width={22}
              height={22}
              className="h-3.5 w-auto opacity-[0.38] dark:invert dark:opacity-50"
            />
          </li>
          <li className="min-w-0 border-t border-neutral-200 py-3 dark:border-neutral-700 sm:max-w-[min(100%,22rem)] sm:border-t-0 sm:py-0">
            Check your current filter before buying
          </li>
          <li aria-hidden="true" className="hidden shrink-0 select-none sm:flex sm:items-center sm:px-3">
            <Image
              src="/buckparts-logo-black-transparent.png"
              alt=""
              width={22}
              height={22}
              className="h-3.5 w-auto opacity-[0.38] dark:invert dark:opacity-50"
            />
          </li>
          <li className="min-w-0 border-t border-neutral-200 py-3 dark:border-neutral-700 sm:max-w-[min(100%,22rem)] sm:border-t-0 sm:py-0">
            Compare store options when available
          </li>
        </ul>
      </section>

      {popularFilters.length > 0 && (
        <section className="space-y-5">
          <h2 className="text-lg font-semibold text-neutral-900 dark:text-neutral-100">
            Fridge-water starting points
          </h2>
          <p className="text-sm text-neutral-600 dark:text-neutral-400">
            A short list from our refrigerator-water browse data—not a bestseller chart.
          </p>
          <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {popularFilters.map((f) => (
              <li key={f.slug} className="rounded-lg border border-neutral-200 bg-white p-4 dark:border-neutral-800 dark:bg-neutral-950">
                <p className="text-xs font-medium uppercase tracking-wide text-neutral-500 dark:text-neutral-400">
                  {SITE_DISPLAY_NAME}
                </p>
                <p className="mt-2 font-mono text-lg font-semibold text-neutral-900 dark:text-neutral-100">
                  {f.oem_part_number}
                </p>
                <p className="mt-1 text-sm text-neutral-600 dark:text-neutral-400">
                  {f.name?.trim() || "Check fit by matching your model number and part number."}
                </p>
                <Link
                  href={`/filter/${f.slug}`}
                  className="mt-3 inline-flex text-sm font-semibold text-neutral-900 underline-offset-2 hover:underline dark:text-neutral-100"
                >
                  View part
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
