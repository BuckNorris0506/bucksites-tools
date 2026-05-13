import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Store link unavailable",
  description:
    "That BuckParts store shortcut could not be opened safely. Compare your part numbers, try search, or return home.",
};

export default function GoUnavailablePage() {
  return (
    <article className="mx-auto max-w-2xl space-y-5 px-4 py-10 text-[15px] leading-relaxed text-neutral-700 dark:text-neutral-300 sm:px-6 sm:py-12">
      <h1 className="text-2xl font-semibold text-neutral-900 dark:text-neutral-50">
        That store shortcut did not open
      </h1>
      <p>
        BuckParts could not safely open that store listing. This can happen when a link is missing,
        expired, blocked, or no longer passes our checks.
      </p>
      <p>
        Compare the part and model numbers on your{" "}
        <strong className="font-medium text-neutral-800 dark:text-neutral-200">old filter</strong> or in your{" "}
        <strong className="font-medium text-neutral-800 dark:text-neutral-200">owner&apos;s manual</strong> before
        you try again.
      </p>
      <p className="text-sm text-neutral-600 dark:text-neutral-400">
        <Link
          href="/search"
          className="font-semibold text-neutral-900 underline underline-offset-2 dark:text-neutral-100"
        >
          Search filters
        </Link>
        {" · "}
        <Link href="/" className="font-semibold text-neutral-900 underline underline-offset-2 dark:text-neutral-100">
          Home
        </Link>
      </p>
    </article>
  );
}
