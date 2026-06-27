/**
 * CLI stdout JSON report for BuckParts Agent Contract v1.
 */

import path from "node:path";
import { fileURLToPath } from "node:url";

import { buildAgentContractProjectionV1 } from "./lib/buckparts-agent-contract-v1";

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

const report = buildAgentContractProjectionV1({ rootDir });
process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);
