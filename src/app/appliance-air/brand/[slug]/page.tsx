import {
  VerticalBrandHubPage,
  assertVerticalBrandPayload,
  verticalBrandHubMetadata,
} from "@/components/catalog/VerticalBrandHubPage";
import { getVerticalBrandBrowse } from "@/lib/catalog/browse";

export const dynamic = "force-dynamic";

type Props = { params: { slug: string } };

export async function generateMetadata({ params }: Props) {
  const payload = await getVerticalBrandBrowse("appliance_air", params.slug);
  return verticalBrandHubMetadata(payload, "Appliance air filters");
}

export default async function ApplianceAirBrandPage({ params }: Props) {
  const payload = await getVerticalBrandBrowse("appliance_air", params.slug);
  assertVerticalBrandPayload(payload);
  return (
    <VerticalBrandHubPage
      payload={payload}
      catalogTitle="Appliance air filters"
      basePath="/appliance-air"
      searchPath="/appliance-air/search"
      modelHref={(s) => `/appliance-air/model/${s}`}
      filterHref={(s) => `/appliance-air/filter/${s}`}
    />
  );
}
