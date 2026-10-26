
import { Pool } from 'pg';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '@/generated/prisma/client';

const connectionString = process.env.DATABASE_URL  || process.env.POSTGRES_PRISMA_URL;

if (!connectionString) {
  throw new Error("A variável DATABASE_URL não foi encontrada pelo Next.js");
}

// pg trata sslmode=require como verify-full; removemos a query e aplicamos SSL sem verificação só quando pedido.
const url = new URL(connectionString);
const sslmode = url.searchParams.get("sslmode");
const useSsl = !!sslmode && sslmode !== "disable";
url.search = "";

const pool = new Pool({
  connectionString: url.toString(),
  ssl: useSsl ? { rejectUnauthorized: false } : false,
  max: 10,
});

const adapter = new PrismaPg(pool);

const globalForPrisma = globalThis as unknown as { prisma: PrismaClient };

export const prisma = globalForPrisma.prisma || new PrismaClient({ adapter });

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma;