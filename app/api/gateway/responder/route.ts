import { timingSafeEqual } from "node:crypto";

import { prisma } from "@/app/lib/prisma";
import { sendSerproTemplate } from "@/app/lib/serpro-messages";
import { extractWaId } from "@/app/lib/whatsapp-payload";

const statusPendente = 0;
const statusProcessando = 2;
const statusRespondido = 3;
const statusPayloadInvalido = 4;

function isValidCronSecret(authorization: string | null) {
  const configuredSecret = process.env.CRON_SECRET;
  const providedSecret = authorization?.match(/^Bearer (\S+)$/i)?.[1];

  if (!providedSecret || !configuredSecret) {
    return false;
  }

  const provided = Buffer.from(providedSecret);
  const configured = Buffer.from(configuredSecret);

  return (
    provided.length === configured.length && timingSafeEqual(provided, configured)
  );
}

function parseTexto(texto: string): unknown {
  try {
    return JSON.parse(texto);
  } catch {
    return null;
  }
}

export async function GET(request: Request) {
  if (!isValidCronSecret(request.headers.get("authorization"))) {
    return Response.json({ error: "Não autorizado." }, { status: 401 });
  }

  const pendentes = await prisma.request.findMany({
    where: { status: statusPendente },
    orderBy: { dataInclusao: "asc" },
    select: { id: true, texto: true },
  });

  let enviados = 0;
  let falhas = 0;

  for (const pendente of pendentes) {
    // Claim the row so an overlapping run won't send it twice.
    const { count } = await prisma.request.updateMany({
      where: { id: pendente.id, status: statusPendente },
      data: { status: statusProcessando },
    });
    if (count === 0) continue;

    const waId = extractWaId(parseTexto(pendente.texto));
    if (!waId) {
      await prisma.request.update({
        where: { id: pendente.id },
        data: { status: statusPayloadInvalido },
      });
      falhas++;
      continue;
    }

    try {
      await sendSerproTemplate(waId);
      await prisma.request.update({
        where: { id: pendente.id },
        data: { status: statusRespondido },
      });
      enviados++;
    } catch {
      await prisma.request.update({
        where: { id: pendente.id },
        data: { status: statusPendente },
      });
      falhas++;
    }
  }

  return Response.json({ processados: pendentes.length, enviados, falhas });
}
