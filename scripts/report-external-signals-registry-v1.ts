#!/usr/bin/env tsx
/**
 * Read-only external signals registry report (stdout JSON).
 */

import path from "node:path";

import { buildExternalSignalsCommandCenterLaneV1 } from "./lib/external-signals-command-center-v1";
import { buildExternalSignalsRegistryV1 } from "./lib/external-signals-registry-v1";

const rootDir = process.cwd();

const registry = buildExternalSignalsRegistryV1({ rootDir });
const lane = buildExternalSignalsCommandCenterLaneV1({ rootDir, registry });

process.stdout.write(
  `${JSON.stringify(
    {
      registry,
      command_center_lane: lane,
    },
    null,
    2,
  )}\n`,
);
