import { NextRequest, NextResponse } from "next/server";

import { getSupabaseServerClient } from "@/lib/supabase/server-client";
import type { GoAffiliateRedirectResult } from "@/lib/retailers/go-redirect-gate";

export {
  nextResponseRedirectAffiliateIfSafe,
  type GoAffiliateRedirectResult,
} from "@/lib/retailers/go-redirect-gate";

/** Shared link id validation for every `/go/[linkId]` route. */
export const GO_LINK_UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Wedge-local fallback when the link id or row is invalid (not the retailer hop). */
export function goFallbackRedirect(request: NextRequest, path: string): NextResponse {
  return NextResponse.redirect(new URL(path, new URL(request.url).origin), 302);
}

/**
 * Pure row shape for `click_events` on `/go`: wedge keys + canonical `target_url` + request
 * metadata. `target_url` always wins over any key in `wedgeKeys` (same string as `Location`).
 */
export function buildGoClickEventInsertRow(
  go: GoAffiliateRedirectResult,
  wedgeKeys: Record<string, unknown>,
  request: Pick<NextRequest, "headers">,
): Record<string, unknown> {
  return {
    ...wedgeKeys,
    target_url: go.outboundUrl,
    user_agent: request.headers.get("user-agent"),
    referrer: request.headers.get("referer"),
  };
}

/**
 * Single insert path for `/go` → `click_events`: merges wedge-specific columns with
 * mandatory `target_url` (always `go.outboundUrl`, same as redirect `Location`),
 * `user_agent`, and `referer`. Route files must not call `click_events` directly.
 */
export async function logClickEventForGoRoute(
  request: NextRequest,
  go: GoAffiliateRedirectResult,
  wedgeKeys: Record<string, unknown>,
  logPrefix: string,
): Promise<void> {
  try {
    const supabase = getSupabaseServerClient();
    const row = buildGoClickEventInsertRow(go, wedgeKeys, request);
    const { error: insErr } = await supabase.from("click_events").insert(row);
    if (insErr) {
      console.error(`${logPrefix} click_events insert failed:`, insErr.message);
    }
  } catch (e) {
    console.error(`${logPrefix} click_events insert exception:`, e);
  }
}
