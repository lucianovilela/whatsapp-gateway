import { randomToken, secretsMatch, isValidRedirectUri, hashToken } from "@/app/lib/oauth";
import { prisma } from "@/app/lib/prisma";

export const runtime = "nodejs";

function badRequest(message: string) {
  return Response.json({ error: "invalid_request", error_description: message }, { status: 400 });
}

export async function POST(request: Request) {
  if (!secretsMatch(request.headers.get("x-admin-secret"), process.env.ADMIN_SECRET)) {
    return Response.json({ error: "unauthorized" }, { status: 401 });
  }

  let body: Record<string, unknown>;
  try {
    body = await request.json() as Record<string, unknown>;
  } catch {
    return badRequest("JSON inválido.");
  }

  const clientName = typeof body.client_name === "string" ? body.client_name.trim() : "";
  const redirectUris = Array.isArray(body.redirect_uris) && body.redirect_uris.every((value) => typeof value === "string")
    ? body.redirect_uris.map((value) => value.trim())
    : [];
  const grantTypes = Array.isArray(body.grant_types) && body.grant_types.every((value) => typeof value === "string")
    ? body.grant_types
    : ["authorization_code"];
  const responseTypes = Array.isArray(body.response_types) && body.response_types.every((value) => typeof value === "string")
    ? body.response_types
    : ["code"];
  const tokenEndpointAuthMethod = typeof body.token_endpoint_auth_method === "string"
    ? body.token_endpoint_auth_method
    : "client_secret_basic";

  if (!clientName || redirectUris.length === 0 || redirectUris.some((uri) => !isValidRedirectUri(uri))) {
    return badRequest("client_name e redirect_uris HTTPS válidos são obrigatórios.");
  }
  if (grantTypes.length !== 1 || grantTypes[0] !== "authorization_code" || responseTypes.length !== 1 || responseTypes[0] !== "code") {
    return badRequest("Somente authorization_code e response_type code são suportados.");
  }
  if (!["client_secret_basic", "client_secret_post"].includes(tokenEndpointAuthMethod)) {
    return badRequest("token_endpoint_auth_method não suportado.");
  }

  const clientId = randomToken();
  const clientSecret = randomToken();
  try {
    await prisma.oAuthClient.create({
      data: {
        clientId,
        clientSecretHash: hashToken(clientSecret),
        clientName,
        redirectUris,
        grantTypes,
        responseTypes,
        tokenEndpointAuthMethod,
      },
    });
  } catch {
    return Response.json({ error: "temporarily_unavailable" }, { status: 503 });
  }

  return Response.json({
    client_id: clientId,
    client_secret: clientSecret,
    client_name: clientName,
    redirect_uris: redirectUris,
    grant_types: grantTypes,
    response_types: responseTypes,
    token_endpoint_auth_method: tokenEndpointAuthMethod,
  }, { status: 201 });
}