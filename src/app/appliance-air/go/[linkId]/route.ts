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
    return goFallbackRedirect(request, "/go-unavailable");
  }

  let target: string | null = null;
  let retailerKey: string | null = null;
  let classification: string | undefined = undefined;
  let buyableSubtype: string | null = null;
  let checkedAt: string | null = null;
  let browserTruthNotes: string | null = null;

  try {
    const row = await getApplianceAirRetailerLinkById(linkId);
    target = row?.affiliate_url ?? null;
    retailerKey = row?.retailer_key ?? null;
    classification = row?.browser_truth_classification ?? undefined;
    buyableSubtype = row?.browser_truth_buyable_subtype ?? null;
    checkedAt = row?.browser_truth_checked_at ?? null;
    browserTruthNotes = row?.browser_truth_notes ?? null;
  } catch {
    return goFallbackRedirect(request, "/go-unavailable");
  }

  if (!target) {
    return goFallbackRedirect(request, "/go-unavailable");
  }

  const go = nextResponseRedirectAffiliateIfSafe(
    retailerKey,
    target,
    classification,
    buyableSubtype,
    checkedAt,
    browserTruthNotes,
  );
  if (!go) {
    return goFallbackRedirect(request, "/go-unavailable");
  }

  await logClickEventForGoRoute(
    request,
    go,
    { appliance_air_retailer_link_id: linkId },
    "[go/appliance-air]",
  );

  return go.response;
}
