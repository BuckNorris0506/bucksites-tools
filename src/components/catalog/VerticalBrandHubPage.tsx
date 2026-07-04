import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import type { VerticalBrandBrowsePayload } from "@/lib/catalog/browse";

const sectionTitleClass =
  "text-sm font-semibold uppercase tracking-wide text-bp-muted";

const breadcrumbClass = "text-sm text-bp-muted";

const breadcrumbLinkClass =
  "transition-colors hover:text-bp-text";

const searchLinkClass =
  "font-medium text-bp-trust underline decoration-bp-trust/30 underline-offset-2 hover:decoration-bp-trust/55";

const linkRowClass =
  "block border-b border-bp-border px-3 py-2.5 text-sm last:border-b-0 transition-colors hover:bg-bp-trust-soft/40";

export async function verticalBrandHubMetadata(
  payload: VerticalBrandBrowsePayload | null,
  catalogTitle: string,
): Promise<Metadata> {
  if (!payload) return { title: "Brand not found" };
  return {
    title: `${payload.brand.name} · ${catalogTitle}`,
    description: `${catalogTitle} models and parts for ${payload.brand.name}.`,
  };
}

export function VerticalBrandHubPage({
  payload,
  catalogTitle,
  basePath,
  searchPath,
  modelHref,
  filterHref,
}: {
  payload: VerticalBrandBrowsePayload;
  catalogTitle: string;
  basePath: string;
  searchPath: string;
  modelHref: (slug: string) => string;
  filterHref: (slug: string) => string;
}) {
  const { brand, models, filters } = payload;
  const base = basePath.replace(/\/$/, "");
  const search = searchPath.replace(/\/$/, "");

  return (
    <article className="space-y-10">
      <header className="space-y-3">
        <p className={breadcrumbClass}>
          <Link href={base} className={breadcrumbLinkClass}>
            ← {catalogTitle}
          </Link>
          <span className="mx-2 text-bp-muted/70">·</span>
          <Link href="/" className={breadcrumbLinkClass}>
            Home
          </Link>
        </p>
        <h1 className="text-2xl font-semibold tracking-tight text-bp-text sm:text-3xl">
          {brand.name}
        </h1>
        <p className="text-bp-muted">
          {catalogTitle}: models and replacement parts for this brand.
        </p>
        <p className="text-sm text-bp-muted">
          <Link href={search} className={searchLinkClass}>
            Search this category
          </Link>
        </p>
      </header>

      <section className="space-y-3">
        <h2 className={sectionTitleClass}>Models ({models.length})</h2>
        {models.length === 0 ? (
          <p className="text-sm text-bp-muted">No models for this brand yet.</p>
        ) : (
          <ul className="overflow-hidden rounded-lg border border-bp-border bg-bp-surface">
            {models.map((m) => (
              <li key={m.slug}>
                <Link href={modelHref(m.slug)} className={linkRowClass}>
                  <span className="bp-code font-semibold text-bp-text">{m.model_number}</span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="space-y-3">
        <h2 className={sectionTitleClass}>Parts ({filters.length})</h2>
        {filters.length === 0 ? (
          <p className="text-sm text-bp-muted">No parts for this brand yet.</p>
        ) : (
          <ul className="overflow-hidden rounded-lg border border-bp-border bg-bp-surface">
            {filters.map((f) => (
              <li key={f.slug}>
                <Link href={filterHref(f.slug)} className={linkRowClass}>
                  <span className="bp-code font-semibold text-bp-text">{f.oem_part_number}</span>
                  {f.name && <span className="mt-1 block text-bp-muted">{f.name}</span>}
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>
    </article>
  );
}

export function assertVerticalBrandPayload(
  payload: VerticalBrandBrowsePayload | null,
): asserts payload is VerticalBrandBrowsePayload {
  if (!payload) notFound();
}
