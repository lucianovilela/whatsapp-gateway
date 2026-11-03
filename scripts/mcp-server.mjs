import "dotenv/config";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { createMcpServer } from "../app/lib/mcp-server.ts";
import { prisma } from "../app/lib/prisma.ts";

const server = createMcpServer(prisma);
const transport = new StdioServerTransport();
let shuttingDown = false;
async function shutdown(signal) {
  if (shuttingDown) return;
  shuttingDown = true;
  console.error(`[mcp] encerrando (${signal})`);
  await transport.close().catch(() => {});
  await prisma.$disconnect().catch(() => {});
}
process.once("SIGINT", () => void shutdown("SIGINT"));
process.once("SIGTERM", () => void shutdown("SIGTERM"));

await server.connect(transport);
console.error("[mcp] pronto");