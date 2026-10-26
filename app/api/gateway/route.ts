import type { NextRequest } from "next/server";

import { verifyGatewayAuthorization } from "@/app/lib/gateway-auth";
import { prisma } from "@/app/lib/prisma";
import { extractWaId } from "@/app/lib/whatsapp-payload";

const statusPendente = 0;
const statusLiberado = 5;

export async function GET(_request: NextRequest) {
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
  const waId = extractWaId(res);
  const liberado = waId
    ? await prisma.liberado.findUnique({ where: { waId } })
    : null;

  const req = await prisma.request.create({
    data: {
      texto: JSON.stringify(res),
      status: liberado ? statusLiberado : statusPendente,
    },
  });

  return Response.json(req);
}
