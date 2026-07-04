/**
 * Browser Proof Collector → owner-review packet bridge v1.
 *
 * Reads a collector draft (PASS) and writes an intermediate owner-review packet only.
 * Does NOT write owner-browser-proof-result, evidence under data/evidence/, founder approvals,
 * retailer_links.csv, Supabase, readiness, or apply artifacts.
 */

import { createHash } from "node:crypto";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";

import {
  BROWSER_PROOF_COLLECTOR_CONTRACT_V1,
  BROWSER_PROOF_COLLECTOR_DRAFT_DIR_REL_V1,
  confusionFamilyOwnerReviewRequiredV1,
  type BrowserProofCollectorCandidateResultV1,
  type BrowserProofCollectorDraftV1,
} from "./browser-proof-collector-v1";

export const BROWSER_PROOF_COLLECTOR_OWNER_REVIEW_PACKET_CONTRACT_V1 =
  "browser_proof_collector_owner_review_packet_v1" as const;

export type BrowserProofCollectorOwnerReviewPacketV1 = {
  contract: typeof BROWSER_PROOF_COLLECTOR_OWNER_REVIEW_PACKET_CONTRACT_V1;
  read_only: true;
  data_mutation: false;
  mutation_authorized: false;
  verified_link_authorized: false;
  csv_apply_authorized: false;
  supabase_mutation_authorized: false;
  evidence_write_authorized: false;
  production_go_click_authorized: false;
  apply_plan_proposal_justified: false;
  founder_approval_authorized: false;
  activates_owner_browser_proof_result: false;
  activates_evidence_json: false;
  promotes_to_owner_browser_proof_result: false;
  owner_acceptance_required: true;
  owner_acceptance_status: "PENDING_OWNER_ACCEPTANCE";
  generated_at: string;
  source_collector_draft_rel_path: string;
  source_collector_draft_sha256: string;
  slug: string;
  expected_token: string;
  forbidden_tokens: string[];
  confusion_family_owner_review_required: boolean;
  overall_verdict: "PASS";
  best_candidate: {
    candidate_url: string;
    verdict: "PASS";
    source_class: string;
    page_type: string;
    title: string;
    h1: string;
    visible_text_snippet: string;
    exact_expected_token_present: boolean;
    forbidden_tokens_present: string[];
    price_like_text_present: boolean;
    stock_or_buyability_signal_present: boolean;
    add_to_cart_or_subscription_signals: string[];
    screenshot_rel_path: string | null;
    assessment: string;
    capture_attempts: BrowserProofCollectorCandidateResultV1["capture_attempts"];
    official_pass_class: boolean;
  };
  failed_or_non_best_candidates: Array<{
    candidate_url: string;
    verdict: string;
    source_class: string;
    assessment: string;
    blockers: string[];
  }>;
  proposed_owner_browser_proof_result_preview: {
    activation_status: "DRAFT_ONLY_NOT_ACTIVATED";
    contract_if_activated: "fridge_safe_link_owner_browser_proof_result_v1";
    target_rel_path_if_owner_accepts: string;
    verdict_if_activated: "PASS_BROWSER_PROOF";
    path_type: string;
    primary_url: string;
    proven_observations: string[];
  };
  proposed_evidence_preview: {
    activation_status: "DRAFT_ONLY_NOT_ACTIVATED";
    target_rel_path_if_owner_accepts: string;
    primary_url: string;
    path_type: string;
    exact_token_visible: true;
    forbidden_tokens_observed: string[];
  };
  owner_acceptance_checklist: string[];
  recommended_next_action: string;
  proven_facts: string[];
  unknown_facts: string[];
  not_authorized: string[];
};

function sha256Text(text: string): string {
  return createHash("sha256").update(text, "utf8").digest("hex");
}

function retailerHostFromUrl(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return "unknown";
  }
}

function isOfficialPassClass(sourceClass: string): boolean {
  return (
    sourceClass === "official_manufacturer_pdp" ||
    sourceClass === "authorized_parts_distributor_pdp"
  );
}

function buildProvenObservationsV1(args: {
  token: string;
  best: BrowserProofCollectorCandidateResultV1;
  forbiddenTokens: readonly string[];
}): string[] {
  const f = args.best.facts;
  const obs: string[] = [];
  if (f.title.trim()) obs.push(`PROVEN: Page title: ${f.title.trim()}.`);
  if (f.h1.trim()) obs.push(`PROVEN: H1: ${f.h1.trim()}.`);
  obs.push(`PROVEN: Exact token ${args.token} visible on page.`);
  if (f.price_like_text_present) obs.push("PROVEN: Price-like text visible.");
  if (f.stock_or_buyability_signal_present) {
    obs.push("PROVEN: Stock/buyability signal visible.");
  }
  for (const signal of f.add_to_cart_or_subscription_signals.slice(0, 4)) {
    obs.push(`PROVEN: Purchase control visible: ${signal}.`);
  }
  for (const forbidden of args.forbiddenTokens) {
    if (!f.forbidden_tokens_present.includes(forbidden)) {
      obs.push(`PROVEN: No ${forbidden} product identity shown.`);
    }
  }
  if (args.best.screenshot_rel_path) {
    obs.push(`PROVEN: Collector screenshot at ${args.best.screenshot_rel_path}.`);
  }
  return obs;
}

export function resolveBestPassCandidateV1(
  draft: BrowserProofCollectorDraftV1,
): BrowserProofCollectorCandidateResultV1 | null {
  if (draft.overall_verdict !== "PASS") return null;
  const byBestUrl = draft.candidates.find(
    (c) =>
      c.candidate_url === draft.best_candidate_url && c.verdict === "PASS",
  );
  if (byBestUrl) return byBestUrl;
  return draft.candidates.find((c) => c.verdict === "PASS") ?? null;
}

export function assertCollectorDraftSafeForOwnerReviewBridgeV1(
  draft: BrowserProofCollectorDraftV1,
): { ok: true } | { ok: false; blockers: string[] } {
  const blockers: string[] = [];
  if (draft.contract !== BROWSER_PROOF_COLLECTOR_CONTRACT_V1) {
    blockers.push(`unexpected_contract:${draft.contract}`);
  }
  if (draft.mutation_authorized !== false) blockers.push("mutation_authorized_must_be_false");
  if (draft.promotes_to_owner_browser_proof_result !== false) {
    blockers.push("promotes_to_owner_browser_proof_result_must_be_false");
  }
  if (draft.founder_approval_authorized !== false) {
    blockers.push("founder_approval_authorized_must_be_false");
  }
  if (draft.overall_verdict !== "PASS") {
    blockers.push(`overall_verdict_not_pass:${draft.overall_verdict}`);
  }
  const best = resolveBestPassCandidateV1(draft);
  if (!best) blockers.push("best_pass_candidate_missing");
  if (best && !best.facts.exact_expected_token_present) {
    blockers.push("best_candidate_missing_exact_token");
  }
  if (best && best.facts.forbidden_tokens_present.length > 0) {
    blockers.push(
      `best_candidate_has_forbidden_tokens:${best.facts.forbidden_tokens_present.join(",")}`,
    );
  }
  return blockers.length === 0 ? { ok: true } : { ok: false, blockers };
}

export function buildBrowserProofCollectorOwnerReviewPacketV1(args: {
  draft: BrowserProofCollectorDraftV1;
  sourceCollectorDraftRelPath: string;
  sourceCollectorDraftSha256: string;
  now?: () => Date;
}): BrowserProofCollectorOwnerReviewPacketV1 {
  const gate = assertCollectorDraftSafeForOwnerReviewBridgeV1(args.draft);
  if (!gate.ok) {
    throw new Error(
      `BROWSER_PROOF_COLLECTOR_OWNER_REVIEW_BRIDGE_BLOCKED: ${gate.blockers.join("; ")}`,
    );
  }
  const best = resolveBestPassCandidateV1(args.draft)!;
  const now = args.now ?? (() => new Date());
  const slug = args.draft.slug;
  const token = args.draft.expected_token;
  const forbidden = args.draft.forbidden_tokens;
  const confusion = confusionFamilyOwnerReviewRequiredV1(slug);
  const officialPassClass = isOfficialPassClass(best.facts.source_class);
  const provenObservations = buildProvenObservationsV1({
    token,
    best,
    forbiddenTokens: forbidden,
  });
  const host = retailerHostFromUrl(best.candidate_url);

  const failed_or_non_best_candidates = args.draft.candidates
    .filter((c) => c.candidate_url !== best.candidate_url)
    .map((c) => ({
      candidate_url: c.candidate_url,
      verdict: c.verdict,
      source_class: c.facts.source_class,
      assessment: c.assessment,
      blockers: c.blockers,
    }));

  return {
    contract: BROWSER_PROOF_COLLECTOR_OWNER_REVIEW_PACKET_CONTRACT_V1,
    read_only: true,
    data_mutation: false,
    mutation_authorized: false,
    verified_link_authorized: false,
    csv_apply_authorized: false,
    supabase_mutation_authorized: false,
    evidence_write_authorized: false,
    production_go_click_authorized: false,
    apply_plan_proposal_justified: false,
    founder_approval_authorized: false,
    activates_owner_browser_proof_result: false,
    activates_evidence_json: false,
    promotes_to_owner_browser_proof_result: false,
    owner_acceptance_required: true,
    owner_acceptance_status: "PENDING_OWNER_ACCEPTANCE",
    generated_at: now().toISOString(),
    source_collector_draft_rel_path: args.sourceCollectorDraftRelPath,
    source_collector_draft_sha256: args.sourceCollectorDraftSha256,
    slug,
    expected_token: token,
    forbidden_tokens: forbidden,
    confusion_family_owner_review_required: confusion,
    overall_verdict: "PASS",
    best_candidate: {
      candidate_url: best.candidate_url,
      verdict: "PASS",
      source_class: best.facts.source_class,
      page_type: best.facts.page_type,
      title: best.facts.title,
      h1: best.facts.h1,
      visible_text_snippet: best.facts.visible_text_snippet,
      exact_expected_token_present: best.facts.exact_expected_token_present,
      forbidden_tokens_present: best.facts.forbidden_tokens_present,
      price_like_text_present: best.facts.price_like_text_present,
      stock_or_buyability_signal_present: best.facts.stock_or_buyability_signal_present,
      add_to_cart_or_subscription_signals: best.facts.add_to_cart_or_subscription_signals,
      screenshot_rel_path: best.screenshot_rel_path,
      assessment: best.assessment,
      capture_attempts: best.capture_attempts,
      official_pass_class: officialPassClass,
    },
    failed_or_non_best_candidates,
    proposed_owner_browser_proof_result_preview: {
      activation_status: "DRAFT_ONLY_NOT_ACTIVATED",
      contract_if_activated: "fridge_safe_link_owner_browser_proof_result_v1",
      target_rel_path_if_owner_accepts: `data/fridge/batch-production/drafts/fridge-safe-link-owner-browser-proof-result-${slug}-v1.json`,
      verdict_if_activated: "PASS_BROWSER_PROOF",
      path_type: best.facts.source_class,
      primary_url: best.candidate_url,
      proven_observations: provenObservations,
    },
    proposed_evidence_preview: {
      activation_status: "DRAFT_ONLY_NOT_ACTIVATED",
      target_rel_path_if_owner_accepts: `data/evidence/frigidaire-${slug}-official-owner-browser-proof-evidence.DRAFT_ONLY.json`,
      primary_url: best.candidate_url,
      path_type: best.facts.source_class,
      exact_token_visible: true,
      forbidden_tokens_observed: best.facts.forbidden_tokens_present,
    },
    owner_acceptance_checklist: [
      `Confirm collector screenshot and page identity show exact token ${token} on ${host}.`,
      `Confirm product identity is not any forbidden token: ${forbidden.join(", ") || "(none)"}.`,
      `Confirm primary URL is acceptable as Verified Link candidate: ${best.candidate_url}.`,
      `Confirm source_class=${best.facts.source_class} is acceptable for this slug (official_pass_class=${String(officialPassClass)}).`,
      "If accepted: separately author owner-browser-proof-result + evidence (this packet does not activate them).",
      "Do not create founder approval, apply plan, CSV apply, or Supabase write from this packet alone.",
    ],
    recommended_next_action: officialPassClass
      ? "Owner accept this review packet, then manually author owner-browser-proof-result and evidence from the proposed previews — still no founder approval or apply."
      : "Best PASS is not official-pass class. Prefer official manufacturer or authorized parts distributor before activating owner-browser-proof-result.",
    proven_facts: [
      "PROVEN: bridge writes intermediate owner-review packet only.",
      "PROVEN: activates_owner_browser_proof_result=false; activates_evidence_json=false.",
      "PROVEN: founder_approval_authorized=false; mutation_authorized=false.",
      `PROVEN: source collector draft sha256=${args.sourceCollectorDraftSha256}.`,
      `PROVEN: best PASS candidate=${best.candidate_url} source_class=${best.facts.source_class}.`,
      ...(confusion
        ? ["PROVEN: confusion-family slug — owner review remains required."]
        : []),
    ],
    unknown_facts: [
      "UNKNOWN: owner acceptance of this packet.",
      "UNKNOWN: readiness eligibility until owner-browser-proof-result and evidence are authored and accepted separately.",
    ],
    not_authorized: [
      "owner_browser_proof_result_auto_write",
      "data/evidence_auto_write",
      "founder_approval_auto_create",
      "apply_plan_auto_create",
      "retailer_links_csv_mutation",
      "supabase_mutation",
      "readiness_gate_auto_pass",
      "VALIDATION_PASS",
      "live_link_mutation",
    ],
  };
}

export function browserProofCollectorOwnerReviewPacketPathV1(args: {
  slug: string;
  generatedAtIso: string;
  sourceSha256: string;
}): string {
  const slug = args.slug.trim().toLowerCase();
  const stamp = args.generatedAtIso.replace(/[:.]/g, "-");
  const short = args.sourceSha256.slice(0, 12);
  return `${BROWSER_PROOF_COLLECTOR_DRAFT_DIR_REL_V1}/${slug}/browser-proof-collector-owner-review-packet-${slug}-${short}-${stamp}.json`;
}

export function writeBrowserProofCollectorOwnerReviewPacketV1(args: {
  rootDir: string;
  packet: BrowserProofCollectorOwnerReviewPacketV1;
  packetRelPath: string;
}): string {
  const abs = path.join(args.rootDir, args.packetRelPath);
  mkdirSync(path.dirname(abs), { recursive: true });
  writeFileSync(abs, `${JSON.stringify(args.packet, null, 2)}\n`, "utf8");
  return args.packetRelPath;
}

export function runBrowserProofCollectorOwnerReviewBridgeV1(args: {
  rootDir: string;
  collectorDraftRelPath: string;
  writePacket?: boolean;
  now?: () => Date;
  readText?: (abs: string) => string;
}): {
  packet: BrowserProofCollectorOwnerReviewPacketV1;
  packet_rel_path: string | null;
} {
  const readText = args.readText ?? ((abs: string) => readFileSync(abs, "utf8"));
  const abs = path.isAbsolute(args.collectorDraftRelPath)
    ? args.collectorDraftRelPath
    : path.join(args.rootDir, args.collectorDraftRelPath);
  const text = readText(abs);
  const draft = JSON.parse(text) as BrowserProofCollectorDraftV1;
  const sourceRel = path.isAbsolute(args.collectorDraftRelPath)
    ? path.relative(args.rootDir, args.collectorDraftRelPath)
    : args.collectorDraftRelPath;
  const sha = sha256Text(text);
  const packet = buildBrowserProofCollectorOwnerReviewPacketV1({
    draft,
    sourceCollectorDraftRelPath: sourceRel,
    sourceCollectorDraftSha256: sha,
    now: args.now,
  });
  const packetRel = browserProofCollectorOwnerReviewPacketPathV1({
    slug: packet.slug,
    generatedAtIso: packet.generated_at,
    sourceSha256: sha,
  });
  const packet_rel_path =
    args.writePacket === false
      ? null
      : writeBrowserProofCollectorOwnerReviewPacketV1({
          rootDir: args.rootDir,
          packet,
          packetRelPath: packetRel,
        });
  return { packet, packet_rel_path };
}

export function parseBrowserProofCollectorOwnerReviewBridgeCliArgsV1(
  argv: readonly string[],
): { draft: string | null; writePacket: boolean } {
  let draft: string | null = null;
  let writePacket = true;
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    const next = argv[i + 1];
    if ((a === "--draft" || a === "--collector-draft") && next) {
      draft = next;
      i++;
    } else if (a === "--no-write") {
      writePacket = false;
    }
  }
  return { draft, writePacket };
}
