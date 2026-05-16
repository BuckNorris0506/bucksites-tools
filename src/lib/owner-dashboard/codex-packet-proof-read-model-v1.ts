/**
 * Codex Packet Proof read model v1 — pure validation/summary of `buckparts_codex_next_execution_packet_v1` JSON.
 * PROVEN: no I/O; not automation input; does not widen Runner Step or authorize mutation.
 */

/** Must match stdout `contract` from `npm run buckparts:codex-next-execution-packet` → `scripts/run-buckparts-codex-next-execution-packet.ts`. */
export const BUCKPARTS_CODEX_NEXT_EXECUTION_PACKET_JSON_CONTRACT_V1 = "buckparts_codex_next_execution_packet_v1" as const;

export const CODEX_PACKET_PROOF_READ_MODEL_CONTRACT_V1 = "codex_packet_proof_read_model_v1" as const;

export const CODEX_PACKET_PROOF_DIGEST_HINT_V1 =
  "**PROVEN:** Markdown below is from `codex_packet_proof_read_model_v1` over optional saved `buckparts_codex_next_execution_packet_v1` JSON (typically stdout from `npm run buckparts:codex-next-execution-packet`). **NOT PROVEN:** founder-only approval (`layer_6_founder_only_approval`), closed-loop mutation safety, or Runner-driven Codex execution.";

export const CODEX_PACKET_PROOF_OWNER_DASHBOARD_LINE_V1 =
  "Codex Packet Proof is UNKNOWN on this dashboard until a future artifact or env-backed read path is wired here; digest may embed proof via FOUNDER_DIGEST_CODEX_PACKET_PROOF_JSON_PATH. This HTTP handler does not run Codex.";

export type CodexPacketProofSourceSnapshotV1 = {
  overall_status: string;
  source_packet_id: string | null;
  source_queue_row_id: string | null;
  source_packet_title: string | null;
  codex_executed: boolean;
  event_count: number | null;
  external_agent_execution: string | null;
  output_capture: string | null;
  git_status_clean: boolean | null;
};

export type CodexPacketProofReadModelV1 = {
  contract: typeof CODEX_PACKET_PROOF_READ_MODEL_CONTRACT_V1;
  read_only: true;
  data_mutation: false;
  automation_input: false;
  informational_only: true;
  generated_at: string;
  valid: boolean;
  invalid_reasons: string[];
  codex_packet_execution_proven: boolean;
  output_capture_proven: boolean;
  git_clean_after_codex: boolean;
  /** PROVEN from CLI contract today — remains NOT_PROVEN as autonomy/founder judgment until evidenced elsewhere. */
  layer_6_founder_only_approval: "NOT_PROVEN";
  source_snapshot: CodexPacketProofSourceSnapshotV1 | null;
};

function baseReadModel(
  generated_at: string,
  args: Omit<
    CodexPacketProofReadModelV1,
    "contract" | "read_only" | "data_mutation" | "automation_input" | "informational_only" | "generated_at"
  >,
): CodexPacketProofReadModelV1 {
  return {
    contract: CODEX_PACKET_PROOF_READ_MODEL_CONTRACT_V1,
    read_only: true,
    data_mutation: false,
    automation_input: false,
    informational_only: true,
    generated_at,
    ...args,
  };
}

/** PROVEN: filesystem/parse failures before JSON shape validation. */
export function buildCodexPacketProofReadModelParseFailedV1(generated_at: string, detail: string): CodexPacketProofReadModelV1 {
  return baseReadModel(generated_at, {
    valid: false,
    invalid_reasons: [`PROVEN: Could not parse Codex packet proof JSON — ${detail}`],
    codex_packet_execution_proven: false,
    output_capture_proven: false,
    git_clean_after_codex: false,
    layer_6_founder_only_approval: "NOT_PROVEN",
    source_snapshot: null,
  });
}

function readString(o: Record<string, unknown>, key: string): string | undefined {
  const v = o[key];
  return typeof v === "string" ? v : undefined;
}

function readBool(o: Record<string, unknown>, key: string): boolean | undefined {
  const v = o[key];
  return typeof v === "boolean" ? v : undefined;
}

function readNum(o: Record<string, unknown>, key: string): number | undefined {
  const v = o[key];
  return typeof v === "number" && Number.isFinite(v) ? v : undefined;
}

/**
 * Validates unknown JSON as `buckparts_codex_next_execution_packet_v1` and summarizes proof flags.
 * PROVEN: pure — callers supply parsed JSON only.
 */
export function buildCodexPacketProofReadModelV1(input: unknown, options: { generated_at: string }): CodexPacketProofReadModelV1 {
  const generated_at = options.generated_at;
  const invalid: string[] = [];

  if (!input || typeof input !== "object" || Array.isArray(input)) {
    return baseReadModel(generated_at, {
      valid: false,
      invalid_reasons: ["PROVEN: Root JSON must be a non-array object."],
      codex_packet_execution_proven: false,
      output_capture_proven: false,
      git_clean_after_codex: false,
      layer_6_founder_only_approval: "NOT_PROVEN",
      source_snapshot: null,
    });
  }

  const o = input as Record<string, unknown>;

  const contractOk = o.contract === BUCKPARTS_CODEX_NEXT_EXECUTION_PACKET_JSON_CONTRACT_V1;
  if (!contractOk) {
    invalid.push(
      `PROVEN: Expected contract ${BUCKPARTS_CODEX_NEXT_EXECUTION_PACKET_JSON_CONTRACT_V1}; got ${String(o.contract)}.`,
    );
  }

  const layer6 = o.layer_6_founder_only_approval;
  const layer6Ok = layer6 === "NOT_PROVEN";
  if (!layer6Ok) {
    invalid.push(`PROVEN: layer_6_founder_only_approval must be NOT_PROVEN for this read model; got ${String(layer6)}.`);
  }

  const overall = readString(o, "overall_status") ?? "UNKNOWN";
  const codexExecuted = readBool(o, "codex_executed") ?? false;

  const snapshot: CodexPacketProofSourceSnapshotV1 = {
    overall_status: overall,
    source_packet_id: readString(o, "source_packet_id") ?? null,
    source_queue_row_id: readString(o, "source_queue_row_id") ?? null,
    source_packet_title: readString(o, "source_packet_title") ?? null,
    codex_executed: codexExecuted,
    event_count: readNum(o, "event_count") ?? null,
    external_agent_execution: readString(o, "external_agent_execution") ?? null,
    output_capture: readString(o, "output_capture") ?? null,
    git_status_clean: readBool(o, "git_status_clean") ?? null,
  };

  if (overall === "FAIL") {
    invalid.push("PROVEN: Source overall_status is FAIL — not treated as informational proof.");
  } else if (overall !== "PASS" && overall !== "NO_PACKET") {
    invalid.push(`PROVEN: Unexpected overall_status ${overall} — expected PASS, NO_PACKET, or omitted invalid branch.`);
  }

  const coreOk = contractOk && layer6Ok && overall !== "FAIL";

  if (coreOk && overall === "PASS") {
    if (!codexExecuted) {
      invalid.push("PROVEN: PASS requires codex_executed true.");
    }
    const ec = readNum(o, "event_count");
    if (ec === undefined) {
      invalid.push("PROVEN: PASS requires numeric event_count.");
    }
    const fm = readString(o, "final_message_path")?.trim();
    const jl = readString(o, "jsonl_path")?.trim();
    if (!fm) {
      invalid.push("PROVEN: PASS requires non-empty final_message_path.");
    }
    if (!jl) {
      invalid.push("PROVEN: PASS requires non-empty jsonl_path.");
    }
    const gitClean = readBool(o, "git_status_clean");
    if (gitClean !== true) {
      invalid.push("PROVEN: PASS requires git_status_clean true.");
    }
    if (readString(o, "external_agent_execution") !== "PROVEN_FOR_READ_ONLY_EXECUTION_PACKET") {
      invalid.push("PROVEN: PASS requires external_agent_execution PROVEN_FOR_READ_ONLY_EXECUTION_PACKET.");
    }
    if (readString(o, "output_capture") !== "PROVEN_FOR_CODEX_JSONL_AND_FINAL_MESSAGE") {
      invalid.push("PROVEN: PASS requires output_capture PROVEN_FOR_CODEX_JSONL_AND_FINAL_MESSAGE.");
    }
  }

  if (coreOk && overall === "NO_PACKET") {
    if (codexExecuted) {
      invalid.push("PROVEN: NO_PACKET requires codex_executed false.");
    }
  }

  const valid = invalid.length === 0;

  let codex_packet_execution_proven = false;
  let output_capture_proven = false;
  let git_clean_after_codex = false;

  if (valid && overall === "PASS") {
    codex_packet_execution_proven = true;
    output_capture_proven = true;
    git_clean_after_codex = snapshot.git_status_clean === true;
  }

  return baseReadModel(generated_at, {
    valid,
    invalid_reasons: invalid,
    codex_packet_execution_proven,
    output_capture_proven,
    git_clean_after_codex,
    layer_6_founder_only_approval: "NOT_PROVEN",
    source_snapshot: snapshot,
  });
}

export function formatCodexPacketProofDigestMarkdownV1(model: CodexPacketProofReadModelV1, options?: { env_path?: string }): string {
  const pathLine = options?.env_path?.trim()
    ? `**PROVEN:** Source file from \`FOUNDER_DIGEST_CODEX_PACKET_PROOF_JSON_PATH\` → \`${options.env_path.trim()}\`.`
    : "**UNKNOWN:** Source path hint not supplied to formatter.";

  const lines = [
    pathLine,
    `**PROVEN:** Read model contract \`${model.contract}\` · valid=\`${String(model.valid)}\` · read_only=\`true\` · automation_input=\`false\`.`,
    "",
    "**Does not prove:** founder-only approval, closed-loop Runner, or mutation safety beyond read-only sandbox + prompt boundaries in the originating CLI.",
    "",
  ];

  if (model.valid && model.source_snapshot) {
    const s = model.source_snapshot;
    lines.push(
      "**Source summary (buckparts_codex_next_execution_packet_v1):**",
      `- overall_status: \`${s.overall_status}\``,
      `- codex_executed real Founder Execution Packet: \`${String(s.codex_executed && s.overall_status === "PASS")}\` (PASS with packet fields)`,
      `- source_packet_id: \`${s.source_packet_id ?? "null"}\``,
      `- source_packet_title: ${s.source_packet_title ?? "*null*"}`,
      `- codex_packet_execution_proven: \`${String(model.codex_packet_execution_proven)}\``,
      `- output_capture_proven (JSONL + final message paths): \`${String(model.output_capture_proven)}\``,
      `- git_clean_after_codex: \`${String(model.git_clean_after_codex)}\``,
      `- event_count: \`${s.event_count ?? "null"}\``,
      `- layer_6_founder_only_approval (read model stance): **NOT_PROVEN**`,
      "",
    );
  } else {
    lines.push("**INVALID or incomplete artifact:**", ...model.invalid_reasons.map((r) => `- ${r}`), "");
  }

  return `${lines.join("\n")}\n`;
}
