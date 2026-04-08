import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { BuyLinks } from "@/components/BuyLinks";
import { Prose } from "@/components/Prose";
import { getFridgeBySlug } from "@/lib/data/fridges";

export const dynamic = "force-dynamic";

type Props = { params: { slug: string } };

function intervalLabel(months: number | null | undefined): string | null {
  if (months == null || months <= 0) return null;
  if (months === 1) return "About every month";
  return `About every ${months} months`;
}

/** Header line when all mapped filters agree on interval (interval lives on filters, not fridges). */
function sharedFilterIntervalLabel(
  filters: { replacement_interval_months: number | null }[],
): string | null {
  const months = filters
    .map((f) => f.replacement_interval_months)
    .filter((m): m is number => m != null && m > 0);
  if (months.length === 0) return null;
  const unique = Array.from(new Set(months));
  if (unique.length !== 1) return null;
  return intervalLabel(unique[0]);
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const fridge = await getFridgeBySlug(params.slug);
  if (!fridge) {
    return { title: "Model not found" };
  }
  const title = `${fridge.model_number} water filter`;
  return {
    title,
    description: `Compatible water filters and replacement schedule for ${fridge.brand.name} model ${fridge.model_number}.`,
    openGraph: { title: `${fridge.model_number} · ${fridge.brand.name}` },
  };
}

export default async function FridgePage({ params }: Props) {
  const fridge = await getFridgeBySlug(params.slug);
  if (!fridge) notFound();

  const fridgeInterval = sharedFilterIntervalLabel(fridge.filters);

  return (
    <article className="space-y-8">
      <header className="space-y-2">
        <p className="text-sm text-neutral-500">
          <Link
            href={`/brand/${fridge.brand.slug}`}
            className="hover:text-neutral-700 dark:hover:text-neutral-300"
          >
            {fridge.brand.name}
          </Link>
        </p>
        <h1 className="text-2xl font-semibold tracking-tight text-neutral-900 dark:text-neutral-50">
          {fridge.model_number}
        </h1>
        {fridgeInterval && (
          <p className="text-sm text-neutral-700 dark:text-neutral-300">
            Suggested replacement: {fridgeInterval}
          </p>
        )}
        <Prose>{fridge.notes}</Prose>
        <Link
          href={`/help/reset-water-filter-light/${fridge.brand.slug}`}
          className="inline-block text-sm font-medium text-neutral-900 underline dark:text-neutral-100"
        >
          Reset water filter indicator →
        </Link>
      </header>

      <section className="space-y-4">
        <h2 className="text-lg font-medium text-neutral-900 dark:text-neutral-100">
          Compatible filters
        </h2>
        {fridge.filters.length === 0 ? (
          <p className="text-sm text-neutral-600 dark:text-neutral-400">
            No compatible filters mapped yet in the database.
          </p>
        ) : (
          <ul className="space-y-6">
            {fridge.filters.map((f) => {
              const fInterval = intervalLabel(f.replacement_interval_months);
              return (
                <li
                  key={f.id}
                  className="rounded-lg border border-neutral-200 bg-white p-4 dark:border-neutral-800 dark:bg-neutral-950"
                >
                  <div className="flex flex-wrap items-baseline gap-2">
                    <Link
                      href={`/filter/${f.slug}`}
                      className="font-mono text-base font-medium text-neutral-900 dark:text-neutral-100"
                    >
                      {f.oem_part_number}
                    </Link>
                    {f.name && (
                      <span className="text-sm text-neutral-600 dark:text-neutral-400">
                        {f.name}
                      </span>
                    )}
                  </div>
                  {fInterval && (
                    <p className="mt-2 text-sm text-neutral-700 dark:text-neutral-300">
                      Replacement interval: {fInterval}
                    </p>
                  )}
                  <div className="mt-2">
                    <Prose>{f.notes}</Prose>
                  </div>
                  <div className="mt-4">
                    <p className="mb-2 text-xs font-medium uppercase tracking-wide text-neutral-500">
                      Buy
                    </p>
                    <BuyLinks links={f.retailer_links} />
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      {fridge.reset_instructions.length > 0 && (
        <section className="space-y-3">
          <h2 className="text-lg font-medium text-neutral-900 dark:text-neutral-100">
            {fridge.brand.name} reset instructions
          </h2>
          {fridge.reset_instructions.map((r) => (
            <div
              key={r.id}
              className="rounded-lg border border-neutral-200 bg-neutral-50 p-4 dark:border-neutral-800 dark:bg-neutral-900/50"
            >
              {r.title && (
                <h3 className="font-medium text-neutral-900 dark:text-neutral-100">
                  {r.title}
                </h3>
              )}
              <Prose>{r.body_markdown}</Prose>
            </div>
          ))}
        </section>
      )}
    </article>
  );
}
