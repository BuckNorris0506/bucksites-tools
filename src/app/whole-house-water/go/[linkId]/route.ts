import { NextRequest, NextResponse } from "next/server";
import { getSupabaseServerClient } from "@/lib/supabase/server-client";
import { getWholeHouseWaterRetailerLinkById } from "@/lib/data/whole-house-water/retailers";

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

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ linkId: string }> },
) {
  const { linkId } = await params;
  const base = new URL(request.url).origin;

  if (!UUID_RE.test(linkId)) {
    return NextResponse.redirect(new URL("/whole-house-water", base), 302);
  }

  let target: string | null = null;
  try {
    const row = await getWholeHouseWaterRetailerLinkById(linkId);
    target = row?.affiliate_url ?? null;
  } catch {
    return NextResponse.redirect(new URL("/whole-house-water", base), 302);
  }

  if (!target || !isSafeRedirectUrl(target)) {
    return NextResponse.redirect(new URL("/whole-house-water", base), 302);
  }

  try {
    const supabase = getSupabaseServerClient();
    const { error: insErr } = await supabase.from("click_events").insert({
      whole_house_water_retailer_link_id: linkId,
      user_agent: request.headers.get("user-agent"),
      referrer: request.headers.get("referer"),
    });
    if (insErr) {
      console.error("[go/whole-house-water] click_events insert failed:", insErr.message);
    }
  } catch (e) {
    console.error("[go/whole-house-water] click_events insert exception:", e);
  }

  return NextResponse.redirect(target, 302);
}
