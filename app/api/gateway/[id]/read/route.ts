import { prisma } from "@/app/lib/prisma";

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(_request: Request, { params }: RouteContext) {
  const { id } = await params;
  if (!/^[1-9]\d*$/.test(id))
    return Response.json({ error: "ID inválido." }, { status: 400 });
  const requestId = Number(id);
  if (!Number.isSafeInteger(requestId))
    return Response.json({ error: "ID inválido." }, { status: 400 });
  const request = await prisma.request.findUnique({
    where: { id: requestId },
    select: { texto: true },
  });
  if (!request)
    return Response.json(
      { error: "Requisição não encontrada." },
      { status: 404 },
    );

  return Response.json(JSON.parse(request.texto));
}

export async function PATCH(_request: Request, { params }: RouteContext) {
  const { id } = await params;
  if (!/^[1-9]\d*$/.test(id))
    return Response.json({ error: "ID inválido." }, { status: 400 });
  const requestId = Number(id);
  if (!Number.isSafeInteger(requestId))
    return Response.json({ error: "ID inválido." }, { status: 400 });
  const request = await prisma.request.findUnique({ where: { id: requestId } });
  if (!request)
    return Response.json(
      { error: "Requisição não encontrada." },
      { status: 404 },
    );
  const updatedRequest = await prisma.request.update({
    where: { id: requestId },
    data: { status: 1 },
  });
  return Response.json(updatedRequest);
}
