import { NextResponse, type NextRequest } from "next/server";

import { readTokenClaims, sessionCookieName } from "@/app/lib/gateway-auth";

const publicPaths = ["/login"];

// Checagem otimista (sem banco); a validação completa ocorre em verifySession().
export async function proxy(request: NextRequest) {
  if (publicPaths.includes(request.nextUrl.pathname)) {
    return NextResponse.next();
  }

  const claims = await readTokenClaims(request.cookies.get(sessionCookieName)?.value);

  if (claims?.kind !== "user") {
    return NextResponse.redirect(new URL("/login", request.nextUrl));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|.*\\..*).*)"],
};