import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Terms of Use",
  description:
    "Terms of use for BuckParts: informational service, verify before purchase, third-party retailers.",
};

export default function TermsPage() {
  return (
    <article className="mx-auto max-w-3xl space-y-5 text-[15px] leading-relaxed text-neutral-700 dark:text-neutral-300">
      <h1 className="text-2xl font-semibold text-neutral-900 dark:text-neutral-50">
        Terms of Use
      </h1>
      <p className="text-sm text-neutral-600 dark:text-neutral-400">
        Last updated April 2026. Plain-language summary. Not legal advice.
      </p>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold text-neutral-900 dark:text-neutral-100">
          Informational use
        </h2>
        <p>
          BuckParts is provided for <strong>informational purposes</strong> to
          help you research replacement filters and related parts. Content may
          contain errors or become outdated. Use your own judgment and official
          sources when safety or warranty matters.
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold text-neutral-900 dark:text-neutral-100">
          Verify before purchase
        </h2>
        <p>
          You are responsible for confirming the correct part for your appliance.
          Compare part numbers with your old part, door label, or manufacturer
          documentation. <strong>BuckParts does not guarantee fit.</strong>
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold text-neutral-900 dark:text-neutral-100">
          Third-party retailers
        </h2>
        <p>
          Links may take you to independent retailers. Those sites set their own
          prices, shipping, returns, taxes, and customer service. BuckParts is{" "}
          <strong>not</strong> the seller and is not responsible for their
          policies, product condition, or fulfillment.
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold text-neutral-900 dark:text-neutral-100">
          No warranty on availability or pricing
        </h2>
        <p>
          We do not warrant that any link will work, that any item will be in
          stock, or that any price shown elsewhere is current. Retailers change
          their sites without notice.
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold text-neutral-900 dark:text-neutral-100">
          Affiliate relationships
        </h2>
        <p>
          BuckParts may earn commissions from qualifying purchases through
          outbound links. See{" "}
          <Link
            href="/disclosure"
            className="font-semibold text-neutral-900 underline underline-offset-2 dark:text-neutral-100"
          >
            Affiliate Disclosure
          </Link>{" "}
          for details.
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold text-neutral-900 dark:text-neutral-100">
          Not the manufacturer or OEM
        </h2>
        <p>
          BuckParts is an independent site. We are not the manufacturer or OEM.
          Brand names on the site are used to identify compatible products for
          lookup.
        </p>
      </section>

      <p className="text-sm text-neutral-600 dark:text-neutral-400">
        Related:{" "}
        <Link href="/privacy" className="underline underline-offset-2">
          Privacy
        </Link>
        {" · "}
        <Link href="/about" className="underline underline-offset-2">
          About
        </Link>
        .
      </p>
    </article>
  );
}
