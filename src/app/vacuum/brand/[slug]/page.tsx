import {
  VerticalBrandHubPage,
  assertVerticalBrandPayload,
  verticalBrandHubMetadata,
} from "@/components/catalog/VerticalBrandHubPage";
import { getVerticalBrandBrowse } from "@/lib/catalog/browse";

export const dynamic = "force-dynamic";

type Props = { params: { slug: string } };

export async function generateMetadata({ params }: Props) {
  const payload = await getVerticalBrandBrowse("vacuum", params.slug);
  return verticalBrandHubMetadata(payload, "Vacuum filters");
}

export default async function VacuumBrandPage({ params }: Props) {
  const payload = await getVerticalBrandBrowse("vacuum", params.slug);
  assertVerticalBrandPayload(payload);
  return (
    <VerticalBrandHubPage
      payload={payload}
      catalogTitle="Vacuum filters"
      basePath="/vacuum"
      searchPath="/vacuum/search"
      modelHref={(s) => `/vacuum/model/${s}`}
      filterHref={(s) => `/vacuum/filter/${s}`}
    />
  );
}
