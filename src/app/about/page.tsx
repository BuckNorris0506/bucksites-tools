import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "About",
  description:
    "What BuckParts does: replacement filter lookup, fit guidance, and verified outbound links.",
};

const contactEmail = "support@buckparts.com";

export default function AboutPage() {
  return (
    <article className="mx-auto max-w-3xl space-y-5 text-[15px] leading-relaxed text-neutral-700 dark:text-neutral-300">
      <h1 className="text-2xl font-semibold text-neutral-900 dark:text-neutral-50">
        About BuckParts
      </h1>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold text-neutral-900 dark:text-neutral-100">
          What we do
        </h2>
        <p>
          BuckParts helps you find the <strong>right replacement filter</strong>{" "}
          before you spend money. You can search by model number or part number,
          browse categories like refrigerator water filters, air purifier
          filters, and whole-house water filters, and open vetted store links
          when we have enough confidence to show them.
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold text-neutral-900 dark:text-neutral-100">
          Our mission
        </h2>
        <p>
          Wrong filters are expensive and frustrating. We focus on{" "}
          <strong>clear part numbers</strong>,{" "}
          <strong>honest fit guidance</strong>, and{" "}
          <strong>verification-first</strong> links—not hype.
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold text-neutral-900 dark:text-neutral-100">
          Trust and compatibility
        </h2>
        <p>
          Compatibility information on BuckParts comes from structured data and
          checks we run for this site. It is meant to narrow your search—not
          replace reading your old filter label, your manual, or the retailer’s
          product page.{" "}
          <strong>Always verify the part number before you buy.</strong>
        </p>
        <p>
          BuckParts is <strong>not</strong> the manufacturer or OEM. Brand names
          are used so you can find the correct part for your appliance.
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold text-neutral-900 dark:text-neutral-100">
          Contact
        </h2>
        <p>
          Feedback or questions:{" "}
          <a
            className="font-semibold text-neutral-900 underline underline-offset-2 dark:text-neutral-100"
            href={`mailto:${contactEmail}`}
          >
            {contactEmail}
          </a>
          .
        </p>
      </section>

      <p className="text-sm text-neutral-600 dark:text-neutral-400">
        Related:{" "}
        <Link href="/disclosure" className="underline underline-offset-2">
          Affiliate Disclosure
        </Link>
        {" · "}
        <Link href="/privacy" className="underline underline-offset-2">
          Privacy
        </Link>
        .
      </p>
    </article>
  );
}
