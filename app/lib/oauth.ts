import { createHash, randomBytes, timingSafeEqual } from "node:crypto";

import { prisma } from "@/app/lib/prisma";

export const authorizationCodeLifetimeSeconds = 5 * 60;
export const accessTokenLifetimeSeconds = 60 * 60;

export function randomToken() {
  return randomBytes(32).toString("base64url");
}

export function hashToken(value: string) {
  return createHash("sha256").update(value).digest("hex");
}

export function hashesMatch(provided: string, expected: string) {
  const providedBuffer = Buffer.from(provided, "hex");
  const expectedBuffer = Buffer.from(expected, "hex");
  return providedBuffer.length === expectedBuffer.length && timingSafeEqual(providedBuffer, expectedBuffer);
}

export function secretsMatch(provided: string | null, configured: string | undefined) {
  if (!provided || !configured) return false;
  const providedBuffer = Buffer.from(provided);
  const configuredBuffer = Buffer.from(configured);
  return providedBuffer.length === configuredBuffer.length && timingSafeEqual(providedBuffer, configuredBuffer);
}

export function isValidRedirectUri(value: string) {
  try {
    const url = new URL(value);
    return url.protocol === "https:" || (url.protocol === "http:" && ["localhost", "127.0.0.1", "::1"].includes(url.hostname));
  } catch {
    return false;
  }
}

export async function hasValidOAuthAccessToken(token: string) {
  const accessToken = await prisma.oAuthAccessToken.findUnique({ where: { tokenHash: hashToken(token) } });
  return Boolean(accessToken && !accessToken.revoked && accessToken.expiresAt.getTime() > Date.now());
}

export function baseUrl(request: Request) {
  return new URL(request.url).origin;
}