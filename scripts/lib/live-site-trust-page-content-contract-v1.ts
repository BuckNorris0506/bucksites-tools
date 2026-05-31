import type { LiveSiteSmokeContentContractResultV1 } from "./buckparts-command-center-v2-types";

/** Read-only live HTML contracts for critical public trust pages. */
export const LIVE_SITE_TRUST_PAGE_CONTENT_CONTRACTS_V1 = [
  {
    contract_id: "wrong_part_prevention_homeowner_v1",
    path: "/wrong-part-prevention",
    required_markers: [
      "how buckparts helps you avoid buying the wrong filter",
      "treasure hunt",
      "questionable part",
    ],
    banned_phrases: [
      "structured data",
      "repository",
      "no buy button yet",
      "unsafe buy path",
      "affiliate partnerships",
      "listing evidence",
    ],
  },
] as const;

export type LiveSiteTrustPageContentContractV1 =
  (typeof LIVE_SITE_TRUST_PAGE_CONTENT_CONTRACTS_V1)[number];

export function evaluateTrustPageContentContract(args: {
  html: string;
  contract: LiveSiteTrustPageContentContractV1;
  http_ok: boolean;
  status_code: number | "UNKNOWN";
}): LiveSiteSmokeContentContractResultV1 {
  const lower = args.html.toLowerCase();
  const required_markers_found: string[] = [];
  const required_markers_missing: string[] = [];
  for (const marker of args.contract.required_markers) {
    if (lower.includes(marker.toLowerCase())) {
      required_markers_found.push(marker);
    } else {
      required_markers_missing.push(marker);
    }
  }
  const banned_phrases_found: string[] = [];
  for (const phrase of args.contract.banned_phrases) {
    if (lower.includes(phrase.toLowerCase())) {
      banned_phrases_found.push(phrase);
    }
  }
  const required_markers_ok = required_markers_missing.length === 0;
  const banned_phrases_absent = banned_phrases_found.length === 0;
  const content_contract_ok =
    args.http_ok && required_markers_ok && banned_phrases_absent;

  return {
    contract_id: args.contract.contract_id,
    path: args.contract.path,
    status_code: args.status_code,
    http_ok: args.http_ok,
    required_markers_ok,
    banned_phrases_absent,
    content_contract_ok,
    required_markers_found,
    required_markers_missing,
    banned_phrases_found,
  };
}

/** Fixture: current homeowner copy contract (good production). */
export function fixtureGoodWrongPartPreventionHtml(): string {
  return `<!DOCTYPE html><html><body>
<h1>How BuckParts helps you avoid buying the wrong filter</h1>
<p>Finding the right link can turn into a treasure hunt.</p>
<p>we will not point you at a questionable part just to look helpful.</p>
<p>Before buying, compare the filter code on your old filter or fridge label.</p>
</body></html>`;
}

/** Fixture: pre-homeowner-rewrite stale production copy. */
export function fixtureStaleWrongPartPreventionHtml(): string {
  return `<!DOCTYPE html><html><body>
<h1>How BuckParts helps prevent wrong-part purchases</h1>
<p>BuckParts starts with structured data in our repository.</p>
<p>How BuckParts refuses unsafe buy paths.</p>
<p>No buy button yet is a trust feature — not that we lack affiliate partnerships.</p>
<p>When mapping or listing evidence is incomplete, buying options hidden.</p>
</body></html>`;
}

export async function probeLiveSiteTrustPageContentContract(args: {
  fetchFn: typeof fetch;
  baseUrl: string;
  contract: LiveSiteTrustPageContentContractV1;
  timeoutMs?: number;
}): Promise<LiveSiteSmokeContentContractResultV1> {
  const timeoutMs = args.timeoutMs ?? 15_000;
  const url = `${args.baseUrl.replace(/\/+$/, "")}${args.contract.path}`;
  try {
    const res = await args.fetchFn(url, {
      method: "GET",
      redirect: "follow",
      signal: AbortSignal.timeout(timeoutMs),
      headers: { Accept: "text/html,application/xhtml+xml" },
    });
    const status = res.status;
    const text = await res.text();
    const http_ok = status >= 200 && status < 400;
    return evaluateTrustPageContentContract({
      html: text,
      contract: args.contract,
      http_ok,
      status_code: status,
    });
  } catch {
    return evaluateTrustPageContentContract({
      html: "",
      contract: args.contract,
      http_ok: false,
      status_code: "UNKNOWN",
    });
  }
}
