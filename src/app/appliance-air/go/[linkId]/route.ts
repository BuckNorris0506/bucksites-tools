import { NextRequest } from "next/server";
import { getApplianceAirRetailerLinkById } from "@/lib/data/appliance-air/retailers";
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
    return goFallbackRedirect(request, "/appliance-air");
  }

  let target: string | null = null;
  let retailerKey: string | null = null;
  let classification: string | undefined = undefined;

  try {
    const row = await getApplianceAirRetailerLinkById(linkId);
    target = row?.affiliate_url ?? null;
    retailerKey = row?.retailer_key ?? null;
    classification = row?.browser_truth_classification ?? undefined;
  } catch {
    return goFallbackRedirect(request, "/appliance-air");
  }

  if (!target) {
    return goFallbackRedirect(request, "/appliance-air");
  }

  const go = nextResponseRedirectAffiliateIfSafe(
    retailerKey,
    target,
    classification,
  );
  if (!go) {
    return goFallbackRedirect(request, "/appliance-air");
  }

  await logClickEventForGoRoute(
    request,
    go,
    { appliance_air_retailer_link_id: linkId },
    "[go/appliance-air]",
  );

  return go.response;
}
