import {
  VerticalBrandHubPage,
  assertVerticalBrandPayload,
  verticalBrandHubMetadata,
} from "@/components/catalog/VerticalBrandHubPage";
import { getVerticalBrandBrowse } from "@/lib/catalog/browse";

export const dynamic = "force-dynamic";

type Props = { params: { slug: string } };

export async function generateMetadata({ params }: Props) {
  const payload = await getVerticalBrandBrowse("whole_house_water", params.slug);
  return verticalBrandHubMetadata(payload, "Whole-house water filters");
}

export default async function WholeHouseWaterBrandPage({ params }: Props) {
  const payload = await getVerticalBrandBrowse("whole_house_water", params.slug);
  assertVerticalBrandPayload(payload);
  return (
    <VerticalBrandHubPage
      payload={payload}
      catalogTitle="Whole-house water filters"
      basePath="/whole-house-water"
      searchPath="/whole-house-water/search"
      modelHref={(s) => `/whole-house-water/model/${s}`}
      filterHref={(s) => `/whole-house-water/filter/${s}`}
    />
  );
}
