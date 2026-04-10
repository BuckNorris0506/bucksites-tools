import {
  VerticalBrandHubPage,
  assertVerticalBrandPayload,
  verticalBrandHubMetadata,
} from "@/components/catalog/VerticalBrandHubPage";
import { getVerticalBrandBrowse } from "@/lib/catalog/browse";

export const dynamic = "force-dynamic";

type Props = { params: { slug: string } };

export async function generateMetadata({ params }: Props) {
  const payload = await getVerticalBrandBrowse("air_purifier", params.slug);
  return verticalBrandHubMetadata(payload, "Air purifier filters");
}

export default async function AirPurifierBrandPage({ params }: Props) {
  const payload = await getVerticalBrandBrowse("air_purifier", params.slug);
  assertVerticalBrandPayload(payload);
  return (
    <VerticalBrandHubPage
      payload={payload}
      catalogTitle="Air purifier filters"
      basePath="/air-purifier"
      searchPath="/air-purifier/search"
      modelHref={(s) => `/air-purifier/model/${s}`}
      filterHref={(s) => `/air-purifier/filter/${s}`}
    />
  );
}
