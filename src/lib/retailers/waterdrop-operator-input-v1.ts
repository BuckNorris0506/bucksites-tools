/**
 * Operator-provided Rakuten / Waterdrop LinkSynergy export contract (read-only).
 */

import { existsSync, readFileSync } from "node:fs";
import path from "node:path";

import {
  inferTokenCandidatesFromWaterdropText,
  parseLinkSynergyAffiliateUrl,
  parseWaterdropHtmlSnippet,
  type ParsedWaterdropAnchorV1,
} from "@/lib/retailers/waterdrop-linksynergy-parse-v1";

export const WATERDROP_RAKUTEN_OPERATOR_INPUT_CONTRACT_V1 = "waterdrop_rakuten_operator_input_v1";

export type WaterdropRakutenOperatorEntryV1 = {
  id: string;
  affiliate_url?: string | null;
  visible_title?: string | null;
  image_url?: string | null;
  raw_html?: string | null;
};

export type WaterdropRakutenOperatorInputV1 = {
  contract: typeof WATERDROP_RAKUTEN_OPERATOR_INPUT_CONTRACT_V1;
  entries: WaterdropRakutenOperatorEntryV1[];
};

export type NormalizedOperatorEntryV1 = {
  entry_id: string;
  parsed: ParsedWaterdropAnchorV1;
};

function mergeParsed(
  base: ParsedWaterdropAnchorV1,
  overlay: Partial<ParsedWaterdropAnchorV1>,
): ParsedWaterdropAnchorV1 {
  return {
    ...base,
    ...overlay,
    inferred_token_candidates:
      overlay.inferred_token_candidates?.length
        ? overlay.inferred_token_candidates
        : base.inferred_token_candidates,
    parse_notes: [...base.parse_notes, ...(overlay.parse_notes ?? [])],
  };
}

export function entryToParsedWaterdropAnchor(entry: WaterdropRakutenOperatorEntryV1): ParsedWaterdropAnchorV1 | null {
  if (entry.raw_html?.trim()) {
    const fromHtml = parseWaterdropHtmlSnippet(entry.raw_html);
    if (fromHtml.length > 0) {
      const first = fromHtml[0]!;
      return mergeParsed(first, {
        visible_title: entry.visible_title ?? first.visible_title,
        image_url: entry.image_url ?? first.image_url,
      });
    }
  }

  const affiliate = entry.affiliate_url?.trim();
  if (!affiliate) return null;

  const parsed = parseLinkSynergyAffiliateUrl(affiliate);
  const destination = parsed?.destination_pdp_url ?? null;
  const notes: string[] = [];
  if (!parsed) notes.push("affiliate_url_parse_failed");

  return {
    affiliate_url: affiliate,
    destination_pdp_url: destination,
    visible_title: entry.visible_title?.trim() ?? null,
    image_url: entry.image_url?.trim() ?? null,
    image_alt: null,
    inferred_token_candidates: inferTokenCandidatesFromWaterdropText({
      destination_pdp_url: destination,
      visible_title: entry.visible_title ?? null,
    }),
    parse_notes: notes,
  };
}

export function normalizeWaterdropOperatorEntries(
  input: WaterdropRakutenOperatorInputV1,
): NormalizedOperatorEntryV1[] {
  const out: NormalizedOperatorEntryV1[] = [];
  for (const entry of input.entries) {
    const id = entry.id?.trim();
    if (!id) continue;
    const parsed = entryToParsedWaterdropAnchor(entry);
    if (!parsed) continue;
    out.push({ entry_id: id, parsed });
  }
  return out;
}

export function loadWaterdropOperatorInputFromFile(filePath: string): WaterdropRakutenOperatorInputV1 {
  const raw = JSON.parse(readFileSync(filePath, "utf8")) as WaterdropRakutenOperatorInputV1;
  if (raw.contract !== WATERDROP_RAKUTEN_OPERATOR_INPUT_CONTRACT_V1) {
    throw new Error(`Expected contract ${WATERDROP_RAKUTEN_OPERATOR_INPUT_CONTRACT_V1}, got ${String(raw.contract)}`);
  }
  if (!Array.isArray(raw.entries)) {
    throw new Error("entries must be an array");
  }
  return raw;
}

export function resolveDefaultOperatorInputPath(rootDir: string): string {
  const primary = path.join(rootDir, "data/waterdrop/operator-input/waterdrop-rakuten-links.v1.json");
  if (existsSync(primary)) return primary;
  return path.join(rootDir, "data/waterdrop/operator-input/waterdrop-rakuten-links.v1.sample.json");
}
