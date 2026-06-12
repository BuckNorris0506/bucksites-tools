/**
 * Read-only CLI: validate ap_hyperagent_chat_discovery_output_v1 packet JSON (stdout only).
 *
 * Usage:
 *   node --import tsx scripts/report-ap-hyperagent-chat-discovery-validation-v1.ts \
 *     --packet=data/air-purifier/batch-production/fixtures/ap-hyperagent-chat-discovery-holmes-hapf30-corrected-v1.json \
 *     --scope=holmes-hapf30
 */

import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import {
  parseApHyperagentChatDiscoveryValidationCliArgsV1,
  validateApHyperagentChatDiscoveryOutputV1,
  type ApHyperagentChatDiscoveryOutputV1,
} from "./lib/air-purifier-hyperagent-chat-discovery-validation-v1";

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

function main(): void {
  const { packetPath, approvedScopeSlugs } = parseApHyperagentChatDiscoveryValidationCliArgsV1(
    process.argv.slice(2),
  );
  if (!packetPath) {
    process.stderr.write(
      "Missing --packet=<path-to-ap_hyperagent_chat_discovery_output_v1.json>\n",
    );
    process.exit(1);
  }

  const abs = path.isAbsolute(packetPath) ? packetPath : path.join(rootDir, packetPath);
  if (!existsSync(abs)) {
    process.stderr.write(`Packet not found: ${packetPath}\n`);
    process.exit(1);
  }

  const packet = JSON.parse(readFileSync(abs, "utf8")) as ApHyperagentChatDiscoveryOutputV1;
  const scope =
    approvedScopeSlugs ??
    packet.candidate_rows.map((row) => row.filter_slug.trim()).filter(Boolean);

  const result = validateApHyperagentChatDiscoveryOutputV1({
    packet,
    approved_scope_slugs: scope,
    rootDir,
  });

  process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
  if (result.validation_status === "VALIDATION_FAIL") {
    process.exit(1);
  }
}

main();
