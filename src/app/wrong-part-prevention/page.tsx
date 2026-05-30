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
        How BuckParts helps you avoid buying the wrong filter
      </h1>
      <p className="text-sm text-neutral-600 dark:text-neutral-400">
        Replacement filter shopping is confusing. BuckParts is built to help you avoid costly
        mistakes — not to push you toward checkout.
      </p>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold text-neutral-900 dark:text-neutral-100">
          Why replacement shopping is confusing
        </h2>
        <p>
          Model numbers change by year and region. Retail listings reuse photos, bundle multiple
          sizes, or send you to a page with many products instead of one clear match.
          Compatibility claims on a product page are not always checked against your exact
          appliance. It is easy to order a filter that looks right online but does not fit at
          home.
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
            Clicking a result that lands on a broad retailer page instead of one product that
            clearly matches your filter number.
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
          What BuckParts checks before showing a buying option
        </h2>
        <p>
          BuckParts keeps track of appliance models, filter numbers, and which filters belong
          with which models — based on sources we can stand behind. When a buying option appears
          on your page, we have looked at the retailer product page to see whether it really
          matches the filter number you are viewing, not just something that looks close.
        </p>
        <p>
          We say when a part is an original or a compatible replacement when our information
          supports that. When we do not know enough yet, we say so plainly — and we do not
          show a purchase link we are not comfortable with.
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold text-neutral-900 dark:text-neutral-100">
          When we do not show a buying option
        </h2>
        <p>
          Sometimes a retailer listing does not pass our review — the page may show many products,
          the title may not clearly match your filter number, or we are still working through
          what we know. We would rather leave the buying option off than send you somewhere
          that makes a wrong purchase more likely.
        </p>
        <p>
          Finding the right link can turn into a treasure hunt. When that happens, BuckParts keeps
          trying to find where the match is — and we will not point you at a questionable part just
          to look helpful.
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold text-neutral-900 dark:text-neutral-100">
          No buying option on your page? That is on purpose
        </h2>
        <p>
          If you do not see a buying option, BuckParts is usually still trying to clear things
          up — not holding back because we lack retailer relationships.{" "}
          Before buying, compare the filter code on your old filter or fridge label with what this
          page shows. Check your manual if you have it. You can still use BuckParts to look up
          your model and narrow what to verify before you order anywhere.
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
