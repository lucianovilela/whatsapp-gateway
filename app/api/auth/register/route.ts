import type { NextRequest } from "next/server";

import { isValidAdminSecret } from "@/app/lib/admin-auth";
import { parseCredentials } from "@/app/lib/credentials";
import { hashPassword } from "@/app/lib/password";
import { prisma } from "@/app/lib/prisma";
import { Prisma } from "@/generated/prisma/client";

export async function POST(request: NextRequest) {
  if (!isValidAdminSecret(request.headers.get("x-admin-secret"))) {
    return Response.json({ error: "Não autorizado." }, { status: 401 });
  }

  let body: unknown;

  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "JSON inválido." }, { status: 400 });
  }

  const credentials = parseCredentials(body);

  if (!credentials) {
    return Response.json(
      { error: "Informe um e-mail válido e uma senha entre 8 e 128 caracteres." },
      { status: 400 },
    );
  }

  try {
    const user = await prisma.user.create({
      data: {
        email: credentials.email,
        passwordHash: await hashPassword(credentials.password),
      },
      select: { id: true, email: true, createdAt: true },
    });

    return Response.json(user, { status: 201 });
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
      return Response.json({ error: "E-mail já cadastrado." }, { status: 409 });
    }

    console.error("Falha ao registrar usuário.", error);
    return Response.json({ error: "Erro interno." }, { status: 500 });
  }
}