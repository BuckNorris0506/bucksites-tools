/**
 * Read-only: print JSON packet for human Amazon PDP verification (no fetch, no DB writes).
 *
 *   node --import tsx scripts/report-amazon-rescue-human-verification-packet.ts
 *   node --import tsx scripts/report-amazon-rescue-human-verification-packet.ts --tokens ADQ75795101,DA97-08006B
 */

import { fileURLToPath } from "node:url";
import path from "node:path";

import { resolveRefrigeratorFilterRowFromQueueToken } from "@/lib/data/resolve-refrigerator-filter-from-queue-token";
import {
  AMAZON_RESCUE_HUMAN_VERIFICATION_DEFAULT_TOKENS,
  buildAmazonRescueHumanVerificationPacketV1,
  normalizeTokenList,
  type ResolvedRowInputV1,
} from "./lib/amazon-rescue-human-verification-packet-v1";
import { loadEnv } from "./lib/load-env";
import { getSupabaseAdmin } from "./lib/supabase-admin";

function parseTokensArg(): string[] {
  const idx = process.argv.indexOf("--tokens");
  if (idx === -1 || !process.argv[idx + 1]) {
    return [...AMAZON_RESCUE_HUMAN_VERIFICATION_DEFAULT_TOKENS];
  }
  return process.argv[idx + 1]!.split(",").map((t) => t.trim()).filter(Boolean);
}

export async function runReportAmazonRescueHumanVerificationPacket(): Promise<unknown> {
  loadEnv();
  const supabase = getSupabaseAdmin();
  const { use, excluded } = normalizeTokenList(parseTokensArg());
  const rows: ResolvedRowInputV1[] = [];
  for (const token of use) {
    const resolved = await resolveRefrigeratorFilterRowFromQueueToken(supabase, token);
    if (!resolved.ok) {
      rows.push({
        token,
        canonical_slug: null,
        filter_id: null,
        resolution_via: null,
        resolution_error: resolved.reason === "ambiguous" ? (resolved.detail ?? resolved.reason) : (resolved.detail ?? resolved.reason),
      });
      continue;
    }
    rows.push({
      token,
      canonical_slug: resolved.row.slug,
      filter_id: resolved.row.id,
      resolution_via: resolved.via,
      resolution_error: null,
    });
  }
  return buildAmazonRescueHumanVerificationPacketV1({
    generated_at: new Date().toISOString(),
    rows,
    excluded_tokens: excluded,
  });
}

async function main(): Promise<void> {
  const packet = await runReportAmazonRescueHumanVerificationPacket();
  process.stdout.write(`${JSON.stringify(packet, null, 2)}\n`);
}

const THIS_FILE = fileURLToPath(import.meta.url);
if (process.argv[1] && path.resolve(process.argv[1]) === THIS_FILE) {
  main().catch((e) => {
    console.error(e);
    process.exit(1);
  });
}
