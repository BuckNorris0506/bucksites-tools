import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { BuyLinks } from "@/components/BuyLinks";
import { Prose } from "@/components/Prose";
import { getFilterBySlug } from "@/lib/data/filters";

export const dynamic = "force-dynamic";

type Props = { params: { slug: string } };

function intervalLabel(months: number | null | undefined): string | null {
  if (months == null || months <= 0) return null;
  if (months === 1) return "About every month";
  return `About every ${months} months`;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const filter = await getFilterBySlug(params.slug);
  if (!filter) {
    return { title: "Filter not found" };
  }
  const title = `${filter.oem_part_number} refrigerator filter`;
  return {
    title,
    description: `OEM part ${filter.oem_part_number}. Compatible refrigerators and replacement interval.`,
    openGraph: { title: `${filter.oem_part_number} · BuckSites Tools` },
  };
}

export default async function FilterPage({ params }: Props) {
  const filter = await getFilterBySlug(params.slug);
  if (!filter) notFound();

  const interval = intervalLabel(filter.replacement_interval_months);

  return (
    <article className="space-y-8">
      <header className="space-y-2">
        <p className="text-sm text-neutral-500">
          <Link
            href={`/brand/${filter.brand.slug}`}
            className="hover:text-neutral-700 dark:hover:text-neutral-300"
          >
            {filter.brand.name}
          </Link>
        </p>
        <h1 className="font-mono text-2xl font-semibold tracking-tight text-neutral-900 dark:text-neutral-50">
          {filter.oem_part_number}
        </h1>
        {filter.name && (
          <p className="text-neutral-700 dark:text-neutral-300">{filter.name}</p>
        )}
        {interval && (
          <p className="text-sm text-neutral-700 dark:text-neutral-300">
            Replacement interval: {interval}
          </p>
        )}
        <Prose>{filter.notes}</Prose>
      </header>

      <section className="space-y-3">
        <h2 className="text-lg font-medium text-neutral-900 dark:text-neutral-100">
          Compatible refrigerator models
        </h2>
        {filter.fridge_models.length === 0 ? (
          <p className="text-sm text-neutral-600 dark:text-neutral-400">
            No models mapped yet.
          </p>
        ) : (
          <ul className="divide-y divide-neutral-200 rounded-lg border border-neutral-200 dark:divide-neutral-800 dark:border-neutral-800">
            {filter.fridge_models.map((m) => (
              <li key={m.id}>
                <Link
                  href={`/fridge/${m.slug}`}
                  className="block px-4 py-2.5 text-sm hover:bg-neutral-50 dark:hover:bg-neutral-900"
                >
                  <span className="font-medium text-neutral-900 dark:text-neutral-100">
                    {m.model_number}
                  </span>
                  <span className="ml-2 text-neutral-500">{m.brand.name}</span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-medium text-neutral-900 dark:text-neutral-100">
          Buy
        </h2>
        <BuyLinks links={filter.retailer_links} />
      </section>
    </article>
  );
}
