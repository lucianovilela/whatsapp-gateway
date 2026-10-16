import { isValidAdminSecret } from "@/app/lib/admin-auth";
import { issueGatewayToken } from "@/app/lib/gateway-auth";

export async function POST(request: Request) {
  if (!isValidAdminSecret(request.headers.get("x-admin-secret"))) {
    return Response.json({ error: "Não autorizado." }, { status: 401 });
  }

  try {
    const { token, expiresAt } = await issueGatewayToken();

    return Response.json({ token, expiresAt: expiresAt.toISOString() });
  } catch {
    return Response.json({ error: "Não autorizado." }, { status: 401 });
  }
}