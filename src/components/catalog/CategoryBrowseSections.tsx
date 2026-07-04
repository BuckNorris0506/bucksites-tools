import Link from "next/link";
import {
  brandNameForBrowseChip,
  type BrowseBrandRow,
  type BrowseFilterRow,
  type BrowseModelRow,
} from "@/lib/catalog/browse";

const sectionTitleClass =
  "text-sm font-semibold uppercase tracking-wide text-bp-muted";

const hintClass = "text-sm text-bp-muted";

const searchLinkClass =
  "font-medium text-bp-trust underline decoration-bp-trust/30 underline-offset-2 hover:decoration-bp-trust/55";

const linkBoxClass =
  "bp-card-interactive block rounded-lg border border-bp-border bg-bp-surface px-3 py-2.5 text-sm transition-colors hover:border-bp-muted/50 hover:bg-bp-trust-soft/40";

const brandChipClass =
  "inline-flex rounded-full border border-bp-border bg-bp-surface px-3.5 py-2 text-sm font-medium text-bp-text transition-colors hover:border-bp-trust/40 hover:bg-bp-trust-soft/50";

function CategoryBrowseEmptyState({
  categoryLabel,
  searchPath,
}: {
  categoryLabel: string;
  searchPath: string;
}) {
  const search = searchPath.replace(/\/$/, "");
  return (
    <div className="border-t border-bp-border pt-10">
      <h2 className={sectionTitleClass}>Browse this category</h2>
      <p className="mt-4 max-w-xl text-pretty text-sm leading-relaxed text-bp-text/90">
        We do not have browse listings for {categoryLabel} yet. Search works when you have a model
        or part number; listings here will appear as data is added.
      </p>
      <p className="mt-4 text-sm font-medium">
        <Link href={search} className={searchLinkClass}>
          Search {categoryLabel}
        </Link>
      </p>
    </div>
  );
}

export function CategoryBrowseSections({
  categoryLabel,
  searchPath,
  brandBasePath,
  modelHref,
  filterHref,
  brands,
  models,
  filters,
  filterColumnHeading = "Filters & parts",
  trailingNote,
}: {
  categoryLabel: string;
  searchPath: string;
  brandBasePath: string;
  modelHref: (slug: string) => string;
  filterHref: (slug: string) => string;
  brands: BrowseBrandRow[];
  models: BrowseModelRow[];
  filters: BrowseFilterRow[];
  filterColumnHeading?: string;
  trailingNote?: string;
}) {
  const search = searchPath.replace(/\/$/, "");
  const hasBrands = brands.length > 0;
  const hasModels = models.length > 0;
  const hasFilters = filters.length > 0;
  const hasAnyBrowse = hasBrands || hasModels || hasFilters;

  if (!hasAnyBrowse) {
    return (
      <CategoryBrowseEmptyState categoryLabel={categoryLabel} searchPath={searchPath} />
    );
  }

  const brandPath = brandBasePath.replace(/\/$/, "");

  return (
    <div className="space-y-10 border-t border-bp-border pt-10">
      <p className={hintClass}>
        Know your model or part number?{" "}
        <Link href={search} className={searchLinkClass}>
          Search {categoryLabel}
        </Link>
        .
      </p>

      {hasBrands && (
        <section className="space-y-4">
          <h2 className={sectionTitleClass}>Browse by brand</h2>
          <ul className="flex flex-wrap gap-2">
            {brands.map((b) => (
              <li key={b.slug}>
                <Link href={`${brandPath}/${b.slug}`} className={brandChipClass}>
                  {brandNameForBrowseChip(b)}
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}

      {(hasModels || hasFilters) && (
        <div className="grid gap-10 lg:grid-cols-2">
          {hasModels && (
            <section className="space-y-4">
              <h2 className={sectionTitleClass}>Browse by model</h2>
              <ul className="max-h-80 space-y-1 overflow-y-auto pr-1">
                {models.map((m) => (
                  <li key={m.slug}>
                    <Link href={modelHref(m.slug)} className={linkBoxClass}>
                      <span className="bp-code font-semibold text-bp-text">{m.model_number}</span>
                    </Link>
                  </li>
                ))}
              </ul>
              <p className={`${hintClass} text-xs`}>
                Showing the first {models.length} models A–Z.
              </p>
            </section>
          )}

          {hasFilters && (
            <section className="space-y-4">
              <h2 className={sectionTitleClass}>{filterColumnHeading}</h2>
              <ul className="max-h-80 space-y-1 overflow-y-auto pr-1">
                {filters.map((f) => (
                  <li key={f.slug}>
                    <Link href={filterHref(f.slug)} className={linkBoxClass}>
                      <span className="bp-code font-semibold text-bp-text">{f.oem_part_number}</span>
                      {f.name && (
                        <span className="mt-0.5 block text-bp-muted">{f.name}</span>
                      )}
                    </Link>
                  </li>
                ))}
              </ul>
              <p className={`${hintClass} text-xs`}>
                Showing the first {filters.length} part numbers A–Z.
              </p>
            </section>
          )}
        </div>
      )}

      {trailingNote && <p className={`${hintClass} pt-2`}>{trailingNote}</p>}
    </div>
  );
}
