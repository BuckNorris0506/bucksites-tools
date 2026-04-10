import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getBrandBySlug } from "@/lib/data/brands";
import { listFiltersByBrand } from "@/lib/data/filters";
import { listFridgeModelsByBrand } from "@/lib/data/fridges";
import { SITE_DISPLAY_NAME } from "@/lib/site-brand";

export const dynamic = "force-dynamic";

type Props = { params: { slug: string } };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const brand = await getBrandBySlug(params.slug);
  if (!brand) {
    return { title: "Brand not found" };
  }
  return {
    title: `${brand.name} water filters`,
    description: `Refrigerator models and OEM water filters for ${brand.name}.`,
    openGraph: { title: `${brand.name} · ${SITE_DISPLAY_NAME}` },
  };
}

export default async function BrandPage({ params }: Props) {
  const brand = await getBrandBySlug(params.slug);
  if (!brand) notFound();

  const [fridges, filters] = await Promise.all([
    listFridgeModelsByBrand(brand.id),
    listFiltersByBrand(brand.id),
  ]);

  return (
    <article className="space-y-8">
      <header className="space-y-1">
        <h1 className="text-2xl font-semibold text-neutral-900 dark:text-neutral-50">
          {brand.name}
        </h1>
        <p className="text-sm text-neutral-600 dark:text-neutral-400">
          Models and filters for this brand.
        </p>
        <Link
          href={`/help/reset-water-filter-light/${brand.slug}`}
          className="inline-block text-sm text-neutral-700 underline dark:text-neutral-300"
        >
          Reset water filter light →
        </Link>
      </header>

      <section className="space-y-2">
        <h2 className="text-sm font-medium uppercase tracking-wide text-neutral-500">
          Refrigerator models ({fridges.length})
        </h2>
        {fridges.length === 0 ? (
          <p className="text-sm text-neutral-600 dark:text-neutral-400">
            No models listed yet.
          </p>
        ) : (
          <ul className="divide-y divide-neutral-200 rounded-lg border border-neutral-200 dark:divide-neutral-800 dark:border-neutral-800">
            {fridges.map((f) => (
              <li key={f.id}>
                <Link
                  href={`/fridge/${f.slug}`}
                  className="block px-4 py-2.5 text-sm hover:bg-neutral-50 dark:hover:bg-neutral-900"
                >
                  {f.model_number}
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="space-y-2">
        <h2 className="text-sm font-medium uppercase tracking-wide text-neutral-500">
          Filters ({filters.length})
        </h2>
        {filters.length === 0 ? (
          <p className="text-sm text-neutral-600 dark:text-neutral-400">
            No filters listed yet.
          </p>
        ) : (
          <ul className="divide-y divide-neutral-200 rounded-lg border border-neutral-200 dark:divide-neutral-800 dark:border-neutral-800">
            {filters.map((f) => (
              <li key={f.id}>
                <Link
                  href={`/filter/${f.slug}`}
                  className="block px-4 py-2.5 text-sm hover:bg-neutral-50 dark:hover:bg-neutral-900"
                >
                  <span className="font-mono">{f.oem_part_number}</span>
                  {f.name && (
                    <span className="ml-2 text-neutral-600 dark:text-neutral-400">
                      {f.name}
                    </span>
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
