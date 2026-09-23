import Link from "next/link";
import { CATALOG_LABELS, CATALOG_REFRIGERATOR_WATER_FILTER } from "@/lib/catalog/constants";
import { catalogFilterPath, catalogModelPath } from "@/lib/catalog/paths";
import type { SearchHit, SearchHitFilter, SearchHitFridge } from "@/lib/data/search";

const cardClass = "bp-search-customer__card";

function hitHref(hit: SearchHit): string | null {
  if (hit.kind === "fridge") {
    return catalogModelPath(CATALOG_REFRIGERATOR_WATER_FILTER, hit.slug);
  }
  if (hit.kind === "filter" && hit.catalog === CATALOG_REFRIGERATOR_WATER_FILTER) {
    return catalogFilterPath(CATALOG_REFRIGERATOR_WATER_FILTER, hit.slug);
  }
  return null;
}

function HitRow({ hit }: { hit: SearchHit }) {
  const href = hitHref(hit);
  const catalogLabel = CATALOG_LABELS[hit.catalog] ?? hit.catalog;
  const title =
    hit.kind === "fridge"
      ? (hit as SearchHitFridge).model_number
      : hit.kind === "filter"
        ? (hit as SearchHitFilter).oem_part_number
        : hit.kind === "model"
          ? hit.model_number
          : "Match";

  const subtitle =
    hit.kind === "fridge" || hit.kind === "model"
      ? `${hit.brand_name} · Model`
      : hit.kind === "filter"
        ? `${hit.brand_name}${hit.name ? ` · ${hit.name}` : ""}`
        : catalogLabel;

  const body = (
    <>
      <p className="bp-search-customer__card-label">{catalogLabel}</p>
      <p className="bp-search-customer__card-title">{title}</p>
      <p className="mt-1 text-sm text-[var(--home-muted)]">{subtitle}</p>
      {hit.via === "alias" && hit.matchedAlias ? (
        <p className="mt-2 text-xs text-[var(--home-muted)]">
          Matched alternate number: {hit.matchedAlias}
        </p>
      ) : null}
    </>
  );

  if (href) {
    return (
      <Link href={href} className={cardClass}>
        {body}
      </Link>
    );
  }

  return <div className={cardClass}>{body}</div>;
}

export function SearchResolutionExperience({
  query,
  hits,
}: {
  query: string;
  hits: SearchHit[];
}) {
  return (
    <section className="bp-search-customer__hero" aria-labelledby="search-resolution-title">
      <p className="bp-search-customer__eyebrow">Search resolution</p>
      <h1 id="search-resolution-title" className="bp-search-customer__title">
        Which one is yours?
      </h1>
      <p className="bp-search-customer__body">
        We found more than one possible match for{" "}
        <span className="bp-search-customer__query">{query}</span>. Open the item that matches
        what is printed on your appliance or old filter.
      </p>
      <ul className="mt-5 list-none space-y-3 p-0">
        {hits.map((hit) => (
          <li key={`${hit.catalog}-${hit.kind}-${hit.slug}`}>
            <HitRow hit={hit} />
          </li>
        ))}
      </ul>
    </section>
  );
}

export function SearchRecoveryExperience({ query }: { query: string }) {
  return (
    <section className="bp-search-customer__hero" aria-labelledby="search-recovery-title">
      <p className="bp-search-customer__eyebrow">No match yet</p>
      <h1 id="search-recovery-title" className="bp-search-customer__title">
        We could not match that number
      </h1>
      <p className="bp-search-customer__body">
        Nothing in BuckParts matched{" "}
        <span className="bp-search-customer__query">{query}</span>. That is not a fit denial—it
        usually means the spelling or format does not line up with what we have on file yet.
      </p>
      <ul className="mt-4 list-inside list-disc space-y-2 text-base leading-relaxed text-[var(--home-muted)]">
        <li>Check the rating plate for the full model number.</li>
        <li>Read the part number on the filter you are replacing.</li>
        <li>Try the code without spaces or dashes.</li>
      </ul>
      <Link href="/#number-help" className="bp-search-customer__cta">
        Help me find my number
      </Link>
    </section>
  );
}

export function DirectPartFitPrompt({ partNumber }: { partNumber: string }) {
  return (
    <div className="bp-search-customer__fit-prompt" role="region" aria-labelledby="fit-prompt-title">
      <h2 id="fit-prompt-title">Will it fit your appliance?</h2>
      <p>
        You opened part <span className="bp-search-customer__query">{partNumber}</span> without a
        model check. Enter your refrigerator model to confirm fit—we do not imply compatibility
        from the part number alone.
      </p>
      <Link href="/" className="bp-search-customer__cta mt-3">
        Check fit with my model
      </Link>
    </div>
  );
}
