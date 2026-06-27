import type { RetailerLink } from "@/lib/types/database";

/** Extract repo JSON paths referenced in retailer browser-truth notes. */
export function repoEvidencePathsFromBrowserTruthNotes(notes: string | null | undefined): string[] {
  if (!notes) return [];
  const matches = notes.match(/data\/[a-zA-Z0-9/_.-]+\.json/g) ?? [];
  return Array.from(new Set(matches)).sort();
}

export function buildFilterPdpRepoEvidencePaths(args: {
  censusEvidenceFiles: string[];
  retailerLinks: RetailerLink[];
}): string[] {
  const fromNotes = args.retailerLinks.flatMap((link) =>
    repoEvidencePathsFromBrowserTruthNotes(link.browser_truth_notes ?? null),
  );
  return Array.from(new Set([...args.censusEvidenceFiles, ...fromNotes])).sort();
}

export function primaryBrowserProofMeta(
  links: RetailerLink[],
): { checkedAt: string | null; classification: string | null } {
  const primary =
    links.find((l) => l.is_primary) ??
    links.find((l) => l.browser_truth_classification === "direct_buyable") ??
    links[0] ??
    null;
  return {
    checkedAt: primary?.browser_truth_checked_at ?? null,
    classification: primary?.browser_truth_classification ?? null,
  };
}
