/**
 * Static cross-links for high-confidence Frigidaire refrigerator filter confusion clusters.
 * Peers must match real `filters.slug` values in the catalog.
 */

export type FridgeWinnerRailPeer = { slug: string; label: string };

export type FridgeWinnerRail = { title: string; peers: FridgeWinnerRailPeer[] };

const CLUSTERS: { title: string; members: [string, string][] }[] = [
  {
    title:
      "Frigidaire PureSource / side-by-side cartridges — compare the OEM # on your old filter:",
    members: [
      ["wf2cb", "WF2CB"],
      ["wfcb", "WFCB"],
      ["wf3cb", "WF3CB"],
    ],
  },
  {
    title: "Frigidaire newer filter lines (different cartridges than WF2CB / WFCB / WF3CB):",
    members: [
      ["eptwfu01", "EPTWFU01"],
      ["fppwfu01", "FPPWFU01"],
    ],
  },
  {
    title: "Related Frigidaire OEM numbers:",
    members: [
      ["frig-242086201", "242086201"],
      ["frig-242294502", "242294502"],
    ],
  },
];

export function getFridgeWinnerRail(currentSlug: string): FridgeWinnerRail | null {
  const s = currentSlug.trim().toLowerCase();
  for (const c of CLUSTERS) {
    const inCluster = c.members.some(([slug]) => slug === s);
    if (!inCluster) continue;
    const peers: FridgeWinnerRailPeer[] = c.members
      .filter(([slug]) => slug !== s)
      .map(([slug, label]) => ({ slug, label }));
    return { title: c.title, peers };
  }
  return null;
}
