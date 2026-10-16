import { jwtVerify, SignJWT } from "jose";

const algorithm = "HS256";
const issuer = "whatsapp-gateway";
const audience = "gateway:write";
const gatewaySubject = "gateway";
const userSubjectPattern = /^user:([1-9]\d*)$/;
const tokenLifetimeSeconds = 90 * 24 * 60 * 60;
const userTokenLifetimeSeconds = 24 * 60 * 60;
const encoder = new TextEncoder();

export const sessionCookieName = "session";

export type TokenClaims =
  | { kind: "gateway" }
  | { kind: "user"; userId: number; version: number };

export class GatewayAuthError extends Error {
  constructor() {
    super("Gateway authentication failed.");
    this.name = "GatewayAuthError";
  }
}

function getSigningKey() {
  const secret = process.env.JWS_SECRET;

  if (!secret) {
    throw new GatewayAuthError();
  }

  return encoder.encode(secret);
}

async function signToken(
  subject: string,
  lifetimeSeconds: number,
  claims: Record<string, number> = {},
) {
  const expiresAt = new Date(Date.now() + lifetimeSeconds * 1000);
  const token = await new SignJWT(claims)
    .setProtectedHeader({ alg: algorithm, typ: "JWT" })
    .setIssuer(issuer)
    .setAudience(audience)
    .setSubject(subject)
    .setIssuedAt()
    .setExpirationTime(Math.floor(expiresAt.getTime() / 1000))
    .sign(getSigningKey());

  return { token, expiresAt };
}

export async function issueGatewayToken() {
  return signToken(gatewaySubject, tokenLifetimeSeconds);
}

export async function issueUserToken(userId: number, tokenVersion: number) {
  return signToken(`user:${userId}`, userTokenLifetimeSeconds, { ver: tokenVersion });
}

export function getBearerToken(authorization: string | null) {
  return authorization?.match(/^Bearer (\S+)$/i)?.[1] ?? null;
}

// Valida apenas assinatura e claims; a versão do usuário é conferida no banco em session.ts.
export async function readTokenClaims(token: string | undefined | null): Promise<TokenClaims | null> {
  if (!token) {
    return null;
  }

  try {
    const { payload } = await jwtVerify(token, getSigningKey(), {
      algorithms: [algorithm],
      issuer,
      audience,
    });

    if (payload.sub === gatewaySubject) {
      return { kind: "gateway" };
    }

    const userId = Number(payload.sub?.match(userSubjectPattern)?.[1]);

    if (!Number.isSafeInteger(userId) || typeof payload.ver !== "number") {
      return null;
    }

    return { kind: "user", userId, version: payload.ver };
  } catch {
    return null;
  }
}