import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import type { VerticalBrandBrowsePayload } from "@/lib/catalog/browse";


const linkRow =
  "block border-b border-neutral-200 px-3 py-2.5 text-sm last:border-b-0 hover:bg-neutral-50 dark:border-neutral-800 dark:hover:bg-neutral-900/70";

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
        <p className="text-sm text-neutral-500 dark:text-neutral-400">
          <Link href={base} className="hover:text-neutral-800 dark:hover:text-neutral-200">
            ← {catalogTitle}
          </Link>
          <span className="mx-2 text-neutral-400 dark:text-neutral-500">·</span>
          <Link href="/" className="hover:text-neutral-800 dark:hover:text-neutral-200">
            Home
          </Link>
        </p>
        <h1 className="text-2xl font-semibold tracking-tight text-neutral-900 dark:text-neutral-50 sm:text-3xl">
          {brand.name}
        </h1>
        <p className="text-neutral-600 dark:text-neutral-400">
          {catalogTitle}: models and replacement parts for this brand.
        </p>
        <p className="text-sm text-neutral-500 dark:text-neutral-400">
          <Link
            href={search}
            className="font-medium text-neutral-900 underline-offset-2 hover:underline dark:text-neutral-100"
          >
            Search this category
          </Link>
        </p>
      </header>

      <section className="space-y-3">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-neutral-500 dark:text-neutral-400">
          Models ({models.length})
        </h2>
        {models.length === 0 ? (
          <p className="text-sm text-neutral-600 dark:text-neutral-400">No models for this brand yet.</p>
        ) : (
          <ul className="overflow-hidden rounded-lg border border-neutral-200 dark:border-neutral-800">
            {models.map((m) => (
              <li key={m.slug}>
                <Link href={modelHref(m.slug)} className={linkRow}>
                  <span className="font-mono font-medium text-neutral-900 dark:text-neutral-100">
                    {m.model_number}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="space-y-3">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-neutral-500 dark:text-neutral-400">
          Parts ({filters.length})
        </h2>
        {filters.length === 0 ? (
          <p className="text-sm text-neutral-600 dark:text-neutral-400">No parts for this brand yet.</p>
        ) : (
          <ul className="overflow-hidden rounded-lg border border-neutral-200 dark:border-neutral-800">
            {filters.map((f) => (
              <li key={f.slug}>
                <Link href={filterHref(f.slug)} className={linkRow}>
                  <span className="font-mono font-medium text-neutral-900 dark:text-neutral-100">
                    {f.oem_part_number}
                  </span>
                  {f.name && (
                    <span className="mt-1 block text-neutral-600 dark:text-neutral-400">{f.name}</span>
                  )}
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
