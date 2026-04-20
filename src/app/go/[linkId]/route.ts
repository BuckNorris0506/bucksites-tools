import { NextRequest } from "next/server";
import { getRetailerLinkById } from "@/lib/data/retailers";
import {
  GO_LINK_UUID_RE,
  goFallbackRedirect,
  logClickEventForGoRoute,
  nextResponseRedirectAffiliateIfSafe,
} from "@/lib/retailers/go-affiliate-route-handler";

export const dynamic = "force-dynamic";

/**
 * Legacy fridge wedge: `click_events` uses filter_id + retailer_slug + page_type/page_slug
 * (no retailer_link_id). Outbound truth is `target_url` = `go.outboundUrl` (see handler).
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ linkId: string }> },
) {
  const { linkId } = await params;

  if (!GO_LINK_UUID_RE.test(linkId)) {
    return goFallbackRedirect(request, "/");
  }

  let row: Awaited<ReturnType<typeof getRetailerLinkById>> = null;
  try {
    row = await getRetailerLinkById(linkId);
  } catch {
    return goFallbackRedirect(request, "/");
  }

  const target = row?.affiliate_url ?? null;
  if (!row || !target) {
    return goFallbackRedirect(request, "/");
  }

    const go = nextResponseRedirectAffiliateIfSafe(
    row.retailer_key,
    target,
    row.browser_truth_classification ?? undefined,
  );
  if (!go) {
    return goFallbackRedirect(request, "/");
  }

  await logClickEventForGoRoute(
    request,
    go,
    {
      filter_id: row.filter_id,
      retailer_slug: row.retailer_key,
      page_type: "refrigerator_filter",
      page_slug: row.filter_slug?.trim() || "unknown",
    },
    "[go/fridge]",
  );

  return go.response;
}
