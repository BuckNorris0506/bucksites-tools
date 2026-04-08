import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Prose } from "@/components/Prose";
import { getResetInstructionsForBrandSlug } from "@/lib/data/help";

export const dynamic = "force-dynamic";

type Props = { params: { brandSlug: string } };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const data = await getResetInstructionsForBrandSlug(params.brandSlug);
  if (!data) {
    return { title: "Brand not found" };
  }
  const title = `Reset water filter light — ${data.brand.name}`;
  return {
    title,
    description: `How to reset the water filter indicator on ${data.brand.name} refrigerators.`,
    openGraph: { title },
  };
}

export default async function ResetLightPage({ params }: Props) {
  const data = await getResetInstructionsForBrandSlug(params.brandSlug);
  if (!data) notFound();

  const { brand, instructions } = data;

  return (
    <article className="space-y-6">
      <header className="space-y-2">
        <p className="text-sm text-neutral-500">
          <Link href={`/brand/${brand.slug}`} className="hover:underline">
            {brand.name}
          </Link>
        </p>
        <h1 className="text-2xl font-semibold text-neutral-900 dark:text-neutral-50">
          Reset water filter light
        </h1>
        <p className="text-sm text-neutral-600 dark:text-neutral-400">
          Steps for clearing the “change filter” or similar indicator after
          installing a new cartridge.
        </p>
      </header>

      {instructions.length === 0 ? (
        <p className="text-sm text-neutral-600 dark:text-neutral-400">
          No reset instructions on file for this brand yet. Check your owner
          manual or the filter housing label.
        </p>
      ) : (
        <div className="space-y-6">
          {instructions.map((inst) => (
            <section
              key={inst.id}
              className="rounded-lg border border-neutral-200 bg-white p-4 dark:border-neutral-800 dark:bg-neutral-950"
            >
              {inst.title && (
                <h2 className="text-lg font-medium text-neutral-900 dark:text-neutral-100">
                  {inst.title}
                </h2>
              )}
              <div className="mt-2">
                <Prose>{inst.body_markdown}</Prose>
              </div>
            </section>
          ))}
        </div>
      )}
    </article>
  );
}
