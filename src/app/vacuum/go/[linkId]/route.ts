import { NextRequest, NextResponse } from "next/server";
import { getSupabaseServerClient } from "@/lib/supabase/server-client";
import { getVacuumRetailerLinkById } from "@/lib/data/vacuum/retailers";

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
  { params }: { params: { linkId: string } },
) {
  const { linkId } = params;
  const base = new URL(request.url).origin;

  if (!UUID_RE.test(linkId)) {
    return NextResponse.redirect(new URL("/vacuum", base), 302);
  }

  let target: string | null = null;
  try {
    const row = await getVacuumRetailerLinkById(linkId);
    target = row?.affiliate_url ?? null;
  } catch {
    return NextResponse.redirect(new URL("/vacuum", base), 302);
  }

  if (!target || !isSafeRedirectUrl(target)) {
    return NextResponse.redirect(new URL("/vacuum", base), 302);
  }

  try {
    const supabase = getSupabaseServerClient();
    await supabase.from("click_events").insert({
      vacuum_retailer_link_id: linkId,
      target_url: target,
      user_agent: request.headers.get("user-agent"),
      referrer: request.headers.get("referer"),
    });
  } catch {
    // Continue to retailer if logging fails
  }

  return NextResponse.redirect(target, 302);
}
