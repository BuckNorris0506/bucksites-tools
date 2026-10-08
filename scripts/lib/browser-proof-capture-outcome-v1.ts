/**
 * Capture-outcome classification for browser-proof collector drafts.
 *
 * Derived from existing collector evidence only (overall_verdict, capture_succeeded,
 * page_type, capture_attempts). Not a new runtime, queue, or retry orchestrator.
 *
 * Distinguishes:
 * - SUCCESS — collector PASS (qualifying manufacturer evidence captured)
 * - NO_EVIDENCE — page loaded; no qualifying manufacturer evidence
 * - TRANSIENT_NETWORK_FAILURE — page never captured (HTTP2/DNS/timeout/launch/reset/block)
 * - PERMANENT_SITE_FAILURE — page loaded as manufacturer not-found
 */

export const BROWSER_PROOF_CAPTURE_OUTCOMES_V1 = [
  "SUCCESS",
  "NO_EVIDENCE",
  "TRANSIENT_NETWORK_FAILURE",
  "PERMANENT_SITE_FAILURE",
] as const;

export type BrowserProofCaptureOutcomeV1 =
  (typeof BROWSER_PROOF_CAPTURE_OUTCOMES_V1)[number];

export type BrowserProofCaptureOutcomeClassificationV1 = {
  capture_outcome: BrowserProofCaptureOutcomeV1;
  reason: string;
};

export type BrowserProofCaptureOutcomeCandidateInputV1 = {
  verdict?: unknown;
  facts?: {
    capture_succeeded?: unknown;
    final_url?: unknown;
    page_type?: unknown;
    navigation_error?: unknown;
  };
  capture_attempts?: readonly {
    success?: unknown;
    error?: unknown;
    final_url?: unknown;
  }[];
};

function isUnloadedFinalUrl(url: unknown): boolean {
  if (typeof url !== "string") return true;
  const u = url.trim().toLowerCase();
  return (
    !u ||
    u === "about:blank" ||
    u.startsWith("chrome-error:") ||
    u.includes("chromewebdata")
  );
}

function candidatePageLoaded(candidate: BrowserProofCaptureOutcomeCandidateInputV1): boolean {
  const facts = candidate.facts ?? {};
  return facts.capture_succeeded === true && !isUnloadedFinalUrl(facts.final_url);
}

const CONTENT_PAGE_TYPES = new Set([
  "search_page",
  "category_page",
  "product_pdp",
  "unknown",
]);

export function classifyBrowserProofCaptureOutcomeV1(args: {
  overall_verdict?: unknown;
  candidates?: readonly BrowserProofCaptureOutcomeCandidateInputV1[];
  capture_attempts?: readonly { success?: unknown; error?: unknown }[];
}): BrowserProofCaptureOutcomeClassificationV1 {
  const candidates = args.candidates ?? [];
  const loaded = candidates.filter(candidatePageLoaded);

  if (args.overall_verdict === "PASS") {
    if (loaded.length === 0) {
      return {
        capture_outcome: "TRANSIENT_NETWORK_FAILURE",
        reason: "pass_without_loaded_page",
      };
    }
    return {
      capture_outcome: "SUCCESS",
      reason: "overall_verdict=PASS",
    };
  }

  if (loaded.length === 0) {
    return {
      capture_outcome: "TRANSIENT_NETWORK_FAILURE",
      reason: "no_page_capture",
    };
  }

  const loadedPageTypes = loaded.map((c) => c.facts?.page_type);
  const sawContentPage = loadedPageTypes.some(
    (t) => typeof t === "string" && CONTENT_PAGE_TYPES.has(t),
  );
  const allNotFound = loadedPageTypes.every((t) => t === "not_found");
  const anyBlocked = loadedPageTypes.some((t) => t === "blocked");

  if (allNotFound) {
    return {
      capture_outcome: "PERMANENT_SITE_FAILURE",
      reason: "page_type=not_found",
    };
  }

  if (!sawContentPage && anyBlocked) {
    return {
      capture_outcome: "TRANSIENT_NETWORK_FAILURE",
      reason: "page_loaded_but_blocked",
    };
  }

  const pageType = typeof loadedPageTypes[0] === "string" ? loadedPageTypes[0] : "unknown";
  if (args.overall_verdict === "FAIL_AS_PROOF") {
    return {
      capture_outcome: "NO_EVIDENCE",
      reason: `overall_verdict=FAIL_AS_PROOF page_type=${pageType}`,
    };
  }

  return {
    capture_outcome: "NO_EVIDENCE",
    reason: `page_loaded_without_qualifying_manufacturer_evidence page_type=${pageType}`,
  };
}

export function classifyBrowserProofCaptureOutcomeFromUnknownDraftV1(
  draft: unknown,
): BrowserProofCaptureOutcomeClassificationV1 {
  if (!draft || typeof draft !== "object") {
    return {
      capture_outcome: "TRANSIENT_NETWORK_FAILURE",
      reason: "unreadable_collector_draft",
    };
  }
  const record = draft as Record<string, unknown>;
  return classifyBrowserProofCaptureOutcomeV1({
    overall_verdict: record.overall_verdict,
    candidates: Array.isArray(record.candidates) ? record.candidates : [],
    capture_attempts: Array.isArray(record.capture_attempts)
      ? record.capture_attempts
      : [],
  });
}

export function captureOutcomeParksManufacturerProofRefreshV1(
  outcome: BrowserProofCaptureOutcomeV1,
): boolean {
  return outcome !== "TRANSIENT_NETWORK_FAILURE";
}

export function recommendedNextActionForCaptureOutcomeV1(args: {
  classification: BrowserProofCaptureOutcomeClassificationV1;
  bestNote: string;
  attemptErrors: string[];
}): string {
  const { classification, bestNote, attemptErrors } = args;
  switch (classification.capture_outcome) {
    case "SUCCESS":
      return `Owner review draft collector output.${bestNote} If accepted, manually author owner-browser-proof-result + evidence; do not treat collector PASS as apply-ready.`;
    case "PERMANENT_SITE_FAILURE":
      return "Manufacturer site returned not-found. This is not a transient network failure.";
    case "TRANSIENT_NETWORK_FAILURE": {
      const attemptNote =
        attemptErrors.length > 0
          ? ` Attempts: ${attemptErrors.slice(0, 5).join(" | ")}${attemptErrors.length > 5 ? " …" : ""}.`
          : "";
      return `Manufacturer site was temporarily unreachable (${classification.reason}). Slug remains eligible for a later collector refresh. Do not treat as missing manufacturer evidence.${attemptNote}`;
    }
    case "NO_EVIDENCE":
      return "Page loaded but contains no qualifying manufacturer evidence. Capture a product PDP (official manufacturer or authorized parts distributor PartDetail), not search/category.";
  }
}
