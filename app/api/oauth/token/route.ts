import { createHash } from "node:crypto";

import { accessTokenLifetimeSeconds, hashToken, hashesMatch, randomToken } from "@/app/lib/oauth";
import { prisma } from "@/app/lib/prisma";

export const runtime = "nodejs";

function tokenError(error: string, status = 400) {
  return Response.json({ error }, { status });
}

function verifyPkce(verifier: string, challenge: string) {
  return createHash("sha256").update(verifier).digest("base64url") === challenge;
}

export async function POST(request: Request) {
  const contentType = request.headers.get("content-type")?.split(";", 1)[0].trim();
  if (contentType !== "application/x-www-form-urlencoded") return tokenError("invalid_request");

  const params = new URLSearchParams(await request.text());
  const grantType = params.get("grant_type");
  const code = params.get("code");
  const clientId = params.get("client_id");
  const redirectUri = params.get("redirect_uri");
  const codeVerifier = params.get("code_verifier");
  if (grantType !== "authorization_code" || !code || !clientId || !redirectUri || !codeVerifier) return tokenError("invalid_request");

  let basicClientId: string | null = null;
  let basicSecret: string | null = null;
  const authorization = request.headers.get("authorization");
  if (authorization?.startsWith("Basic ")) {
    try {
      const decoded = Buffer.from(authorization.slice(6), "base64").toString("utf8");
      const separator = decoded.indexOf(":");
      if (separator > 0) {
        basicClientId = decoded.slice(0, separator);
        basicSecret = decoded.slice(separator + 1);
      }
    } catch { /* Treat malformed credentials as invalid client authentication. */ }
  }

  const authenticatedClientId = basicClientId ?? clientId;
  const clientSecret = basicSecret ?? params.get("client_secret");
  if (authenticatedClientId !== clientId || !clientSecret) return tokenError("invalid_client", 401);
  let client;
  try {
    client = await prisma.oAuthClient.findUnique({ where: { clientId } });
  } catch {
    return tokenError("temporarily_unavailable", 503);
  }
  if (!client || client.tokenEndpointAuthMethod === "client_secret_basic" && !basicSecret || client.tokenEndpointAuthMethod === "client_secret_post" && basicSecret || !hashesMatch(hashToken(clientSecret), client.clientSecretHash)) {
    return tokenError("invalid_client", 401);
  }

  let authorizationCode;
  try {
    authorizationCode = await prisma.oAuthAuthorizationCode.findUnique({ where: { authorizationCodeHash: hashToken(code) } });
  } catch {
    return tokenError("temporarily_unavailable", 503);
  }
  if (!authorizationCode || authorizationCode.clientId !== clientId || authorizationCode.redirectUri !== redirectUri || authorizationCode.revoked || authorizationCode.consumed || authorizationCode.expiresAt.getTime() <= Date.now() || !verifyPkce(codeVerifier, authorizationCode.codeChallenge)) {
    return tokenError("invalid_grant");
  }

  const accessToken = randomToken();
  const expiresAt = new Date(Date.now() + accessTokenLifetimeSeconds * 1000);
  try {
    await prisma.$transaction(async (tx) => {
      const consumed = await tx.oAuthAuthorizationCode.updateMany({
        where: { id: authorizationCode.id, consumed: false, revoked: false, expiresAt: { gt: new Date() } },
        data: { consumed: true },
      });
      if (consumed.count !== 1) throw new Error("authorization_code_consumed");
      await tx.oAuthAccessToken.create({ data: { clientId, tokenHash: hashToken(accessToken), expiresAt } });
    });
  } catch {
    return tokenError("invalid_grant");
  }

  return Response.json({ access_token: accessToken, token_type: "Bearer", expires_in: accessTokenLifetimeSeconds, scope: "" });
}