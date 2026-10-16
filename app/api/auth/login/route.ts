import type { NextRequest } from "next/server";

import { parseCredentials } from "@/app/lib/credentials";
import { issueUserToken } from "@/app/lib/gateway-auth";
import { verifyPassword } from "@/app/lib/password";
import { prisma } from "@/app/lib/prisma";

const invalidCredentials = () =>
  Response.json({ error: "Credenciais inválidas." }, { status: 401 });

export async function POST(request: NextRequest) {
  let body: unknown;

  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "JSON inválido." }, { status: 400 });
  }

  const credentials = parseCredentials(body);

  if (!credentials) {
    return invalidCredentials();
  }

  try {
    const user = await prisma.user.findUnique({
      where: { email: credentials.email },
      select: { id: true, passwordHash: true, tokenVersion: true },
    });

    const isValid = await verifyPassword(credentials.password, user?.passwordHash ?? null);

    if (!user || !isValid) {
      return invalidCredentials();
    }

    const { token, expiresAt } = await issueUserToken(user.id, user.tokenVersion);

    return Response.json({ token, expiresAt: expiresAt.toISOString() });
  } catch (error) {
    console.error("Falha no login.", error);
    return Response.json({ error: "Erro interno." }, { status: 500 });
  }
}