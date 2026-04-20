import { NextRequest } from "next/server";
import { getWholeHouseWaterRetailerLinkById } from "@/lib/data/whole-house-water/retailers";
import {
  GO_LINK_UUID_RE,
  goFallbackRedirect,
  logClickEventForGoRoute,
  nextResponseRedirectAffiliateIfSafe,
} from "@/lib/retailers/go-affiliate-route-handler";

export const dynamic = "force-dynamic";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ linkId: string }> },
) {
  const { linkId } = await params;

  if (!GO_LINK_UUID_RE.test(linkId)) {
    return goFallbackRedirect(request, "/whole-house-water");
  }

  let target: string | null = null;
  let retailerKey: string | null = null;
  let classification: string | undefined = undefined;

  try {
    const row = await getWholeHouseWaterRetailerLinkById(linkId);
    target = row?.affiliate_url ?? null;
    retailerKey = row?.retailer_key ?? null;
    classification = row?.browser_truth_classification ?? undefined;
  } catch {
    return goFallbackRedirect(request, "/whole-house-water");
  }

  if (!target) {
    return goFallbackRedirect(request, "/whole-house-water");
  }

  const go = nextResponseRedirectAffiliateIfSafe(
    retailerKey,
    target,
    classification,
  );
  if (!go) {
    return goFallbackRedirect(request, "/whole-house-water");
  }

  await logClickEventForGoRoute(
    request,
    go,
    { whole_house_water_retailer_link_id: linkId },
    "[go/whole-house-water]",
  );

  return go.response;
}
