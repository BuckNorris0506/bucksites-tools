/**
 * Deletes legacy demo placeholder brands from public.brands. ON DELETE CASCADE removes
 * air_purifier_* and whole_house_water_* rows tied to purebrand / poewat (not in CSV packs).
 *
 * Env: NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY (.env.local)
 *
 * Usage: npx tsx scripts/remove-demo-wedge-brands.ts
 */
import { loadEnv } from "./lib/load-env";
import { getSupabaseAdmin } from "./lib/supabase-admin";
import { log } from "./lib/log";

const DEMO_BRAND_SLUGS = ["purebrand", "poewat"] as const;

loadEnv();

async function main() {
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from("brands")
    .delete()
    .in("slug", [...DEMO_BRAND_SLUGS])
    .select("slug");

  if (error) throw error;
  const removed = (data ?? []).map((r) => r.slug as string);
  log(
    "remove-demo-wedge-brands",
    `Deleted ${removed.length} brand row(s): ${removed.length ? removed.join(", ") : "(none — already clean)"}`,
  );
}

main().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
