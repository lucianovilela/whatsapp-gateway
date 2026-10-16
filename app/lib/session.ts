import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { cache } from "react";

import {
  getBearerToken,
  issueUserToken,
  readTokenClaims,
  sessionCookieName,
  type TokenClaims,
} from "@/app/lib/gateway-auth";
import { prisma } from "@/app/lib/prisma";

export type SessionUser = { id: number; email: string };

export async function createSession(userId: number, tokenVersion: number) {
  const { token, expiresAt } = await issueUserToken(userId, tokenVersion);
  const cookieStore = await cookies();

  cookieStore.set(sessionCookieName, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    expires: expiresAt,
  });
}

export async function deleteSession() {
  const cookieStore = await cookies();
  cookieStore.delete(sessionCookieName);
}

async function loadUser(claims: TokenClaims | null): Promise<SessionUser | null> {
  if (claims?.kind !== "user") {
    return null;
  }

  const user = await prisma.user.findUnique({
    where: { id: claims.userId },
    select: { id: true, email: true, tokenVersion: true },
  });

  // Versão diferente indica que a senha foi alterada depois da emissão do token.
  if (!user || user.tokenVersion !== claims.version) {
    return null;
  }

  return { id: user.id, email: user.email };
}

export const getSessionUser = cache(async () => {
  const cookieStore = await cookies();
  return loadUser(await readTokenClaims(cookieStore.get(sessionCookieName)?.value));
});

export async function verifySession() {
  const user = await getSessionUser();

  if (!user) {
    redirect("/login");
  }

  return user;
}

export async function isRequestAuthorized(
  request: Request,
  { allowSession = false }: { allowSession?: boolean } = {},
) {
  const bearer = getBearerToken(request.headers.get("authorization"));

  if (bearer) {
    const claims = await readTokenClaims(bearer);
    return claims?.kind === "gateway" || (await loadUser(claims)) !== null;
  }

  return allowSession && (await getSessionUser()) !== null;
}