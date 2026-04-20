import { NextRequest } from "next/server";
import { getVacuumRetailerLinkById } from "@/lib/data/vacuum/retailers";
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
    return goFallbackRedirect(request, "/vacuum");
  }

  let target: string | null = null;
  let retailerKey: string | null = null;
  let classification: string | undefined = undefined;

  try {
    const row = await getVacuumRetailerLinkById(linkId);
    target = row?.affiliate_url ?? null;
    retailerKey = row?.retailer_key ?? null;
    classification = row?.browser_truth_classification ?? undefined;
  } catch {
    return goFallbackRedirect(request, "/vacuum");
  }

  if (!target) {
    return goFallbackRedirect(request, "/vacuum");
  }

  const go = nextResponseRedirectAffiliateIfSafe(
    retailerKey,
    target,
    classification,
  );
  if (!go) {
    return goFallbackRedirect(request, "/vacuum");
  }

  await logClickEventForGoRoute(
    request,
    go,
    { vacuum_retailer_link_id: linkId },
    "[go/vacuum]",
  );

  return go.response;
}
