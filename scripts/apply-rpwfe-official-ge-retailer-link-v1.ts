#!/usr/bin/env node
/**
 * Owner-authorized guarded CSV apply for RPWFE official GE only.
 * Pass --apply to mutate data/retailer_links.csv (single rpwfe row).
 */
import { executeRpwfeOfficialGeRetailerLinksApplyV1 } from "./lib/rpwfe-official-ge-retailer-links-apply-v1";

const apply = process.argv.includes("--apply");

const run = executeRpwfeOfficialGeRetailerLinksApplyV1({
  rootDir: process.cwd(),
  apply,
});

console.log(JSON.stringify(run, null, 2));
process.exit(run.apply_status === "BLOCKED" ? 1 : 0);
