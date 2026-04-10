import {
  VerticalBrandHubPage,
  assertVerticalBrandPayload,
  verticalBrandHubMetadata,
} from "@/components/catalog/VerticalBrandHubPage";
import { getVerticalBrandBrowse } from "@/lib/catalog/browse";

export const dynamic = "force-dynamic";

type Props = { params: { slug: string } };

export async function generateMetadata({ params }: Props) {
  const payload = await getVerticalBrandBrowse("humidifier", params.slug);
  return verticalBrandHubMetadata(payload, "Humidifier filters");
}

export default async function HumidifierBrandPage({ params }: Props) {
  const payload = await getVerticalBrandBrowse("humidifier", params.slug);
  assertVerticalBrandPayload(payload);
  return (
    <VerticalBrandHubPage
      payload={payload}
      catalogTitle="Humidifier filters"
      basePath="/humidifier"
      searchPath="/humidifier/search"
      modelHref={(s) => `/humidifier/model/${s}`}
      filterHref={(s) => `/humidifier/filter/${s}`}
    />
  );
}
