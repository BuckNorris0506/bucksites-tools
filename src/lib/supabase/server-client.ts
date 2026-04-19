import { createClient, SupabaseClient } from "@supabase/supabase-js";

/**
 * Next.js 14+ patches `fetch` and may cache GETs used by `@supabase/supabase-js`.
 * List queries (e.g. `retailer_links?filter_id=eq...`) share a stable URL and can stay
 * stale after DB writes, while by-id queries (e.g. `/go/[uuid]`) use a different key and
 * look “fresh” — producing buyer-path mismatches. Force no-store for all server reads.
 */
function supabaseServerFetch(input: RequestInfo | URL, init?: RequestInit): Promise<Response> {
  return fetch(input, {
    ...init,
    cache: "no-store",
  });
}

/**
 * Server-only Supabase client (Route Handlers, Server Components, server actions).
 * Uses the anon key; pair with RLS policies in Supabase.
 */
export function getSupabaseServerClient(): SupabaseClient {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anon) {
    throw new Error(
      "Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY",
    );
  }
  return createClient(url, anon, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: { fetch: supabaseServerFetch },
  });
}
