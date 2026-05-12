import { NextResponse } from "next/server";

import { captureMonitoringMessage } from "@/lib/monitoring/error-monitoring";

const OWNER_PROOF_HEADER = "x-buckparts-owner-proof";
const PROOF_ROUTE = "/api/owner/sentry-proof";

// This temporary proof endpoint must evaluate the owner header/env token on every request.
export const dynamic = "force-dynamic";

function notFound(): NextResponse {
  return NextResponse.json({ error: "not_found" }, { status: 404 });
}

export async function GET(request: Request): Promise<NextResponse> {
  const expected = process.env.BUCKPARTS_OWNER_PROOF_TOKEN?.trim();
  if (!expected) return notFound();

  const provided = request.headers.get(OWNER_PROOF_HEADER)?.trim();
  if (!provided || provided !== expected) return notFound();

  captureMonitoringMessage("buckparts_sentry_proof_v1", {
    area: "sentry_proof",
    level: "info",
    metadata: {
      area: "sentry_proof",
      route: PROOF_ROUTE,
      proof_version: "v1",
      environment: process.env.SENTRY_ENVIRONMENT ?? process.env.NODE_ENV ?? "unknown",
    },
  });

  return NextResponse.json({ ok: true, message: "sentry proof capture attempted" });
}
