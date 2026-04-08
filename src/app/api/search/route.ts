import { NextRequest, NextResponse } from "next/server";
import { searchCatalog } from "@/lib/data/search";

export const dynamic = "force-dynamic";

/**
 * JSON search API for future autocomplete or integrations.
 * Query: ?q=term (min length 2)
 */
export async function GET(request: NextRequest) {
  const q = request.nextUrl.searchParams.get("q") ?? "";
  try {
    const hits = await searchCatalog(q);
    return NextResponse.json({ query: q.trim(), hits });
  } catch (e) {
    const message =
      e instanceof Error ? e.message : "Search failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
