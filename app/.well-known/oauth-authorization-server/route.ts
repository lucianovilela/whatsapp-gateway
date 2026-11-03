import { baseUrl } from "@/app/lib/oauth";

export const runtime = "nodejs";

export function GET(request: Request) {
  const origin = baseUrl(request);
  return Response.json({
    issuer: origin,
    registration_endpoint: `${origin}/api/oauth/register`,
    authorization_endpoint: `${origin}/api/oauth/authorize`,
    token_endpoint: `${origin}/api/oauth/token`,
    response_types_supported: ["code"],
    grant_types_supported: ["authorization_code"],
    code_challenge_methods_supported: ["S256"],
    token_endpoint_auth_methods_supported: ["client_secret_basic", "client_secret_post"],
  });
}