import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";

import type { PrismaClient } from "@/generated/prisma/client";
import { extractText, extractWaId } from "@/app/lib/whatsapp-payload";
import { sendSerproText } from "@/app/lib/serpro-messages";

class BusinessError extends Error {
  constructor(message: string, public readonly code = "BUSINESS_ERROR") {
    super(message);
  }
}

const jsonResult = (value: unknown, isError = false) => ({
  isError,
  content: [{ type: "text" as const, text: JSON.stringify(value) }],
});

const handle = <T>(operation: (args: T) => Promise<unknown>) => async (args: T) => {
  try {
    return jsonResult(await operation(args));
  } catch (error) {
    console.error(`[mcp] ${error instanceof Error ? error.message : "erro desconhecido"}`);
    return jsonResult({
      error: {
        code: error instanceof BusinessError ? error.code : "INTERNAL_ERROR",
        message: error instanceof Error ? error.message : "Erro interno.",
      },
    }, true);
  }
};

function parseRequest(request: { texto: string }) {
  try {
    return JSON.parse(request.texto) as unknown;
  } catch {
    return null;
  }
}

export function createMcpServer(prisma: PrismaClient) {
  const server = new McpServer({ name: "whatsapp-gateway", version: "1.0.0" });

  async function getRequest(requestId: number) {
    const request = await prisma.request.findUnique({
      where: { id: requestId },
      include: { atendimento: true },
    });
    if (!request) throw new BusinessError("Request não encontrada.", "NOT_FOUND");
    return request;
  }

  server.registerTool("contar_mensagens", {
    description: "Retorna a quantidade de mensagens Request e as contagens por status.",
    inputSchema: {},
  }, handle(async () => {
    const [total, grouped, atendimentos] = await Promise.all([
      prisma.request.count(),
      prisma.request.groupBy({ by: ["status"], _count: { _all: true } }),
      prisma.atendimento.groupBy({ by: ["status"], _count: { _all: true } }),
    ]);
    return {
      total,
      porStatus: Object.fromEntries(grouped.map((item) => [String(item.status), item._count._all])),
      porStatusAtendimento: Object.fromEntries(atendimentos.map((item) => [item.status, item._count._all])),
    };
  }));

  server.registerTool("listar_mensagens_nao_atendidas", {
    description: "Lista mensagens pendentes sem atendimento humano.",
    inputSchema: {
      limit: z.number().int().min(1).max(100).default(20),
      offset: z.number().int().min(0).max(100000).default(0),
    },
  }, handle(async ({ limit, offset }) => {
    const requests = await prisma.request.findMany({
      where: { status: 0, atendimento: null },
      orderBy: [{ dataInclusao: "asc" }, { id: "asc" }],
      skip: offset,
      take: limit,
    });
    return requests.map((request) => {
      const payload = parseRequest(request);
      return {
        requestId: request.id,
        status: request.status,
        dataInclusao: request.dataInclusao,
        waId: extractWaId(payload),
        texto: extractText(payload),
      };
    });
  }));

  server.registerTool("iniciar_atendimento", {
    description: "Inicia atomicamente um atendimento para uma mensagem.",
    inputSchema: { requestId: z.number().int().positive(), atendente: z.string().trim().min(1).max(160).optional() },
  }, handle(async ({ requestId, atendente }) => {
    const result = await prisma.$transaction(async (tx) => {
      const request = await tx.request.findUnique({ where: { id: requestId } });
      if (!request) throw new BusinessError("Request não encontrada.", "NOT_FOUND");
      if (request.status !== 0) {
        throw new BusinessError(`Request não está pendente (status atual: ${request.status}).`, "REQUEST_NOT_PENDING");
      }
      let atendimento;
      try {
        atendimento = await tx.atendimento.create({
          data: {
            requestId,
            status: "EM_ATENDIMENTO",
            atendente,
            iniciadoEm: new Date(),
            mensagens: { create: { direcao: "RECEBIDA", texto: request.texto } },
          },
        });
      } catch (error) {
        if (error instanceof Error && "code" in error && error.code === "P2002") {
          throw new BusinessError("Request já possui atendimento.", "ALREADY_ATTENDED");
        }
        throw error;
      }
      await tx.request.updateMany({ where: { id: requestId, status: 0 }, data: { status: 1 } });
      return atendimento;
    });
    return { requestId, atendimentoId: result.id, status: result.status, atendente: result.atendente };
  }));

  server.registerTool("marcar_mensagem_lida", {
    description: "Marca uma mensagem Request como lida, usando status técnico 1.",
    inputSchema: { requestId: z.number().int().positive() },
  }, handle(async ({ requestId }) => {
    await getRequest(requestId);
    const updated = await prisma.request.updateMany({ where: { id: requestId }, data: { status: 1 } });
    return { requestId, status: 1, atualizada: updated.count === 1 };
  }));

  server.registerTool("responder_mensagem", {
    description: "Envia texto ao destinatário e registra a mensagem ENVIADA.",
    inputSchema: {
      requestId: z.number().int().positive(),
      texto: z.string().trim().min(1).max(4096),
      atendente: z.string().trim().min(1).max(160).optional(),
    },
  }, handle(async ({ requestId, texto, atendente }) => {
    const request = await getRequest(requestId);
    if (!request.atendimento || request.atendimento.status !== "EM_ATENDIMENTO") {
      throw new BusinessError("Inicie o atendimento antes de responder.", "ATTENDANCE_NOT_ACTIVE");
    }
    const waId = extractWaId(parseRequest(request));
    if (!waId) throw new BusinessError("Request não contém destinatário wa_id válido.", "INVALID_RECIPIENT");
    const upstreamResponse = await sendSerproText(waId, texto);
    const { message, atendimento } = await prisma.$transaction(async (tx) => {
      const active = await tx.atendimento.findUnique({ where: { id: request.atendimento!.id } });
      if (!active || active.status !== "EM_ATENDIMENTO") {
        throw new BusinessError("Atendimento não está em atendimento.", "ATTENDANCE_NOT_ACTIVE");
      }
      const message = await tx.atendimentoMensagem.create({
        data: { atendimentoId: active.id, direcao: "ENVIADA", texto },
      });
      const atendimento = atendente && atendente !== active.atendente
        ? await tx.atendimento.update({ where: { id: active.id }, data: { atendente } })
        : active;
      return { message, atendimento };
    });
    return { requestId, atendimentoId: atendimento.id, mensagemId: message.id, waId, upstreamResponse };
  }));

  server.registerTool("finalizar_atendimento", {
    description: "Finaliza um atendimento e registra motivo opcional.",
    inputSchema: { requestId: z.number().int().positive(), motivo: z.string().trim().max(500).optional() },
  }, handle(async ({ requestId, motivo }) => {
    await getRequest(requestId);
    const updated = await prisma.atendimento.updateMany({
      where: { requestId, status: "EM_ATENDIMENTO" },
      data: { status: "FINALIZADO", finalizadoEm: new Date(), motivo: motivo || null },
    });
    if (updated.count !== 1) throw new BusinessError("Atendimento não está em atendimento.", "ATTENDANCE_NOT_ACTIVE");
    const atendimento = await prisma.atendimento.findUnique({ where: { requestId } });
    if (!atendimento) throw new BusinessError("Atendimento não encontrado.", "NOT_FOUND");
    return { requestId, atendimentoId: atendimento.id, status: atendimento.status, finalizadoEm: atendimento.finalizadoEm, motivo: atendimento.motivo };
  }));

  return server;
}