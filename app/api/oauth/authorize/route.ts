import { hashToken, isValidRedirectUri, randomToken, secretsMatch, authorizationCodeLifetimeSeconds } from "@/app/lib/oauth";
import { prisma } from "@/app/lib/prisma";

export const runtime = "nodejs";

function redirectError(uri: string, error: string, state: string | null) {
  const target = new URL(uri);
  target.searchParams.set("error", error);
  if (state) target.searchParams.set("state", state);
  return Response.redirect(target);
}

type AuthorizationParameters = {
  clientId: string | null;
  redirectUri: string | null;
  responseType: string | null;
  codeChallenge: string | null;
  codeChallengeMethod: string | null;
  state: string | null;
};

type ValidAuthorizationParameters = {
  clientId: string;
  redirectUri: string;
  responseType: "code";
  codeChallenge: string;
  codeChallengeMethod: "S256";
  state: string | null;
};

function authorizationParameters(source: URLSearchParams): AuthorizationParameters {
  return {
    clientId: source.get("client_id"),
    redirectUri: source.get("redirect_uri"),
    responseType: source.get("response_type"),
    codeChallenge: source.get("code_challenge"),
    codeChallengeMethod: source.get("code_challenge_method"),
    state: source.get("state"),
  };
}

function escapeHtml(value: string) {
  return value.replace(/[&<>'"]/g, (character) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    "'": "&#39;",
    '"': "&quot;",
  })[character] ?? character);
}

function consentPage(request: Request, parameters: AuthorizationParameters) {
  const fields = [
    ["client_id", parameters.clientId],
    ["redirect_uri", parameters.redirectUri],
    ["response_type", parameters.responseType],
    ["code_challenge", parameters.codeChallenge],
    ["code_challenge_method", parameters.codeChallengeMethod],
    ["state", parameters.state],
  ]
    .filter((field): field is [string, string] => field[1] !== null)
    .map(([name, value]) => `<input type="hidden" name="${name}" value="${escapeHtml(value)}">`)
    .join("");

  return new Response(`<!doctype html>
<html lang="en">
  <head><meta charset="utf-8"><title>OAuth authorization</title></head>
  <body>
    <h1>Authorize access</h1>
    <form method="post" action="${escapeHtml(new URL(request.url).pathname)}">
      ${fields}
      <label for="admin_secret">Admin secret</label>
      <input id="admin_secret" name="admin_secret" type="password" required>
      <button type="submit">Authorize</button>
    </form>
  </body>
</html>`, {
    headers: {
      "Content-Type": "text/html; charset=utf-8",
      "Content-Security-Policy": "default-src 'none'; form-action 'self'; base-uri 'none'",
      "Cache-Control": "no-store",
    },
  });
}

async function validateAuthorizationParameters(parameters: AuthorizationParameters) {
  const { clientId, redirectUri, responseType, codeChallenge, codeChallengeMethod } = parameters;

  if (!clientId || !redirectUri || !isValidRedirectUri(redirectUri)) {
    return { error: Response.json({ error: "invalid_request" }, { status: 400 }) };
  }
  let client;
  try {
    client = await prisma.oAuthClient.findUnique({ where: { clientId } });
  } catch {
    return { error: Response.json({ error: "temporarily_unavailable" }, { status: 503 }) };
  }
  if (!client || !client.redirectUris.includes(redirectUri)) {
    return { error: Response.json({ error: "invalid_request" }, { status: 400 }) };
  }
  if (responseType !== "code" || !client.responseTypes.includes("code") || !codeChallenge || codeChallengeMethod !== "S256") {
    return { error: redirectError(redirectUri, "invalid_request", parameters.state) };
  }

  return {
    client,
    parameters: {
      clientId,
      redirectUri,
      responseType: "code",
      codeChallenge,
      codeChallengeMethod: "S256",
      state: parameters.state,
    } satisfies ValidAuthorizationParameters,
  };
}

async function authorize(parameters: ValidAuthorizationParameters) {
  const { clientId, redirectUri, codeChallenge, codeChallengeMethod, state } = parameters;

  const code = randomToken();
  await prisma.oAuthAuthorizationCode.create({
    data: {
      clientId,
      redirectUri,
      codeChallenge,
      codeChallengeMethod,
      authorizationCodeHash: hashToken(code),
      expiresAt: new Date(Date.now() + authorizationCodeLifetimeSeconds * 1000),
    },
  });

  const target = new URL(redirectUri);
  target.searchParams.set("code", code);
  if (state) target.searchParams.set("state", state);
  return Response.redirect(target);
}

export async function GET(request: Request) {
  const parameters = authorizationParameters(new URL(request.url).searchParams);
  const validation = await validateAuthorizationParameters(parameters);
  if (validation.error) return validation.error;

  if (!secretsMatch(request.headers.get("x-admin-secret"), process.env.ADMIN_SECRET)) {
    return consentPage(request, parameters);
  }

  return authorize(validation.parameters);
}

export async function POST(request: Request) {
  if (!request.headers.get("content-type")?.startsWith("application/x-www-form-urlencoded")) {
    return Response.json({ error: "invalid_request" }, { status: 400 });
  }

  const form = await request.formData();
  const parameters = authorizationParameters(new URLSearchParams(
    [...form.entries()].filter((entry): entry is [string, string] => typeof entry[1] === "string"),
  ));
  const validation = await validateAuthorizationParameters(parameters);
  if (validation.error) return validation.error;

  const adminSecret = form.get("admin_secret");
  if (typeof adminSecret !== "string" || !secretsMatch(adminSecret, process.env.ADMIN_SECRET)) {
    return new Response("Unauthorized", {
      status: 401,
      headers: {
        "Content-Type": "text/html; charset=utf-8",
        "Content-Security-Policy": "default-src 'none'; base-uri 'none'",
        "Cache-Control": "no-store",
      },
    });
  }

  return authorize(validation.parameters);
}