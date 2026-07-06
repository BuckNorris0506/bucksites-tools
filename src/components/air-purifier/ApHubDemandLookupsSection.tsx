import Link from "next/link";
import type { ApHubDemandLookup } from "@/lib/air-purifier/ap-hub-demand-lookups-v1";

const sectionTitleClass =
  "text-sm font-semibold uppercase tracking-wide text-bp-muted";

const linkRowClass =
  "bp-card-interactive block px-3 py-3 text-sm transition-colors hover:bg-bp-trust-soft/35";

export function ApHubDemandLookupsSection({ lookups }: { lookups: ApHubDemandLookup[] }) {
  if (lookups.length === 0) return null;

  return (
    <section className="space-y-3 border-t border-bp-border pt-10">
      <h2 className={sectionTitleClass}>Air purifier model lookups</h2>
      <p className="max-w-2xl text-sm leading-relaxed text-bp-muted">
        A short list of model pages BuckParts is seeing in Google Search—not a popularity ranking,
        sales chart, or bestseller list.
      </p>
      <ul className="max-w-2xl divide-y divide-bp-border overflow-hidden rounded-lg border border-bp-border bg-bp-surface">
        {lookups.map((item) => (
          <li key={item.slug}>
            <Link href={`/air-purifier/model/${item.slug}`} className={linkRowClass}>
              <span className="bp-code font-semibold text-bp-text">{item.modelNumber}</span>
              <span className="ml-2 text-bp-muted">{item.brandName}</span>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
