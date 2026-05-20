/**
 * Read-only deploy identity for live HTML proof (Netlify injects COMMIT_REF at build).
 * Not used for buy-path, ranking, or mutation authority.
 */

const META_NAME = "buckparts-deploy-commit";

/** Commit ref baked into the production build (Netlify `COMMIT_REF` / `NETLIFY_COMMIT_REF`). */
export function buildDeployCommitRefForMetadata(): string | null {
  const ref =
    process.env.COMMIT_REF?.trim() ||
    process.env.NETLIFY_COMMIT_REF?.trim() ||
    process.env.VERCEL_GIT_COMMIT_SHA?.trim() ||
    "";
  return ref.length > 0 ? ref : null;
}

export const BUCKPARTS_DEPLOY_COMMIT_META_NAME = META_NAME;

/** Parse deploy commit from rendered HTML; null when marker absent (pre-marker deploys). */
export function parseDeployCommitRefFromHtml(html: string): string | null {
  const re = new RegExp(
    `<meta\\s+name=["']${META_NAME}["']\\s+content=["']([^"']+)["']`,
    "i",
  );
  const m = html.match(re);
  const v = m?.[1]?.trim();
  return v && v.length > 0 ? v : null;
}

export type DeployCommitSyncCheckV1 = {
  local_head_commit: string | "UNKNOWN";
  live_deploy_commit: string | "UNKNOWN";
  sync: "MATCHES_LOCAL_HEAD" | "DIFFERS_FROM_LOCAL_HEAD" | "UNKNOWN_LIVE_DEPLOY_COMMIT";
};

export function compareDeployCommitToLocalHead(args: {
  localHeadCommit: string | "UNKNOWN";
  liveDeployCommit: string | null;
}): DeployCommitSyncCheckV1 {
  const local = args.localHeadCommit;
  const live = args.liveDeployCommit;
  if (!live) {
    return {
      local_head_commit: local,
      live_deploy_commit: "UNKNOWN",
      sync: "UNKNOWN_LIVE_DEPLOY_COMMIT",
    };
  }
  const norm = (s: string) => s.trim().toLowerCase();
  const match =
    local !== "UNKNOWN" &&
    (norm(local) === norm(live) || norm(local).startsWith(norm(live)) || norm(live).startsWith(norm(local)));
  return {
    local_head_commit: local,
    live_deploy_commit: live,
    sync: match ? "MATCHES_LOCAL_HEAD" : "DIFFERS_FROM_LOCAL_HEAD",
  };
}
