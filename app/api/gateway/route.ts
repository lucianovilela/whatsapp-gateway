import type { NextRequest } from "next/server";

import { prisma } from "@/app/lib/prisma";
import { isRequestAuthorized } from "@/app/lib/session";

export async function GET(request: NextRequest) {
  if (!(await isRequestAuthorized(request, { allowSession: true }))) {
    return Response.json({ error: "Não autorizado." }, { status: 401 });
  }

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
  if (!(await isRequestAuthorized(request))) {
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