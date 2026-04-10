import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { VerticalFilterPageContent } from "@/components/vertical/VerticalFilterPageContent";
import {
  AIR_PURIFIER_FILTER_PAGE_INTRO,
  FILTER_PAGE_FIT_CONFIRMATION_AIR_PURIFIER,
} from "@/lib/copy/vertical-fit";
import { getAirPurifierFilterBySlug } from "@/lib/data/air-purifier/filters";

export const dynamic = "force-dynamic";

type Props = { params: { slug: string } };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const filter = await getAirPurifierFilterBySlug(params.slug);
  if (!filter) {
    return { title: "Filter not found" };
  }
  return {
    title: `${filter.oem_part_number} air purifier filter`,
    description: `Replacement cartridge ${filter.oem_part_number}${
      filter.brand.name ? ` (${filter.brand.name})` : ""
    }—which purifier models it fits, change interval if listed, and where to buy.`,
  };
}

export default async function AirPurifierFilterPage({ params }: Props) {
  const filter = await getAirPurifierFilterBySlug(params.slug);
  if (!filter) notFound();

  return (
    <VerticalFilterPageContent
      brandName={filter.brand.name}
      oemPartNumber={filter.oem_part_number}
      name={filter.name}
      replacementIntervalMonths={filter.replacement_interval_months}
      notes={filter.notes}
      models={filter.models}
      modelBasePath="/air-purifier/model"
      retailerLinks={filter.retailer_links}
      goBase="/air-purifier/go"
      searchHref="/air-purifier/search"
      fitConfirmation={FILTER_PAGE_FIT_CONFIRMATION_AIR_PURIFIER}
      utilityIntro={AIR_PURIFIER_FILTER_PAGE_INTRO}
      notesSectionTitle="Notes & next steps"
      expandedSearchFooter
      wayfinding={
        <p className="text-sm text-neutral-500 dark:text-neutral-400">
          <Link
            href="/air-purifier/search"
            className="hover:text-neutral-800 dark:hover:text-neutral-200"
          >
            Search
          </Link>
          <span className="mx-2">·</span>
          <span>{filter.brand.name}</span>
        </p>
      }
    />
  );
}
