import type { Metadata } from "next";
import Link from "next/link";
import { SearchForm } from "@/components/SearchForm";
import { listBrowseFilters } from "@/lib/catalog/browse";
import { SITE_DISPLAY_NAME } from "@/lib/site-brand";

export const metadata: Metadata = {
  title: "Replacement filters & parts lookup",
  description:
    "Find the right replacement filter before you buy. Search by model number or part number, then compare verified store options when available.",
  openGraph: {
    title: "Replacement filters & parts lookup",
    description:
      "Find the right replacement filter before you buy. Search by model number or part number, then compare verified store options when available.",
  },
  twitter: {
    card: "summary_large_image",
    title: "Replacement filters & parts lookup",
    description:
      "Find the right replacement filter before you buy. Search by model number or part number, then compare verified store options when available.",
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
            Stop guessing which filter fits your model.
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
        <ul className="flex flex-wrap gap-x-6 gap-y-2 text-sm font-medium text-neutral-700 dark:text-neutral-300">
          <li>We only show links we can verify to your exact filter code</li>
          <li>Check your current filter before buying</li>
          <li>Compare store options when available</li>
        </ul>
      </section>

      {popularFilters.length > 0 && (
        <section className="space-y-5">
          <h2 className="text-lg font-semibold text-neutral-900 dark:text-neutral-100">
            Popular replacement filters
          </h2>
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
