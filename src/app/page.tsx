import type { Metadata } from "next";
import { SearchForm } from "@/components/SearchForm";

export const metadata: Metadata = {
  title: "Water filter finder",
  description:
    "Search by refrigerator model or OEM filter part number to see compatible filters and buy options.",
};

export default function HomePage() {
  return (
    <div className="space-y-8">
      <div className="space-y-3">
        <h1 className="text-2xl font-semibold tracking-tight text-neutral-900 dark:text-neutral-50 sm:text-3xl">
          Find your refrigerator water filter
        </h1>
        <p className="text-neutral-600 dark:text-neutral-400">
          Enter a fridge model number or a filter part number. We match official
          numbers and common alternate part codes.
        </p>
      </div>
      <SearchForm />
      <section className="rounded-lg border border-neutral-200 bg-neutral-50 p-4 text-sm text-neutral-700 dark:border-neutral-800 dark:bg-neutral-900 dark:text-neutral-300">
        <h2 className="font-medium text-neutral-900 dark:text-neutral-100">
          How it works
        </h2>
        <ol className="mt-2 list-decimal space-y-1 pl-5">
          <li>Search your model or filter number.</li>
          <li>Open the fridge or filter page for compatibility and timing.</li>
          <li>Use buy links to go to retailers (tracked for basic analytics).</li>
        </ol>
      </section>
    </div>
  );
}
