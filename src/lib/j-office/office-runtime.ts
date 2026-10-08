/**
 * Local-only Founder Office runtime contract.
 * Edge-safe: no filesystem or child_process. Hosted Netlify must fail closed.
 */

export const J_OFFICE_HOST_PROJECTION_PATH_ENV = "J_OFFICE_HOST_PROJECTION_PATH";

export type OfficeRuntimeEnv = {
  J_OFFICE_HOST_PROJECTION_PATH?: string;
  NETLIFY?: string;
  CONTEXT?: string;
  [key: string]: string | undefined;
};

export function isHostedOfficeRuntime(
  env: OfficeRuntimeEnv = process.env,
): boolean {
  const netlify = env.NETLIFY?.trim();
  if (netlify === "true" || netlify === "1") return true;
  const context = env.CONTEXT?.trim();
  return (
    context === "production" ||
    context === "deploy-preview" ||
    context === "branch-deploy"
  );
}

export function localOfficeProjectionPath(
  env: OfficeRuntimeEnv = process.env,
): string | null {
  const path = env[J_OFFICE_HOST_PROJECTION_PATH_ENV]?.trim() ?? "";
  if (!path.startsWith("/")) return null;
  return path;
}

export function hasLocalOfficeRuntime(
  env: OfficeRuntimeEnv = process.env,
): boolean {
  if (isHostedOfficeRuntime(env)) return false;
  return localOfficeProjectionPath(env) !== null;
}

export function hostedOfficeUnavailableResponse(): Response {
  return new Response("Not Found", {
    status: 404,
    headers: {
      "Cache-Control": "no-store",
      "X-Robots-Tag": "noindex, nofollow",
    },
  });
}
