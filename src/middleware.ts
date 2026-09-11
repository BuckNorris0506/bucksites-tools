import { NextRequest, NextResponse } from "next/server";

import {
  authorizeOfficeRequest,
  unauthorizedOfficeResponse,
} from "@/lib/j-office/office-auth";
import {
  hasLocalOfficeRuntime,
  hostedOfficeUnavailableResponse,
} from "@/lib/j-office/office-runtime";

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  if (!pathname.startsWith("/office")) {
    return NextResponse.next();
  }

  if (!hasLocalOfficeRuntime(process.env)) {
    return hostedOfficeUnavailableResponse();
  }

  const requestHeaders = new Headers(request.headers);
  requestHeaders.set("x-j-office", "1");

  const auth = await authorizeOfficeRequest(
    request.headers.get("authorization"),
    process.env,
  );
  if (!auth.ok) {
    return unauthorizedOfficeResponse();
  }

  const response = NextResponse.next({
    request: { headers: requestHeaders },
  });
  response.headers.set("X-Robots-Tag", "noindex, nofollow");
  response.headers.set("Cache-Control", "no-store");
  return response;
}

export const config = {
  matcher: ["/office", "/office/:path*"],
};
