import { timingSafeEqual } from "node:crypto";

import { issueGatewayToken } from "@/app/lib/gateway-auth";

function isValidAdminSecret(providedSecret: string | null) {
  const configuredSecret = process.env.ADMIN_SECRET;

  if (!providedSecret || !configuredSecret) {
    return false;
  }

  const provided = Buffer.from(providedSecret);
  const configured = Buffer.from(configuredSecret);

  return (
    provided.length === configured.length && timingSafeEqual(provided, configured)
  );
}

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
