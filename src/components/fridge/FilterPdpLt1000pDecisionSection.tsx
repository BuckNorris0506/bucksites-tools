import React from "react";
import Link from "next/link";
import lgReference from "../../../data/evidence/lg-lt1000p-official-reference.2026-11-18.json";
import { filterOfficialReferenceRetailerLinks } from "@/lib/retailers/launch-buy-links";

const LT1000P_CARD = "mx-auto w-full max-w-2xl rounded-3xl border border-bp-border bg-bp-surface p-6 sm:p-8";

/** Search spellings only; distinct LG part codes require manufacturer evidence. */
export function lt1000pSpellingAliases(aliases: string[]): string[] {
  return aliases.filter((alias) => /^(?:LG)?LT1000P?$/.test(alias.toUpperCase().replace(/[\s-]+/g, "")));
}

/** LT1000P only. Explains evidence without granting compatibility or buying authority. */
export function FilterPdpLt1000pDecisionSection() {
  const references = filterOfficialReferenceRetailerLinks([lgReference]);
  return (
    <div className="space-y-5 text-sm leading-relaxed">
      <h1 className="text-3xl font-bold tracking-tight">LG LT1000P water filter</h1>
      <section className={LT1000P_CARD}>
        <h2 className="text-lg font-semibold">Does it fit your fridge?</h2>
        <p className="mt-2 text-lg font-semibold">Confirmed: LG LFXC22596S</p>
        <p>LG&apos;s specifications name LT1000P as its water filter. This manufacturer confirmation applies only to LFXC22596S, not every LG refrigerator.</p>
        <p className="mt-2">Not your model? We haven&apos;t verified yours. Check your fridge&apos;s manual or the number on the old cartridge.</p>
      </section>
      <section className={LT1000P_CARD}>
        <h2 className="text-lg font-semibold">Where to find LT1000P</h2>
        <p>$54.99 — checked November 18, 2026.</p>
        {references.map(link => (
          <div key={link.id} className="mt-3 space-y-3">
            <a className="inline-block rounded-lg bg-bp-text px-4 py-2 font-semibold text-white underline" href={link.affiliate_url} rel="nofollow noopener noreferrer">
              View LG LT1000P on LG&apos;s official site
            </a>
            <p>
              Or <a className="font-semibold underline" href={link.affiliate_url} rel="nofollow noopener noreferrer">find a retailer through LG</a> — select Find a Retailer on LG&apos;s product page.
            </p>
          </div>
        ))}
        <p className="mt-2">Availability as checked November 18, 2026: LG showed Notify Me / Find a Retailer; direct purchase availability is not currently verified.</p>
      </section>
      <section className={LT1000P_CARD}>
        <h2 className="text-lg font-semibold">Other numbers you may see</h2>
        <p>Your old cartridge might read <strong>ADQ74793501</strong>. LG lists that as a part number for LT1000P.</p>
        <p className="mt-2">These are not established as the same filter on this page: <strong>ADQ74793502, MDJ64844601, LT1000PC</strong>.</p>
        <p>Ask LG before ordering if your cartridge shows one of those unresolved numbers.</p>
      </section>
      <details className={LT1000P_CARD}>
        <summary className="cursor-pointer font-semibold">How we know this</summary>
        <div className="mt-3 space-y-3">
          <p><a className="underline" href="https://www.lg.com/us/business/refrigerators/lg-lfxc22596s">LG LFXC22596S specifications</a> name LT1000P. This does not establish fit for other models.</p>
          <p>LG&apos;s product listing checked November 18, 2026 names ADQ74793501, AGF80300704, AGF80300705, ADQ74793507 and AGF80300703 under LT1000P. The displayed price is a dated observation, not a current price or availability guarantee.</p>
          <p>A May 3, 2026 retailer check described Waterdrop B07H9LHMR2 as an aftermarket replacement, not an LG-made filter. Historical retailer evidence does not prove current availability or model fit.</p>
        </div>
      </details>
    </div>
  );
}

export function FilterPdpLt1000pPageEnd() {
  return (
    <footer className="space-y-5 text-sm leading-relaxed">
      <nav aria-label="Related LG filters" className={`${LT1000P_CARD} space-y-2`}>
        <h2 className="text-lg font-semibold">Related LG filter pages</h2>
        <p>Different part numbers, not interchangeable alternatives. Check the number required by your refrigerator.</p>
        <div className="flex flex-wrap gap-x-6 gap-y-2">
          <Link className="underline" href="/filter/lt600p">LT600P</Link>
          <Link className="underline" href="/filter/lt700p">LT700P</Link>
          <Link className="underline" href="/filter/lt800p">LT800P</Link>
          <Link className="underline" href="/filter/lt1000pc">LT1000PC</Link>
        </div>
      </nav>
      <nav aria-label="Continue finding your filter" className={`${LT1000P_CARD} flex flex-wrap gap-x-6 gap-y-2`}>
        <Link className="underline" href="/search">Search by refrigerator model or part number</Link>
        <Link className="underline" href="/">BuckParts home</Link>
      </nav>
    </footer>
  );
}
