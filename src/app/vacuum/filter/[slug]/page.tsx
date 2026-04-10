import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { VerticalFilterPageContent } from "@/components/vertical/VerticalFilterPageContent";
import { FILTER_PAGE_FIT_CONFIRMATION } from "@/lib/copy/vertical-fit";
import { getVacuumFilterBySlug } from "@/lib/data/vacuum/filters";

export const dynamic = "force-dynamic";

type Props = { params: { slug: string } };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const filter = await getVacuumFilterBySlug(params.slug);
  if (!filter) {
    return { title: "Filter not found" };
  }
  return {
    title: `${filter.oem_part_number} vacuum filter`,
    description: `OEM ${filter.oem_part_number}. Compatible vacuum models.`,
  };
}

export default async function VacuumFilterPage({ params }: Props) {
  const filter = await getVacuumFilterBySlug(params.slug);
  if (!filter) notFound();

  return (
    <VerticalFilterPageContent
      brandName={filter.brand.name}
      oemPartNumber={filter.oem_part_number}
      name={filter.name}
      replacementIntervalMonths={filter.replacement_interval_months}
      notes={filter.notes}
      models={filter.models}
      modelBasePath="/vacuum/model"
      retailerLinks={filter.retailer_links}
      goBase="/vacuum/go"
      searchHref="/vacuum/search"
      fitConfirmation={FILTER_PAGE_FIT_CONFIRMATION}
      wayfinding={
        <p className="text-sm text-neutral-500 dark:text-neutral-400">
          <Link href="/vacuum/search" className="hover:text-neutral-800 dark:hover:text-neutral-200">
            Search
          </Link>
          <span className="mx-2">·</span>
          <span>{filter.brand.name}</span>
        </p>
      }
    />
  );
}
