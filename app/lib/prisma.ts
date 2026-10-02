
import { Pool } from 'pg';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '@/generated/prisma/client';

const connectionString = process.env.DATABASE_URL  || process.env.POSTGRES_PRISMA_URL;

if (!connectionString) {
  throw new Error("A variável DATABASE_URL não foi encontrada pelo Next.js");
}

// 1. Lemos a URL e removemos forçadamente qualquer parâmetro de query
// Isso impede que comandos como "?sslmode=require" anulem nosso SSL
const url = new URL(connectionString);
url.search = ""; 

const pool = new Pool({
  connectionString: url.toString(), // Passamos a URL limpa
  ssl: {
    rejectUnauthorized: false,      // 2. Agora o SSL flexível será respeitado
  },
  max: 10,
});

const adapter = new PrismaPg(pool);

const globalForPrisma = globalThis as unknown as { prisma: PrismaClient };

export const prisma = globalForPrisma.prisma || new PrismaClient({ adapter });

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma;