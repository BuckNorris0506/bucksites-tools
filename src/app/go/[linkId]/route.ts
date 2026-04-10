import { NextRequest, NextResponse } from "next/server";
import { getSupabaseServerClient } from "@/lib/supabase/server-client";
import { getRetailerLinkById } from "@/lib/data/retailers";

export const dynamic = "force-dynamic";

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function isSafeRedirectUrl(url: string): boolean {
  try {
    const u = new URL(url);
    return u.protocol === "https:" || u.protocol === "http:";
  } catch {
    return false;
  }
}

/**
 * Legacy fridge wedge: logs `click_events` with filter_id + retailer_slug + page_type/page_slug
 * (no retailer_link_id column). Then redirects to the retailer URL.
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ linkId: string }> },
) {
  const { linkId } = await params;
  const base = new URL(request.url).origin;

  if (!UUID_RE.test(linkId)) {
    return NextResponse.redirect(new URL("/", base), 302);
  }

  let row: Awaited<ReturnType<typeof getRetailerLinkById>> = null;
  try {
    row = await getRetailerLinkById(linkId);
  } catch {
    return NextResponse.redirect(new URL("/", base), 302);
  }

  const target = row?.affiliate_url ?? null;
  if (!row || !target || !isSafeRedirectUrl(target)) {
    return NextResponse.redirect(new URL("/", base), 302);
  }

  try {
    const supabase = getSupabaseServerClient();
    const pageSlug = row.filter_slug?.trim() || "unknown";
    const { error: insErr } = await supabase.from("click_events").insert({
      filter_id: row.filter_id,
      retailer_slug: row.retailer_key,
      page_type: "refrigerator_filter",
      page_slug: pageSlug,
      user_agent: request.headers.get("user-agent"),
      referrer: request.headers.get("referer"),
    });
    if (insErr) {
      console.error("[go/fridge] click_events insert failed:", insErr.message);
    }
  } catch (e) {
    console.error("[go/fridge] click_events insert exception:", e);
  }

  return NextResponse.redirect(target, 302);
}
