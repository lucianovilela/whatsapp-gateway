import { baseUrl } from "@/app/lib/oauth";

export const runtime = "nodejs";

export function GET(request: Request) {
  const origin = baseUrl(request);
  return Response.json({
    resource: `${origin}/api/mcp`,
    authorization_servers: [origin],
    bearer_methods_supported: ["header"],
  });
}