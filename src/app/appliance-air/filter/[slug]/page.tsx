import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { VerticalFilterPageContent } from "@/components/vertical/VerticalFilterPageContent";
import { FILTER_PAGE_FIT_CONFIRMATION } from "@/lib/copy/vertical-fit";
import { getApplianceAirPartBySlug } from "@/lib/data/appliance-air/filters";

export const dynamic = "force-dynamic";

type Props = { params: { slug: string } };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const part = await getApplianceAirPartBySlug(params.slug);
  if (!part) return { title: "Part not found" };
  return {
    title: `${part.oem_part_number} appliance air filter`,
    description: `OEM ${part.oem_part_number}. Compatible appliance models.`,
  };
}

export default async function ApplianceAirFilterPage({ params }: Props) {
  const part = await getApplianceAirPartBySlug(params.slug);
  if (!part) notFound();

  return (
    <VerticalFilterPageContent
      brandName={part.brand.name}
      filterSlug={part.slug}
      oemPartNumber={part.oem_part_number}
      name={part.name}
      replacementIntervalMonths={part.replacement_interval_months}
      notes={part.notes}
      models={part.models}
      modelBasePath="/appliance-air/model"
      retailerLinks={part.retailer_links}
      goBase="/appliance-air/go"
      searchHref="/appliance-air/search"
      fitConfirmation={FILTER_PAGE_FIT_CONFIRMATION}
      wayfinding={
        <p className="text-sm text-neutral-500 dark:text-neutral-400">
          <Link
            href="/appliance-air/search"
            className="hover:text-neutral-800 dark:hover:text-neutral-200"
          >
            Search
          </Link>
          <span className="mx-2">·</span>
          <span>{part.brand.name}</span>
        </p>
      }
    />
  );
}
