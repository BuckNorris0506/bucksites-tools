import Link from "next/link";
import {
  brandNameForBrowseChip,
  type BrowseBrandRow,
  type BrowseFilterRow,
  type BrowseModelRow,
} from "@/lib/catalog/browse";

const sectionTitleClass =
  "text-sm font-semibold uppercase tracking-wide text-neutral-500 dark:text-neutral-400";

const hintClass = "text-sm text-neutral-500 dark:text-neutral-400";

const linkBoxClass =
  "block rounded-lg border border-neutral-200 px-3 py-2.5 text-sm transition-colors hover:border-neutral-300 hover:bg-neutral-50 dark:border-neutral-800 dark:hover:border-neutral-600 dark:hover:bg-neutral-900/60";

function CategoryBrowseEmptyState({
  categoryLabel,
  searchPath,
}: {
  categoryLabel: string;
  searchPath: string;
}) {
  const search = searchPath.replace(/\/$/, "");
  return (
    <div className="border-t border-neutral-200 pt-10 dark:border-neutral-800">
      <h2 className={sectionTitleClass}>Browse this category</h2>
      <p className="mt-4 max-w-xl text-pretty text-sm leading-relaxed text-neutral-600 dark:text-neutral-400">
        We do not have browse listings for {categoryLabel} yet. Search works when you have a model
        or part number; listings here will appear as data is added.
      </p>
      <p className="mt-4 text-sm font-medium">
        <Link
          href={search}
          className="text-neutral-900 underline-offset-2 hover:underline dark:text-neutral-100"
        >
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
    <div className="space-y-10 border-t border-neutral-200 pt-10 dark:border-neutral-800">
      <p className={hintClass}>
        Know your model or part number?{" "}
        <Link
          href={search}
          className="font-medium text-neutral-900 underline-offset-2 hover:underline dark:text-neutral-100"
        >
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
                <Link
                  href={`${brandPath}/${b.slug}`}
                  className="inline-flex rounded-full border border-neutral-200 bg-white px-3.5 py-2 text-sm font-medium text-neutral-800 hover:border-neutral-300 hover:bg-neutral-50 dark:border-neutral-700 dark:bg-neutral-950 dark:text-neutral-200 dark:hover:border-neutral-600 dark:hover:bg-neutral-900"
                >
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
                      <span className="font-mono font-medium text-neutral-900 dark:text-neutral-100">
                        {m.model_number}
                      </span>
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
                      <span className="font-mono font-medium text-neutral-900 dark:text-neutral-100">
                        {f.oem_part_number}
                      </span>
                      {f.name && (
                        <span className="mt-0.5 block text-neutral-600 dark:text-neutral-400">
                          {f.name}
                        </span>
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
