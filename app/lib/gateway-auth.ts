import { jwtVerify, SignJWT } from "jose";

const algorithm = "HS256";
const issuer = "whatsapp-gateway";
const audience = "gateway:write";
const subject = "gateway";
const tokenLifetimeSeconds = 90 * 24 * 60 * 60;
const encoder = new TextEncoder();

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

export async function issueGatewayToken() {
  const expiresAt = new Date(Date.now() + tokenLifetimeSeconds * 1000);
  const token = await new SignJWT()
    .setProtectedHeader({ alg: algorithm, typ: "JWT" })
    .setIssuer(issuer)
    .setAudience(audience)
    .setSubject(subject)
    .setIssuedAt()
    .setExpirationTime(Math.floor(expiresAt.getTime() / 1000))
    .sign(getSigningKey());

  return { token, expiresAt };
}

export async function verifyGatewayAuthorization(authorization: string | null) {
  const match = authorization?.match(/^Bearer (\S+)$/i);

  if (!match) {
    throw new GatewayAuthError();
  }

  try {
    await jwtVerify(match[1], getSigningKey(), {
      algorithms: [algorithm],
      issuer,
      audience,
      subject,
    });
  } catch {
    throw new GatewayAuthError();
  }
}
