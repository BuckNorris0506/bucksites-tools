/**
 * Append one read-only customer authority history snapshot from the current Command Center build.
 * Does not replace next_best_action or mutate product data.
 */

import path from "node:path";
import { pathToFileURL } from "node:url";

import { buildBuckpartsCommandCenterReport } from "./report-buckparts-command-center";

export async function runCustomerAuthorityHistoryReportV1(): Promise<void> {
  const report = await buildBuckpartsCommandCenterReport({
    inlineLiveSiteSmokeFallback: true,
    writeAuthorityHistory: true,
  });
  const status = report.command_center_v2.customer_authority_history_status_v1;
  process.stdout.write(`${JSON.stringify(status, null, 2)}\n`);
}

const entryHref = pathToFileURL(path.resolve(process.argv[1] ?? "")).href;
if (import.meta.url === entryHref) {
  runCustomerAuthorityHistoryReportV1().catch((error) => {
    console.error("[report-customer-authority-history-v1] failed", error);
    process.exit(1);
  });
}
