import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Purchase option unavailable",
  description:
    "That BuckParts purchase option could not be opened safely. Compare model and part details, try search, or return home.",
};

export default function GoUnavailablePage() {
  return (
    <article className="mx-auto max-w-2xl space-y-5 border-l-[3px] border-l-bp-caution bg-bp-surface px-4 py-10 pl-5 text-[15px] leading-relaxed text-bp-text/90 sm:px-6 sm:py-12 sm:pl-7">
      <h1 className="text-2xl font-semibold text-bp-text">
        That purchase option did not open
      </h1>
      <p>
        BuckParts could not safely open that store listing. This can happen when a link is missing,
        expired, blocked, or no longer passes our checks.
      </p>
      <p>
        Compare model and part numbers on your{" "}
        <strong className="font-medium text-bp-text">product or packaging</strong> or in
        your <strong className="font-medium text-bp-text">owner&apos;s manual</strong> before
        you try again.
      </p>
      <p className="text-sm text-bp-muted">
        <Link
          href="/search"
          className="font-semibold text-bp-trust underline underline-offset-2"
        >
          Search
        </Link>
        {" · "}
        <Link href="/" className="font-semibold text-bp-trust underline underline-offset-2">
          Home
        </Link>
      </p>
    </article>
  );
}
