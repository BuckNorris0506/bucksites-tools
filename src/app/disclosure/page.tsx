import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Affiliate Disclosure",
  description:
    "How BuckParts earns commissions from retailer links and how we handle recommendations.",
};

export default function DisclosurePage() {
  return (
    <article className="mx-auto max-w-3xl space-y-5 text-[15px] leading-relaxed text-neutral-700 dark:text-neutral-300">
      <h1 className="text-2xl font-semibold text-neutral-900 dark:text-neutral-50">
        Affiliate Disclosure
      </h1>
      <p className="text-sm text-neutral-600 dark:text-neutral-400">
        For homeowners using BuckParts. We keep this direct.
      </p>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold text-neutral-900 dark:text-neutral-100">
          We may earn a commission
        </h2>
        <p>
          BuckParts is free to use. When you click certain outbound links to
          retailers (for example, “where to buy” links on a filter page), we may
          earn a commission or referral fee if you make a purchase. That helps
          pay for hosting and upkeep. It does <strong>not</strong> change the
          price you pay at the retailer.
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold text-neutral-900 dark:text-neutral-100">
          Why links use <code className="rounded bg-neutral-100 px-1 dark:bg-neutral-800">/go/…</code>
        </h2>
        <p>
          Many store links on BuckParts go through our{" "}
          <code className="rounded bg-neutral-100 px-1 dark:bg-neutral-800">/go/…</code>{" "}
          redirect first. That records the click in a normal affiliate way,
          then sends your browser to the retailer’s product or store page. The
          retailer—not BuckParts—runs checkout, shipping, returns, and taxes.
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold text-neutral-900 dark:text-neutral-100">
          Editorial approach
        </h2>
        <p>
          We aim to show store links only when our checks say they match your{" "}
          <strong>exact part or filter code</strong> (verification-first). We
          do not guarantee we list every possible store, the best price, or
          current stock—retailers change that constantly.
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold text-neutral-900 dark:text-neutral-100">
          We are not the seller or OEM
        </h2>
        <p>
          BuckParts is <strong>not</strong> the manufacturer, OEM, or seller.
          Brand names on the site identify compatible products for lookup; they
          belong to their owners. Always compare the part number with your old
          part or your appliance manual before you buy.
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold text-neutral-900 dark:text-neutral-100">
          No guarantee of fit, price, or stock
        </h2>
        <p>
          Even with careful matching, models vary by year and region. You are
          responsible for confirming fit. Prices, promotions, and availability
          are set by third-party retailers, not BuckParts.
        </p>
      </section>

      <p className="text-sm text-neutral-600 dark:text-neutral-400">
        Related:{" "}
        <Link href="/privacy" className="underline underline-offset-2">
          Privacy
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
