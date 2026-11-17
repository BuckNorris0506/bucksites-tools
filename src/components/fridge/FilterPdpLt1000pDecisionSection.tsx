import React from "react";
import { FilterPdpTrustDecisionSection } from "./FilterPdpTrustDecisionSection";

/** Search spellings only; distinct LG part codes require manufacturer evidence. */
export function lt1000pSpellingAliases(aliases: string[]): string[] {
  return aliases.filter((alias) => /^(?:LG)?LT1000P?$/.test(alias.toUpperCase().replace(/[\s-]+/g, "")));
}

/** LT1000P only. Explains evidence without granting compatibility or buying authority. */
export function FilterPdpLt1000pDecisionSection({
  compatibleModelCount,
  buyingOptionsShown,
}: {
  compatibleModelCount: number;
  buyingOptionsShown: boolean;
}) {
  return (
    <>
      <section className="rounded-2xl border border-bp-border bg-bp-surface p-6 sm:p-7" aria-label="LT1000P part numbers and purchase checks">
        <h2 className="text-lg font-semibold text-bp-text">LG part numbers and replacement filters</h2>
        <div className="mt-4 space-y-4 text-sm leading-relaxed text-bp-text/90">
          <p>LT 1000 P and LG LT1000 are search spellings used for this page. Confirm LT1000P on your old filter or in your exact model’s manual before ordering.</p>
          <p>
            <strong>Original LG filter:</strong> LT1000P is the filter number named in LG’s{" "}
            <a className="underline" href="https://www.lg.com/us/business/refrigerators/lg-lfxc22596s">LFXC22596S specifications</a>.
            That model-specific evidence does not establish fit for every LG refrigerator.
          </p>
          <p>
            <strong>Other LG codes:</strong> BuckParts has not established verified interchangeability here for
            ADQ74793501, ADQ74793502, MDJ64844601, or LT1000PC. A similar code or a shared refrigerator list
            is not enough to treat two cartridges as equivalent.
          </p>
          <p>
            <strong>Third-party replacements:</strong> A retailer listing checked on May 3, 2026 identified
            Waterdrop B07H9LHMR2 as a replacement marketed for LT1000P, not an LG-made filter.
            This historical listing check does not prove interchangeability, filtration performance,
            or current availability. Buying options below depend on separate, current checks.
          </p>
          <div>
            <h3 className="font-semibold">Before ordering</h3>
            <ol className="mt-2 list-decimal space-y-2 pl-5">
              <li>Find the filter number in your exact refrigerator model’s manual and compare it with your old cartridge.</li>
              <li>If the numbers differ, confirm the replacement relationship with LG for that model. Do not infer fit from appearance or a similar part number.</li>
              <li>Check the retailer’s exact product number and maker. A replacement advertised for LT1000P is not necessarily an original LG part.</li>
            </ol>
          </div>
          <p>Unresolved refrigerator compatibility remains under review below. A retailer listing check does not resolve a model-fit warning.</p>
        </div>
      </section>
      <FilterPdpTrustDecisionSection
        filterSlug="lt1000p"
        oemPartNumber="LT1000P"
        compatibleModelCount={compatibleModelCount}
        buyingOptionsShown={buyingOptionsShown}
      />
    </>
  );
}
