#!/usr/bin/env node
/**
 * BuckParts Runner v1 — mission orchestration CLI.
 *
 *   node --import tsx scripts/report-buckparts-runner-v1.ts --list-missions
 *   node --import tsx scripts/report-buckparts-runner-v1.ts --mission coverage_sprint_v1
 *   node --import tsx scripts/report-buckparts-runner-v1.ts --mission coverage_sprint_v1 --resume <run_id>
 */

import path from "node:path";
import { fileURLToPath } from "node:url";

import {
  BUCKPARTS_RUNNER_CONTRACT_V1,
  exitCodeForRunnerReportV1,
  getBuckpartsRunnerMissionV1,
  listBuckpartsRunnerMissionIdsV1,
  runBuckpartsRunnerV1,
  type BuckpartsRunnerMissionIdV1,
} from "./lib/buckparts-runner-v1";

const REPO_ROOT = path.resolve(path.join(path.dirname(fileURLToPath(import.meta.url)), ".."));

function parseCli(argv: string[]): {
  listMissions: boolean;
  missionId: BuckpartsRunnerMissionIdV1 | null;
  resumeRunId: string | null;
} {
  let listMissions = false;
  let missionId: BuckpartsRunnerMissionIdV1 | null = null;
  let resumeRunId: string | null = null;

  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === "--list-missions" || arg === "--list") {
      listMissions = true;
    } else if (arg === "--mission" && argv[i + 1]) {
      missionId = argv[i + 1] as BuckpartsRunnerMissionIdV1;
      i += 1;
    } else if (arg === "--resume" && argv[i + 1]) {
      resumeRunId = argv[i + 1]!;
      i += 1;
    }
  }

  return { listMissions, missionId, resumeRunId };
}

function main(): void {
  const cli = parseCli(process.argv.slice(2));

  if (cli.listMissions) {
    const missions = listBuckpartsRunnerMissionIdsV1().map((id) => {
      const m = getBuckpartsRunnerMissionV1(id)!;
      return {
        mission_id: m.mission_id,
        title: m.title,
        step_count: m.steps.length,
        validation_step_ids: m.validation_step_ids,
      };
    });
    process.stdout.write(
      `${JSON.stringify({ contract: BUCKPARTS_RUNNER_CONTRACT_V1, missions }, null, 2)}\n`,
    );
    return;
  }

  if (!cli.missionId) {
    process.stderr.write(
      "Usage: node --import tsx scripts/report-buckparts-runner-v1.ts --mission <coverage_sprint_v1|evidence_sprint_v1|safe_link_sprint_v1|production_mission_v1> [--resume <run_id>]\n",
    );
    process.exit(2);
    return;
  }

  try {
    const report = runBuckpartsRunnerV1({
      rootDir: REPO_ROOT,
      missionId: cli.missionId,
      resumeRunId: cli.resumeRunId,
    });

    process.stderr.write(
      `[buckparts-runner-v1] ${report.overall_status} — mission=${report.mission_id} run_id=${report.run_id}\n`,
    );
    process.stderr.write(`artifact: ${report.artifact_rel_path}\n`);
    process.stderr.write(`recommended_next_action: ${report.recommended_next_action}\n`);

    process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);
    process.exit(exitCodeForRunnerReportV1(report));
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    process.stderr.write(`${message}\n`);
    process.exit(2);
  }
}

main();
