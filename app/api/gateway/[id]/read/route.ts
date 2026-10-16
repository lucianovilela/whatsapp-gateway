import { prisma } from "@/app/lib/prisma";
import { isRequestAuthorized } from "@/app/lib/session";

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(request: Request, { params }: RouteContext) {
  if (!(await isRequestAuthorized(request, { allowSession: true })))
    return Response.json({ error: "Não autorizado." }, { status: 401 });
  const { id } = await params;
  if (!/^[1-9]\d*$/.test(id))
    return Response.json({ error: "ID inválido." }, { status: 400 });
  const requestId = Number(id);
  if (!Number.isSafeInteger(requestId))
    return Response.json({ error: "ID inválido." }, { status: 400 });
  const gatewayRequest = await prisma.request.findUnique({
    where: { id: requestId },
    select: { texto: true },
  });
  if (!gatewayRequest)
    return Response.json(
      { error: "Requisição não encontrada." },
      { status: 404 },
    );

  return Response.json(JSON.parse(gatewayRequest.texto));
}

export async function PATCH(request: Request, { params }: RouteContext) {
  if (!(await isRequestAuthorized(request, { allowSession: true })))
    return Response.json({ error: "Não autorizado." }, { status: 401 });
  const { id } = await params;
  if (!/^[1-9]\d*$/.test(id))
    return Response.json({ error: "ID inválido." }, { status: 400 });
  const requestId = Number(id);
  if (!Number.isSafeInteger(requestId))
    return Response.json({ error: "ID inválido." }, { status: 400 });
  const gatewayRequest = await prisma.request.findUnique({ where: { id: requestId } });
  if (!gatewayRequest)
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