import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { VerticalModelPageContent } from "@/components/vertical/VerticalModelPageContent";
import { MODEL_PAGE_FIT_CONFIRMATION } from "@/lib/copy/vertical-fit";
import { getHumidifierModelBySlug } from "@/lib/data/humidifier/models";

export const dynamic = "force-dynamic";

type Props = { params: { slug: string } };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const model = await getHumidifierModelBySlug(params.slug);
  if (!model) {
    return { title: "Model not found" };
  }
  return {
    title: `${model.model_number} humidifier filters`,
    description: `Replacement filters for ${model.brand.name} model ${model.model_number}.`,
  };
}

export default async function HumidifierModelPage({ params }: Props) {
  const model = await getHumidifierModelBySlug(params.slug);
  if (!model) notFound();

  return (
    <VerticalModelPageContent
      brandName={model.brand.name}
      modelNumber={model.model_number}
      title={model.title}
      series={model.series}
      notes={model.notes}
      filters={model.filters}
      filterBasePath="/humidifier/filter"
      goBase="/humidifier/go"
      searchHref="/humidifier/search"
      fitConfirmation={MODEL_PAGE_FIT_CONFIRMATION}
      wayfinding={
        <p className="text-sm text-neutral-500 dark:text-neutral-400">
          <Link
            href="/humidifier/search"
            className="hover:text-neutral-800 dark:hover:text-neutral-200"
          >
            Search
          </Link>
          <span className="mx-2">·</span>
          <span>{model.brand.name}</span>
        </p>
      }
    />
  );
}
