import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Prose } from "@/components/Prose";
import { getHelpPageBySlug } from "@/lib/data/help";

export const dynamic = "force-dynamic";

type Props = { params: { slug: string } };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const page = await getHelpPageBySlug(params.slug);
  if (!page) {
    return { title: "Help article not found" };
  }
  return {
    title: page.title,
    description: page.meta_description ?? page.title,
    openGraph: { title: page.title },
  };
}

export default async function HelpArticlePage({ params }: Props) {
  const page = await getHelpPageBySlug(params.slug);
  if (!page) notFound();

  return (
    <article className="space-y-4">
      <h1 className="text-2xl font-semibold text-neutral-900 dark:text-neutral-50">
        {page.title}
      </h1>
      <Prose>{page.body}</Prose>
    </article>
  );
}
