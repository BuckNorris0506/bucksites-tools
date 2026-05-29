import type { Metadata } from "next";
import Link from "next/link";
import { WRONG_PART_PREVENTION_PAGE_META_DESCRIPTION } from "@/lib/copy/public-trust";

export const metadata: Metadata = {
  title: "Wrong-Part Prevention",
  description: WRONG_PART_PREVENTION_PAGE_META_DESCRIPTION,
};

export default function WrongPartPreventionPage() {
  return (
    <article className="mx-auto max-w-3xl space-y-5 text-[15px] leading-relaxed text-neutral-700 dark:text-neutral-300">
      <h1 className="text-2xl font-semibold text-neutral-900 dark:text-neutral-50">
        How BuckParts helps prevent wrong-part purchases
      </h1>
      <p className="text-sm text-neutral-600 dark:text-neutral-400">
        Replacement filter shopping is confusing. BuckParts is built to reduce costly mistakes —
        not to push you toward checkout.
      </p>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold text-neutral-900 dark:text-neutral-100">
          Why replacement shopping is confusing
        </h2>
        <p>
          Model numbers change by year and region. Retail listings reuse photos, bundle multiple
          sizes, or use search pages instead of a single product. Compatibility claims on a
          product page are not always checked against your exact appliance. It is easy to order
          a filter that looks right online but does not fit at home.
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold text-neutral-900 dark:text-neutral-100">
          Common wrong-part traps
        </h2>
        <ul className="list-disc space-y-2 pl-5">
          <li>
            Matching only part of a model number while a suffix or revision differs.
          </li>
          <li>
            Assuming a “fits most” listing applies to your exact unit without reading the part
            number on the old cartridge.
          </li>
          <li>
            Clicking a search result or category page instead of a single product listing we
            have checked.
          </li>
          <li>
            Treating a compatible replacement as interchangeable without comparing dimensions
            and connector type.
          </li>
          <li>
            Rushing when an appliance manual or old filter label is still within reach.
          </li>
        </ul>
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold text-neutral-900 dark:text-neutral-100">
          How BuckParts checks model and filter evidence
        </h2>
        <p>
          BuckParts starts with structured data: appliance models, filter numbers, and
          compatibility links we can trace in our repository. On pages where we show buying
          options, we also review retailer product pages to see whether the listing matches
          the filter number on your page — not just whether a retailer sells something
          similar.
        </p>
        <p>
          We label whether a part is an original or a compatible replacement when our data
          supports that distinction. When mapping or listing evidence is incomplete, we say so
          or leave buying options hidden.
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold text-neutral-900 dark:text-neutral-100">
          How BuckParts refuses unsafe buy paths
        </h2>
        <p>
          BuckParts withholds outbound purchase links when a listing fails our checks — for
          example when the destination is a search page, the product page does not clearly
          match the part number, or we have not finished review. We would rather show no buy
          button than send you to a page that increases wrong-part risk.
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold text-neutral-900 dark:text-neutral-100">
          “No buy button yet” is a trust feature
        </h2>
        <p>
          If you do not see a buying option, that usually means BuckParts is protecting you
          from an unverified path — not that we lack affiliate partnerships. Compare your old
          filter label and manual first. You can still use search and model pages to narrow
          what to verify before ordering elsewhere.
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold text-neutral-900 dark:text-neutral-100">
          What we do not claim
        </h2>
        <p>
          BuckParts does not guarantee that every filter or part in every category has been
          verified. We do not promise specific dollar savings or universal catalog coverage.
          We are one layer of help — not a substitute for reading your old part, your manual,
          and the retailer page before you pay.
        </p>
      </section>

      <p className="text-sm text-neutral-600 dark:text-neutral-400">
        Related:{" "}
        <Link href="/truth-policy" className="underline underline-offset-2">
          Truth Policy
        </Link>
        {" · "}
        <Link href="/about" className="underline underline-offset-2">
          About
        </Link>
        {" · "}
        <Link href="/help" className="underline underline-offset-2">
          Help
        </Link>
        .
      </p>
    </article>
  );
}
