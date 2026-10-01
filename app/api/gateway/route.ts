import type { NextRequest } from "next/server";

import { verifyGatewayAuthorization } from "@/app/lib/gateway-auth";
import { prisma } from "@/app/lib/prisma";

export async function GET(request: NextRequest) {
  const q = await prisma.request.findMany({
    where: {
      status: {
        equals: 0,
      },
    },
  });
  return Response.json(q);
}

export async function POST(request: NextRequest) {
  try {
    await verifyGatewayAuthorization(request.headers.get("authorization"));
  } catch {
    return Response.json({ error: "Não autorizado." }, { status: 401 });
  }

  const res = await request.json();
  const req = await prisma.request.create({
    data: {
      texto: JSON.stringify(res),
    },
  });

  return Response.json(req);
}
