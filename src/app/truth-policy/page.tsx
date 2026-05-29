import type { Metadata } from "next";
import Link from "next/link";
import { TRUTH_POLICY_PAGE_META_DESCRIPTION } from "@/lib/copy/public-trust";

export const metadata: Metadata = {
  title: "Truth Policy",
  description: TRUTH_POLICY_PAGE_META_DESCRIPTION,
};

export default function TruthPolicyPage() {
  return (
    <article className="mx-auto max-w-3xl space-y-5 text-[15px] leading-relaxed text-neutral-700 dark:text-neutral-300">
      <h1 className="text-2xl font-semibold text-neutral-900 dark:text-neutral-50">
        BuckParts Truth Policy
      </h1>
      <p className="text-sm text-neutral-600 dark:text-neutral-400">
        How BuckParts handles fit, uncertainty, and buying options — in plain language.
      </p>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold text-neutral-900 dark:text-neutral-100">
          We do not guess fit
        </h2>
        <p>
          BuckParts is a homeowner-help site for replacement filters and parts. We do{" "}
          <strong>not</strong> invent compatibility. When we cannot tie a model to a filter
          number with evidence we trust, we say so — or we leave buying options off the page.
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold text-neutral-900 dark:text-neutral-100">
          We show uncertainty
        </h2>
        <p>
          Replacement shopping is messy: similar model numbers, alternate part codes, and
          listings that look right but are not. BuckParts labels what we know, what we are
          still checking, and what you should compare on your old part or in your manual
          before you order.
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold text-neutral-900 dark:text-neutral-100">
          Original vs compatible replacements
        </h2>
        <p>
          When we can, we label whether a listed part is an{" "}
          <strong>original part</strong> from the brand that made your appliance or a{" "}
          <strong>compatible replacement</strong> from another maker. Those labels come from
          our data and checks — not from retailer marketing copy. Always compare the part
          number printed on your old filter before you buy.
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold text-neutral-900 dark:text-neutral-100">
          Buying options only when evidence supports them
        </h2>
        <p>
          A buying option appears only when BuckParts has checked that a retailer product page
          matches the filter or part number on your page well enough to pass our safety
          review. If the evidence is thin, conflicting, or still under review, we withhold
          the link rather than send you somewhere risky.
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold text-neutral-900 dark:text-neutral-100">
          Some pages intentionally have no buy button
        </h2>
        <p>
          Missing a buy button is often intentional. It means we are not comfortable opening
          a purchase path yet — not that we forgot to add shopping links. That restraint is
          part of how BuckParts tries to prevent wrong-part orders.
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold text-neutral-900 dark:text-neutral-100">
          Affiliate links do not decide what we show
        </h2>
        <p>
          BuckParts may earn a commission when you use certain outbound retailer links. Those
          links are <strong>secondary</strong> to truth: they help cover operating costs like
          hosting, verification, and development. Revenue does not override fit evidence. We
          do not show a buying option just because a retailer pays a commission.
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold text-neutral-900 dark:text-neutral-100">
          BuckParts is not a store
        </h2>
        <p>
          BuckParts is not an online store, seller, original equipment maker, or manufacturer.
          We do not ship products, set prices, or handle returns. Retailers run checkout. Brand
          names on the site help you find the right part for your appliance; they belong to their
          owners.
        </p>
      </section>

      <p className="text-sm text-neutral-600 dark:text-neutral-400">
        Related:{" "}
        <Link href="/wrong-part-prevention" className="underline underline-offset-2">
          Wrong-part prevention
        </Link>
        {" · "}
        <Link href="/disclosure" className="underline underline-offset-2">
          Affiliate Disclosure
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
