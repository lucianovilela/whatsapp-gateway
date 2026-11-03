import { WebStandardStreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/webStandardStreamableHttp.js";

import { createMcpServer } from "@/app/lib/mcp-server";
import { prisma } from "@/app/lib/prisma";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function corsHeaders(request: Request) {
  const headers = new Headers({
    "Access-Control-Allow-Headers": "Authorization, Content-Type, Accept, Mcp-Session-Id, Last-Event-ID",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Expose-Headers": "Mcp-Session-Id, Last-Event-ID",
  });
  const allowedOrigin = process.env.MCP_ALLOWED_ORIGIN;
  if (allowedOrigin && request.headers.get("origin") === allowedOrigin) {
    headers.set("Access-Control-Allow-Origin", allowedOrigin);
    headers.set("Vary", "Origin");
  }
  return headers;
}

function jsonResponse(request: Request, body: unknown, status: number) {
  const headers = corsHeaders(request);
  headers.set("Content-Type", "application/json");
  return Response.json(body, { status, headers });
}

function authorizationState(request: Request) {
  const secret = process.env.MCP_API_KEY;
  if (!secret) return "missing" as const;
  return request.headers.get("authorization") === `Bearer ${secret}` ? "valid" as const : "invalid" as const;
}

function rejectUnauthorized(request: Request) {
  const state = authorizationState(request);
  if (state === "missing") return jsonResponse(request, { error: "MCP_API_KEY não configurada." }, 503);
  if (state === "invalid") return jsonResponse(request, { error: "Não autorizado." }, 401);
  return null;
}

export async function OPTIONS(request: Request) {
  return new Response(null, { status: 204, headers: corsHeaders(request) });
}

export async function GET(request: Request) {
  return rejectUnauthorized(request) ?? jsonResponse(request, { error: "Método não permitido." }, 405);
}

export async function DELETE(request: Request) {
  return rejectUnauthorized(request) ?? jsonResponse(request, { error: "Método não permitido." }, 405);
}

export async function POST(request: Request) {
  const rejected = rejectUnauthorized(request);
  if (rejected) return rejected;

  try {
    const server = createMcpServer(prisma);
    const transport = new WebStandardStreamableHTTPServerTransport({
      sessionIdGenerator: undefined,
      enableJsonResponse: true,
    });
    await server.connect(transport);
    const result = await transport.handleRequest(request);
    const headers = new Headers(result.headers);
    corsHeaders(request).forEach((value, key) => headers.set(key, value));
    return new Response(result.body, { status: result.status, headers });
  } catch (error) {
    console.error(`[mcp] ${error instanceof Error ? error.message : "erro desconhecido"}`);
    return jsonResponse(request, { error: "Erro interno do MCP." }, 500);
  }
}