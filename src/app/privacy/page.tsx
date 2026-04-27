import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Privacy",
  description:
    "How BuckParts handles information when you use the site, including analytics and affiliate links.",
};

const contactEmail = "support@buckparts.com";

export default function PrivacyPage() {
  return (
    <article className="mx-auto max-w-3xl space-y-5 text-[15px] leading-relaxed text-neutral-700 dark:text-neutral-300">
      <h1 className="text-2xl font-semibold text-neutral-900 dark:text-neutral-50">
        Privacy
      </h1>
      <p className="text-sm text-neutral-600 dark:text-neutral-400">
        Last updated April 2026. Plain-language summary for homeowners. This is not legal advice.
      </p>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold text-neutral-900 dark:text-neutral-100">
          What BuckParts is
        </h2>
        <p>
          BuckParts is an independent lookup site. We are{" "}
          <strong>not</strong> the manufacturer, OEM, or seller of the parts
          linked from our pages.
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold text-neutral-900 dark:text-neutral-100">
          Information we may collect or observe
        </h2>
        <ul className="list-disc space-y-2 pl-5">
          <li>
            <strong>What you type in search</strong> and pages you open on
            BuckParts, so we can show results and improve the site.
          </li>
          <li>
            <strong>Technical data</strong> such as browser type, general
            region (from standard web requests), and timestamps—typical for
            operating a website.
          </li>
          <li>
            When you use <strong>outbound retailer links</strong>, those
            retailers run their own sites and privacy practices. We do not
            control what they collect.
          </li>
        </ul>
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold text-neutral-900 dark:text-neutral-100">
          Cookies and analytics
        </h2>
        <p>
          If Google Analytics (GA4) is enabled for our deployment, it may use
          cookies or similar technology to measure traffic (for example, which
          pages are viewed). You can use browser settings to limit cookies.
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold text-neutral-900 dark:text-neutral-100">
          Affiliate links and tracking
        </h2>
        <p>
          Some links go through BuckParts <code className="rounded bg-neutral-100 px-1 dark:bg-neutral-800">/go/…</code>{" "}
          URLs before opening a retailer. That helps us run the site and may
          earn a commission if you buy—see{" "}
          <Link
            href="/disclosure"
            className="font-semibold text-neutral-900 underline underline-offset-2 dark:text-neutral-100"
          >
            Affiliate Disclosure
          </Link>
          . Retailers and affiliate networks may use their own cookies or
          tracking when you land on their site.
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold text-neutral-900 dark:text-neutral-100">
          Contact
        </h2>
        <p>
          Questions about this policy:{" "}
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
        <Link href="/terms" className="underline underline-offset-2">
          Terms
        </Link>
        .
      </p>
    </article>
  );
}
